import type { Task } from "../types";
import type { StreakState } from "../lib/streak";
import { summarize } from "../lib/streak";
import { addDays, fromKey, todayKey, toKey } from "../lib/date";

const WEEKDAY = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Monday of the current week, as a date key. */
export function weekStart(today = todayKey()): string {
  const d = fromKey(today);
  const shift = (d.getDay() + 6) % 7; // Monday = 0
  return addDays(today, -shift);
}

export function weekSummary(tasks: Task[], streak: StreakState, today = todayKey()) {
  const start = weekStart(today);
  const end = addDays(start, 6);
  const doneThisWeek = tasks.filter(
    (t) => t.done && t.completedAt && toKey(new Date(t.completedAt)) >= start,
  );
  const days = Array.from({ length: 7 }, (_, i) => {
    const key = addDays(start, i);
    return {
      key,
      label: WEEKDAY[i],
      count: tasks.filter((t) => t.completedAt && toKey(new Date(t.completedAt)) === key).length,
      isToday: key === today,
      future: key > today,
    };
  });
  const overdue = tasks
    .filter((t) => !t.done && t.due !== null && t.due < today)
    .sort((a, b) => (a.due ?? "").localeCompare(b.due ?? ""));
  const planned = tasks
    .filter((t) => !t.done && t.due !== null && t.due >= today && t.due <= end)
    .sort((a, b) => (a.due ?? "").localeCompare(b.due ?? ""));
  const open = tasks.filter((t) => !t.done).length;
  const best = days.reduce((acc, d) => (d.count > acc.count ? d : acc), days[0]);

  return { start, end, doneThisWeek, days, overdue, planned, open, best, streak: summarize(streak) };
}
