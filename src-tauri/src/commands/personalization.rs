// Personalization commands — Phase 9 implementation
// Quotes, streak tracker

use rusqlite::params;
use serde::Deserialize;
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;
use uuid::Uuid;

use crate::errors::AlarmAppError;
use crate::storage::models::{Quote, StreakData};

type DbPool = Arc<Mutex<rusqlite::Connection>>;

// ── Quotes ──

/// Get a random quote (favored first, then random).
#[tauri::command]
pub async fn get_daily_quote(
    pool: State<'_, DbPool>,
) -> Result<Quote, AlarmAppError> {
    let conn = pool.lock().await;

    // Try a favorite first
    let fav = conn.query_row(
        "SELECT * FROM Quotes WHERE IsFavorite = 1 ORDER BY RANDOM() LIMIT 1",
        [],
        Quote::from_row,
    );

    if let Ok(q) = fav {
        return Ok(q);
    }

    // Fall back to any quote
    conn.query_row(
        "SELECT * FROM Quotes ORDER BY RANDOM() LIMIT 1",
        [],
        Quote::from_row,
    )
    .map_err(|_| AlarmAppError::Validation("No quotes available — add some first".into()))
}

/// List all quotes.
#[tauri::command]
pub async fn list_quotes(
    pool: State<'_, DbPool>,
) -> Result<Vec<Quote>, AlarmAppError> {
    let conn = pool.lock().await;
    let mut stmt = conn.prepare("SELECT * FROM Quotes ORDER BY CreatedAt DESC")?;
    let quotes = stmt
        .query_map([], Quote::from_row)?
        .filter_map(|r| r.ok())
        .collect();
    Ok(quotes)
}

#[derive(Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct CreateQuotePayload {
    pub text: String,
    pub author: Option<String>,
}

/// Add a custom quote.
#[tauri::command]
pub async fn create_quote(
    pool: State<'_, DbPool>,
    payload: CreateQuotePayload,
) -> Result<Quote, AlarmAppError> {
    if payload.text.is_empty() || payload.text.len() > 500 {
        return Err(AlarmAppError::Validation(
            "Quote must be 1-500 characters".into(),
        ));
    }

    let conn = pool.lock().await;
    let quote_id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let author = payload.author.unwrap_or_default();

    conn.execute(
        "INSERT INTO Quotes (QuoteId, Text, Author, IsFavorite, IsCustom, CreatedAt) VALUES (?1, ?2, ?3, 0, 1, ?4)",
        params![quote_id, payload.text, author, now],
    )?;

    let quote = conn.query_row(
        "SELECT * FROM Quotes WHERE QuoteId = ?1",
        params![quote_id],
        Quote::from_row,
    )?;

    tracing::info!(quote_id = %quote_id, "Custom quote created");
    Ok(quote)
}

/// Toggle favorite on a quote.
#[tauri::command]
pub async fn toggle_quote_favorite(
    pool: State<'_, DbPool>,
    quote_id: String,
) -> Result<Quote, AlarmAppError> {
    let conn = pool.lock().await;

    let current: i32 = conn
        .query_row(
            "SELECT IsFavorite FROM Quotes WHERE QuoteId = ?1",
            params![quote_id],
            |row| row.get(0),
        )
        .map_err(|_| AlarmAppError::Validation("Quote not found".into()))?;

    let new_state = if current != 0 { 0 } else { 1 };
    conn.execute(
        "UPDATE Quotes SET IsFavorite = ?1 WHERE QuoteId = ?2",
        params![new_state, quote_id],
    )?;

    let quote = conn.query_row(
        "SELECT * FROM Quotes WHERE QuoteId = ?1",
        params![quote_id],
        Quote::from_row,
    )?;

    Ok(quote)
}

/// Delete a custom quote.
#[tauri::command]
pub async fn delete_quote(
    pool: State<'_, DbPool>,
    quote_id: String,
) -> Result<(), AlarmAppError> {
    let conn = pool.lock().await;
    let rows = conn.execute(
        "DELETE FROM Quotes WHERE QuoteId = ?1 AND IsCustom = 1",
        params![quote_id],
    )?;
    if rows == 0 {
        return Err(AlarmAppError::Validation(
            "Quote not found or is a built-in quote".into(),
        ));
    }
    tracing::info!(quote_id = %quote_id, "Quote deleted");
    Ok(())
}

// ── Streak Tracker ──

/// Get the user's on-time dismissal streak.
#[tauri::command]
pub async fn get_streak(
    pool: State<'_, DbPool>,
) -> Result<StreakData, AlarmAppError> {
    let conn = pool.lock().await;

    // Get dismissed events from the last 90 days, grouped by date
    let mut stmt = conn.prepare(
        "SELECT DATE(FiredAt) as day, COUNT(*) as cnt \
         FROM AlarmEvents \
         WHERE Type = 'Dismissed' AND FiredAt >= DATE('now', '-90 days') \
         GROUP BY day ORDER BY day DESC"
    )?;

    let days: Vec<String> = stmt
        .query_map([], |row| row.get::<_, String>(0))?
        .filter_map(|r| r.ok())
        .collect();

    // Calculate current streak (consecutive days from today/yesterday)
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
    let mut current_streak: u32 = 0;
    let mut check_date = chrono::Local::now().date_naive();

    for _ in 0..90 {
        let date_str = check_date.format("%Y-%m-%d").to_string();
        if days.contains(&date_str) {
            current_streak += 1;
            check_date -= chrono::Duration::days(1);
        } else if date_str == today {
            // Today hasn't happened yet — skip
            check_date -= chrono::Duration::days(1);
        } else {
            break;
        }
    }

    // Longest streak
    let mut longest: u32 = 0;
    let mut run: u32 = 0;
    let mut prev_date: Option<chrono::NaiveDate> = None;

    for day_str in days.iter().rev() {
        if let Ok(d) = chrono::NaiveDate::parse_from_str(day_str, "%Y-%m-%d") {
            match prev_date {
                Some(prev) if d - prev == chrono::Duration::days(1) => {
                    run += 1;
                }
                _ => {
                    run = 1;
                }
            }
            if run > longest {
                longest = run;
            }
            prev_date = Some(d);
        }
    }

    Ok(StreakData {
        current_streak,
        longest_streak: longest,
        calendar_days: days,
    })
}
