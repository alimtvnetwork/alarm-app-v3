/**
 * Adaptive Challenge — Suggests difficulty based on historical solve times.
 * If avg solve time < 5s → suggest harder. If > 15s → suggest easier.
 */

import { ChallengeDifficulty, AlarmEventType } from "@/types/alarm";
import * as ipc from "@/lib/ipc-adapter";

const FAST_THRESHOLD_SEC = 5;
const SLOW_THRESHOLD_SEC = 15;
const MIN_SAMPLES = 3;

export async function suggestDifficulty(
  currentDifficulty: ChallengeDifficulty
): Promise<ChallengeDifficulty> {
  const events = await ipc.listAlarmEvents();
  const challengeEvents = events.filter(
    (e) =>
      e.Type === AlarmEventType.Dismissed &&
      e.ChallengeSolveTimeSec !== null &&
      e.ChallengeSolveTimeSec > 0
  );

  if (challengeEvents.length < MIN_SAMPLES) return currentDifficulty;

  const recent = challengeEvents.slice(-10);
  const avgTime =
    recent.reduce((sum, e) => sum + (e.ChallengeSolveTimeSec ?? 0), 0) /
    recent.length;

  if (avgTime < FAST_THRESHOLD_SEC) {
    if (currentDifficulty === ChallengeDifficulty.Easy)
      return ChallengeDifficulty.Medium;
    if (currentDifficulty === ChallengeDifficulty.Medium)
      return ChallengeDifficulty.Hard;
  }

  if (avgTime > SLOW_THRESHOLD_SEC) {
    if (currentDifficulty === ChallengeDifficulty.Hard)
      return ChallengeDifficulty.Medium;
    if (currentDifficulty === ChallengeDifficulty.Medium)
      return ChallengeDifficulty.Easy;
  }

  return currentDifficulty;
}
