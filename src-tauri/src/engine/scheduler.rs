// Scheduler — Phase 3 implementation
// compute_next_fire_time() + resolve_local_to_utc() for all 5 RepeatType variants

use chrono::{
    DateTime, Datelike, Duration, LocalResult, NaiveDate, NaiveDateTime, NaiveTime, TimeZone, Utc,
};
use chrono_tz::Tz;
use croner::Cron;

use crate::storage::models::{RepeatPattern, RepeatType};

/// Maximum minutes to advance when resolving a DST spring-forward gap.
const MAX_DST_ADVANCE_MINUTES: u32 = 120;

// ── AlarmContext ──

/// Shared context for all next-fire-time computations.
pub struct AlarmContext {
    pub now: DateTime<Utc>,
    pub now_local: DateTime<Tz>,
    pub timezone: Tz,
}

impl AlarmContext {
    pub fn new(timezone: &Tz, now: DateTime<Utc>) -> Self {
        Self {
            now,
            now_local: now.with_timezone(timezone),
            timezone: *timezone,
        }
    }

    pub fn today(&self) -> NaiveDate {
        self.now_local.date_naive()
    }
}

// ── Entry Point ──

/// Compute the next fire time for an alarm based on its repeat pattern.
/// Returns UTC DateTime, or None if the alarm should be disabled.
pub fn compute_next_fire_time(
    alarm_time: NaiveTime,
    alarm_date: Option<NaiveDate>,
    repeat: &RepeatPattern,
    ctx: &AlarmContext,
) -> Option<DateTime<Utc>> {
    tracing::debug!(
        alarm_time = %alarm_time,
        repeat_type = ?repeat.r#type,
        "compute_next_fire_time"
    );
    match repeat.r#type {
        RepeatType::Once => compute_once(alarm_time, alarm_date, ctx),
        RepeatType::Daily => compute_daily(alarm_time, ctx),
        RepeatType::Weekly => compute_weekly(alarm_time, repeat, ctx),
        RepeatType::Interval => compute_interval(repeat, ctx),
        RepeatType::Cron => compute_cron(&repeat.cron_expression, ctx),
    }
}

// ── RepeatType::Once ──

fn compute_once(
    alarm_time: NaiveTime,
    alarm_date: Option<NaiveDate>,
    ctx: &AlarmContext,
) -> Option<DateTime<Utc>> {
    let target_date = alarm_date.unwrap_or_else(|| {
        if alarm_time > ctx.now_local.time() {
            ctx.today()
        } else {
            ctx.today() + Duration::days(1)
        }
    });
    resolve_local_to_utc(target_date, alarm_time, &ctx.timezone)
}

// ── RepeatType::Daily ──

fn compute_daily(alarm_time: NaiveTime, ctx: &AlarmContext) -> Option<DateTime<Utc>> {
    let candidate = resolve_local_to_utc(ctx.today(), alarm_time, &ctx.timezone);
    match candidate {
        Some(t) if t > ctx.now => Some(t),
        _ => resolve_local_to_utc(ctx.today() + Duration::days(1), alarm_time, &ctx.timezone),
    }
}

// ── RepeatType::Weekly ──

fn compute_weekly(
    alarm_time: NaiveTime,
    repeat: &RepeatPattern,
    ctx: &AlarmContext,
) -> Option<DateTime<Utc>> {
    for offset in 0..=7 {
        let date = ctx.today() + Duration::days(offset);
        let weekday_num = date.weekday().num_days_from_sunday();
        if !repeat.days_of_week.contains(&(weekday_num as u8)) {
            continue;
        }
        let resolved = resolve_local_to_utc(date, alarm_time, &ctx.timezone);
        if let Some(t) = resolved.filter(|t| *t > ctx.now) {
            return Some(t);
        }
    }
    None
}

// ── RepeatType::Interval ──

fn compute_interval(repeat: &RepeatPattern, ctx: &AlarmContext) -> Option<DateTime<Utc>> {
    Some(ctx.now + Duration::minutes(repeat.interval_minutes as i64))
}

// ── RepeatType::Cron ──

fn compute_cron(cron_expr: &str, ctx: &AlarmContext) -> Option<DateTime<Utc>> {
    if cron_expr.is_empty() {
        return None;
    }
    let cron = Cron::new(cron_expr).parse().ok()?;
    cron.find_next_occurrence(&ctx.now_local, false)
        .ok()
        .map(|dt: DateTime<Tz>| dt.with_timezone(&Utc))
}

// ── DST Resolution ──

/// Convert a local date+time to UTC, handling DST edge cases.
pub fn resolve_local_to_utc(date: NaiveDate, time: NaiveTime, tz: &Tz) -> Option<DateTime<Utc>> {
    let naive_dt = NaiveDateTime::new(date, time);
    match tz.from_local_datetime(&naive_dt) {
        LocalResult::Single(dt) => Some(dt.with_timezone(&Utc)),
        LocalResult::Ambiguous(first, _) => Some(handle_fall_back(first, date, time)),
        LocalResult::None => handle_spring_forward(date, time, tz),
    }
}

/// FALL-BACK: time occurs twice → use the FIRST occurrence
fn handle_fall_back(first: DateTime<Tz>, date: NaiveDate, time: NaiveTime) -> DateTime<Utc> {
    tracing::info!(date = %date, time = %time, "DST fall-back: using first occurrence");
    first.with_timezone(&Utc)
}

/// SPRING-FORWARD: time doesn't exist → advance minute-by-minute until valid
fn handle_spring_forward(
    date: NaiveDate,
    skipped_time: NaiveTime,
    tz: &Tz,
) -> Option<DateTime<Utc>> {
    let mut candidate = skipped_time;
    for _ in 0..MAX_DST_ADVANCE_MINUTES {
        candidate += Duration::minutes(1);
        let resolved = try_resolve_minute(date, candidate, tz);
        if let Some(utc) = resolved {
            tracing::warn!(
                date = %date,
                skipped = %skipped_time,
                resolved = %candidate,
                "DST spring-forward: advanced to next valid minute"
            );
            return Some(utc);
        }
    }
    tracing::error!(
        date = %date,
        "DST spring-forward: no valid time found within {MAX_DST_ADVANCE_MINUTES} minutes"
    );
    None
}

/// Try resolving a single local minute to UTC. Returns None if still in DST gap.
fn try_resolve_minute(date: NaiveDate, time: NaiveTime, tz: &Tz) -> Option<DateTime<Utc>> {
    let naive_dt = NaiveDateTime::new(date, time);
    match tz.from_local_datetime(&naive_dt) {
        LocalResult::Single(dt) => Some(dt.with_timezone(&Utc)),
        LocalResult::Ambiguous(dt, _) => Some(dt.with_timezone(&Utc)),
        LocalResult::None => None,
    }
}

// ── Timezone Change Handler ──

/// Recompute all NextFireTime values when the system timezone changes.
/// Called from alarm_engine on timezone change detection.
pub fn recompute_all_fire_times(conn: &rusqlite::Connection, new_tz: &Tz) {
    tracing::info!(timezone = %new_tz, "Timezone changed — recomputing all NextFireTime");

    let ctx = AlarmContext::new(new_tz, Utc::now());

    let mut stmt =
        match conn.prepare("SELECT * FROM Alarms WHERE IsEnabled = 1 AND DeletedAt IS NULL") {
            Ok(s) => s,
            Err(e) => {
                tracing::error!(error = %e, "Failed to query alarms for tz recompute");
                return;
            }
        };

    let alarms: Vec<_> = stmt
        .query_map([], |row| crate::storage::models::AlarmRow::from_row(row))
        .unwrap_or_else(|_| panic!("query_map failed"))
        .filter_map(|r| r.ok())
        .collect();

    for alarm in &alarms {
        let time = NaiveTime::parse_from_str(&alarm.time, "%H:%M").ok();
        let date = alarm
            .date
            .as_ref()
            .and_then(|d| NaiveDate::parse_from_str(d, "%Y-%m-%d").ok());
        let repeat = alarm.repeat_pattern();

        if let Some(alarm_time) = time {
            let new_next = compute_next_fire_time(alarm_time, date, &repeat, &ctx);
            let next_str = new_next.map(|t| t.to_rfc3339());

            let _ = conn.execute(
                "UPDATE Alarms SET NextFireTime = ?1, UpdatedAt = ?2 WHERE AlarmId = ?3",
                rusqlite::params![next_str, Utc::now().to_rfc3339(), alarm.alarm_id],
            );
        }
    }

    tracing::info!(
        count = alarms.len(),
        "Recalculated all alarm times for new timezone"
    );
}
