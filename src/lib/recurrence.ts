import { addDays, fromKey, toKey } from "./date";

export type Recurrence = "none" | "daily" | "weekly" | "monthly";

export const RECURRENCE_META: Record<Recurrence, { label: string; short: string }> = {
  none: { label: "Doesn't repeat", short: "" },
  daily: { label: "Every day", short: "Daily" },
  weekly: { label: "Every week", short: "Weekly" },
  monthly: { label: "Every month", short: "Monthly" },
};

export function nextDue(due: string, rule: Recurrence): string {
  if (rule === "daily") return addDays(due, 1);
  if (rule === "weekly") return addDays(due, 7);
  if (rule === "monthly") {
    const d = fromKey(due);
    const day = d.getDate();
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    next.setDate(Math.min(day, lastDay));
    return toKey(next);
  }
  return due;
}

/** Every date a rule lands on inside [from, to], inclusive. Capped for safety. */
export function occurrencesBetween(
  start: string,
  rule: Recurrence,
  from: string,
  to: string,
  limit = 80,
): string[] {
  if (rule === "none") return start >= from && start <= to ? [start] : [];
  const out: string[] = [];
  let key = start;
  let guard = 0;
  while (key < from && guard < 500) {
    key = nextDue(key, rule);
    guard += 1;
  }
  while (key <= to && out.length < limit) {
    out.push(key);
    key = nextDue(key, rule);
  }
  return out;
}
