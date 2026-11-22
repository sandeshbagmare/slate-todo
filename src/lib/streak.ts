/**
 * Streak engine. Kept pure so the rule set is easy to reason about and test:
 * a day counts when at least one task was completed on it, and a streak is the
 * run of consecutive counting days ending today (or yesterday, while today is
 * still open). Freezes are earned every 7 days and can repair one broken day.
 */
import { addDays, todayKey } from "./date";

export interface StreakState {
  enabled: boolean;
  /** completions per local YYYY-MM-DD */
  log: Record<string, number>;
  best: number;
  shields: number;
  goal: number;
}

export const MAX_SHIELDS = 3;

export const emptyStreak: StreakState = {
  enabled: true,
  log: {},
  best: 0,
  shields: 1,
  goal: 3,
};

export interface StreakSummary {
  current: number;
  best: number;
  today: number;
  goal: number;
  activeDays: number;
  totalDone: number;
  /** yesterday is empty but the run before it is alive → a freeze can save it */
  repairable: boolean;
  atRisk: boolean;
}

function runEndingAt(log: Record<string, number>, start: string): number {
  let n = 0;
  let key = start;
  while ((log[key] ?? 0) > 0) {
    n += 1;
    key = addDays(key, -1);
  }
  return n;
}

export function summarize(state: StreakState): StreakSummary {
  const today = todayKey();
  const yesterday = addDays(today, -1);
  const todayCount = state.log[today] ?? 0;

  let current: number;
  if (todayCount > 0) current = runEndingAt(state.log, today);
  else current = runEndingAt(state.log, yesterday);

  const repairable =
    todayCount === 0 &&
    (state.log[yesterday] ?? 0) === 0 &&
    (state.log[addDays(today, -2)] ?? 0) > 0;

  const totalDone = Object.values(state.log).reduce((a, b) => a + b, 0);

  return {
    current,
    best: Math.max(state.best, current),
    today: todayCount,
    goal: state.goal,
    activeDays: Object.keys(state.log).filter((k) => (state.log[k] ?? 0) > 0).length,
    totalDone,
    repairable,
    atRisk: state.enabled && todayCount === 0 && current > 0,
  };
}

/** Call when a task is completed. Returns the next state (never mutates). */
export function recordCompletion(state: StreakState): StreakState {
  const today = todayKey();
  const log = { ...state.log, [today]: (state.log[today] ?? 0) + 1 };
  const current = runEndingAt(log, today);
  const earned = current > 0 && current % 7 === 0;
  return {
    ...state,
    log,
    best: Math.max(state.best, current),
    shields: earned ? Math.min(MAX_SHIELDS, state.shields + 1) : state.shields,
  };
}

/** Spend one freeze to fill yesterday and keep the run alive. */
export function repairStreak(state: StreakState): StreakState {
  if (state.shields <= 0) return state;
  const yesterday = addDays(todayKey(), -1);
  return {
    ...state,
    shields: state.shields - 1,
    log: { ...state.log, [yesterday]: Math.max(1, state.log[yesterday] ?? 0) },
  };
}

/** Oldest → newest keys for the last `weeks * 7` days, grouped into columns. */
export function heatmapWeeks(state: StreakState, weeks = 13): { key: string; count: number }[][] {
  const today = todayKey();
  const total = weeks * 7;
  const days: { key: string; count: number }[] = [];
  for (let i = total - 1; i >= 0; i--) {
    const key = addDays(today, -i);
    days.push({ key, count: state.log[key] ?? 0 });
  }
  const cols: { key: string; count: number }[][] = [];
  for (let i = 0; i < days.length; i += 7) cols.push(days.slice(i, i + 7));
  return cols;
}
