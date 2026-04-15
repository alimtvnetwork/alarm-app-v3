/**
 * AlarmOverlay — Full-screen overlay when an alarm fires.
 */

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Bell, Moon, X, Volume, Volume1, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOverlayStore } from "@/stores/overlay-store";
import { ChallengeType, ChallengeDifficulty } from "@/types/alarm";
import { suggestDifficulty } from "@/lib/adaptive-challenge";
import MathChallenge from "./MathChallenge";
import TypingChallenge from "./TypingChallenge";
import { playAlarmSound } from "@/lib/alarm-audio";

const AlarmOverlay = () => {
  const isVisible = useOverlayStore((s) => s.isVisible);
  const alarm = useOverlayStore((s) => s.firingAlarm);
  const snoozeState = useOverlayStore((s) => s.snoozeState);
  const snooze = useOverlayStore((s) => s.snooze);
  const dismiss = useOverlayStore((s) => s.dismiss);
  const { t } = useTranslation();

  const [showChallenge, setShowChallenge] = useState(false);
  const [autoDismissRemaining, setAutoDismissRemaining] = useState<number | null>(null);
  const [volumePercent, setVolumePercent] = useState(0);
  const audioRef = useRef<{ stop: () => void } | null>(null);

  // Start/stop alarm sound with overlay visibility
  useEffect(() => {
    if (isVisible && alarm) {
      audioRef.current = playAlarmSound(
        alarm.SoundFile,
        alarm.IsGradualVolume,
        alarm.GradualVolumeDurationSec || 30,
      );
    }

    return () => {
      audioRef.current?.stop();
      audioRef.current = null;
    };
  }, [isVisible, alarm]);

  useEffect(() => {
    if (!isVisible || !alarm || alarm.AutoDismissMin <= 0) {
      setAutoDismissRemaining(null);
      return;
    }
    let remaining = alarm.AutoDismissMin * 60;
    setAutoDismissRemaining(remaining);

    const id = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(id);
        dismiss();
      } else {
        setAutoDismissRemaining(remaining);
      }
    }, 1000);

    return () => clearInterval(id);
  }, [isVisible, alarm, dismiss]);

  useEffect(() => {
    if (isVisible) setShowChallenge(false);
    if (!isVisible) { setVolumePercent(0); return; }
    if (!alarm?.IsGradualVolume) { setVolumePercent(100); return; }

    const dur = alarm.GradualVolumeDurationSec || 30;
    const start = Date.now();
    const tick = () => {
      const elapsed = (Date.now() - start) / 1000;
      const pct = Math.min(100, Math.round((elapsed / dur) * 100));
      setVolumePercent(pct);
      if (pct < 100) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [isVisible, alarm]);

  const canSnooze = (() => {
    if (!alarm) return false;
    if (alarm.MaxSnoozeCount === 0) return false;
    if (snoozeState && snoozeState.SnoozeCount >= alarm.MaxSnoozeCount) return false;
    return true;
  })();

  const snoozeRemaining = alarm
    ? alarm.MaxSnoozeCount - (snoozeState?.SnoozeCount ?? 0)
    : 0;

  const handleDismissClick = useCallback(() => {
    dismiss();
  }, [dismiss]);

  const handleChallengeSolved = useCallback(
    (solveTimeSec: number) => {
      dismiss(solveTimeSec);
    },
    [dismiss]
  );

  const formatCountdown = (secs: number): string => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  // Focus trap: trap focus within overlay when visible
  const overlayRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isVisible) return;
    // Announce to screen readers
    const announcer = document.getElementById("a11y-announcer");
    if (announcer) {
      announcer.textContent = `Alarm firing: ${alarm?.Label || alarm?.Time || "Alarm"}`;
    }
    // Focus the overlay
    overlayRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusable = overlayRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isVisible, alarm]);

  if (!isVisible || !alarm) return null;

  return (
    <div
      ref={overlayRef}
      role="alertdialog"
      aria-modal="true"
      aria-label={`Alarm: ${alarm.Label || alarm.Time}`}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center outline-none"
      style={{ background: "hsl(20 14% 8%)" }}
    >
      {/* Card container */}
      <div
        className="relative flex flex-col items-center justify-center w-[340px] h-[500px] rounded-3xl border shadow-2xl"
        style={{
          background: "hsl(20 12% 14% / 0.85)",
          borderColor: "hsl(30 15% 30% / 0.3)",
        }}
      >
        {autoDismissRemaining !== null && (
          <p className="absolute top-5 text-xs font-body" style={{ color: "hsl(30 20% 65%)" }}>
            {t("overlay.autoDismissIn", { time: formatCountdown(autoDismissRemaining) })}
          </p>
        )}

        {/* Concentric ripple rings + bell */}
        <div className="relative flex items-center justify-center mb-6">
          <div className="absolute w-64 h-64 rounded-full animate-ripple-1" style={{ border: "1px solid hsl(30 15% 40% / 0.15)" }} />
          <div className="absolute w-48 h-48 rounded-full animate-ripple-2" style={{ border: "1px solid hsl(30 15% 40% / 0.25)" }} />
          <div className="absolute w-32 h-32 rounded-full animate-ripple-3" style={{ border: "1px solid hsl(30 15% 40% / 0.35)" }} />
          <div className="animate-pulse-glow">
            <Bell className="h-12 w-12" style={{ color: "hsl(30 25% 55%)" }} />
          </div>
        </div>

        {alarm.IsGradualVolume && (
          <div className="mb-3 flex items-center gap-2 text-xs font-body" style={{ color: "hsl(30 15% 55%)" }}>
            {volumePercent < 33 ? <Volume className="h-4 w-4" /> : volumePercent < 66 ? <Volume1 className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            <div className="w-20 h-1 rounded-full overflow-hidden" style={{ background: "hsl(20 10% 25%)" }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${volumePercent}%`, background: "hsl(30 25% 55%)" }} />
            </div>
            <span>{volumePercent}%</span>
          </div>
        )}

        {/* Time */}
        <h1 className="text-6xl font-heading font-bold tracking-tight" style={{ color: "hsl(30 20% 88%)" }}>
          {alarm.Time}
        </h1>

        {/* Label */}
        {alarm.Label && (
          <p className="mt-2 text-lg font-body" style={{ color: "hsl(30 18% 60%)" }}>{alarm.Label}</p>
        )}

        {/* Buttons or Challenge */}
        {showChallenge ? (
          <div className="mt-8 w-full flex justify-center px-4">
            {alarm.ChallengeType === ChallengeType.Typing ? (
              <TypingChallenge onSolved={handleChallengeSolved} />
            ) : (
              <MathChallenge
                difficulty={suggestDifficulty(alarm.ChallengeDifficulty ?? ChallengeDifficulty.Easy)}
                onSolved={handleChallengeSolved}
              />
            )}
          </div>
        ) : (
          <div className="mt-10 flex gap-3 w-full max-w-[300px] px-4">
            {canSnooze && (
              <button
                onClick={snooze}
                className="flex-1 flex items-center justify-center gap-2 h-14 rounded-2xl font-body text-sm font-medium transition-colors"
                style={{
                  background: "hsl(35 25% 65% / 0.2)",
                  border: "1px solid hsl(35 25% 55% / 0.3)",
                  color: "hsl(35 30% 75%)",
                }}
              >
                <Moon className="h-4 w-4" />
                {t("overlay.snooze", { min: alarm.SnoozeDurationMin })}
              </button>
            )}
            <button
              onClick={handleDismissClick}
              className="flex-1 flex items-center justify-center gap-2 h-14 rounded-2xl font-body text-sm font-medium transition-colors"
              style={{
                background: "hsl(33 30% 45%)",
                color: "hsl(30 20% 92%)",
              }}
            >
              <X className="h-4 w-4" />
              {t("overlay.dismiss")}
            </button>
          </div>
        )}

        {/* Snooze count */}
        {snoozeState && snoozeState.SnoozeCount > 0 && (
          <p className="mt-4 text-xs font-body" style={{ color: "hsl(30 15% 50% / 0.6)" }}>
            {t("overlay.snoozedCount", {
              current: snoozeState.SnoozeCount,
              max: alarm.MaxSnoozeCount,
              remaining: snoozeRemaining,
            })}
          </p>
        )}
      </div>
    </div>
  );
};

export default AlarmOverlay;
