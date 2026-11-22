/** Date helpers — everything works on local YYYY-MM-DD keys to dodge timezone bugs. */

export function toKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export const todayKey = (): string => toKey(new Date());

export function addDays(key: string, n: number): string {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

export function diffDays(key: string, base = todayKey()): number {
  const a = fromKey(key).getTime();
  const b = fromKey(base).getTime();
  return Math.round((a - b) / 86_400_000);
}

const WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDue(key: string): string {
  const d = diffDays(key);
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  if (d === -1) return "Yesterday";
  const date = fromKey(key);
  if (d > 1 && d < 7) return WEEK[date.getDay()];
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

export type DueTone = "overdue" | "today" | "soon" | "later";

export function dueTone(key: string, done: boolean): DueTone {
  if (done) return "later";
  const d = diffDays(key);
  if (d < 0) return "overdue";
  if (d === 0) return "today";
  if (d <= 2) return "soon";
  return "later";
}

export function longToday(): string {
  const d = new Date();
  const full = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return `${full[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** Last 7 days as { key, label } oldest → newest. */
export function last7Days(): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const key = addDays(todayKey(), -i);
    out.push({ key, label: WEEK[fromKey(key).getDay()][0] });
  }
  return out;
}
