/**
 * Quick-add parser: "Call the bank tomorrow at 3 !2 #Work every week"
 * Anything it cannot recognise stays in the title, so typing normally is safe.
 */
import type { Priority, TaskList } from "../types";
import { addDays, fromKey, todayKey, toKey } from "./date";
import type { Recurrence } from "./recurrence";

export interface ParsedDraft {
  title: string;
  due: string | null;
  priority: Priority | null;
  listId: string | null;
  recurrence: Recurrence | null;
}

const DOW = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const DOW_SHORT = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

/** ISO-ish key for a weekday name: the next occurrence strictly after today. */
function nextWeekday(name: string): string | null {
  const idx = DOW.findIndex((d) => d.startsWith(name.toLowerCase().slice(0, 3)));
  const shortIdx = DOW_SHORT.indexOf(name.toLowerCase().slice(0, 3));
  const target = idx >= 0 ? idx : shortIdx;
  if (target < 0) return null;
  for (let i = 1; i <= 7; i++) {
    const key = addDays(todayKey(), i);
    if (fromKey(key).getDay() === target) return key;
  }
  return null;
}

function parseDateToken(tokens: string[], i: number): { due: string; used: number } | null {
  const word = tokens[i].toLowerCase().replace(/[.,]$/, "");
  const next = (tokens[i + 1] ?? "").toLowerCase().replace(/[.,]$/, "");

  if (word === "today" || word === "tonight") return { due: todayKey(), used: 1 };
  if (word === "tomorrow" || word === "tmrw" || word === "tmw") return { due: addDays(todayKey(), 1), used: 1 };
  if (word === "yesterday") return { due: addDays(todayKey(), -1), used: 1 };
  if (word === "next" && (next === "week" || next === "wk")) return { due: addDays(todayKey(), 7), used: 2 };
  if (word === "next" && next === "month") {
    const d = fromKey(todayKey());
    const m = new Date(d.getFullYear(), d.getMonth() + 1, d.getDate());
    return { due: toKey(m), used: 2 };
  }
  if (word === "in" && /^\d{1,3}$/.test(next)) {
    const unit = (tokens[i + 2] ?? "").toLowerCase().replace(/[.,]$/, "");
    const days = Number(next) * (unit.startsWith("week") ? 7 : unit.startsWith("month") ? 30 : 1);
    return { due: addDays(todayKey(), days), used: unit ? 3 : 2 };
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(word)) return { due: word, used: 1 };

  const dm = word.match(/^(\d{1,2})[/.](\d{1,2})$/);
  if (dm) {
    const d = Number(dm[1]);
    const m = Number(dm[2]);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      const year = fromKey(todayKey()).getFullYear();
      let key = toKey(new Date(year, m - 1, d));
      if (key < todayKey()) key = toKey(new Date(year + 1, m - 1, d));
      return { due: key, used: 1 };
    }
  }

  const monthIdx = MONTHS.findIndex((m) => m.startsWith(word.slice(0, 3)) && word.length >= 3);
  if (monthIdx >= 0 && /^\d{1,2}(st|nd|rd|th)?$/.test(next)) {
    const day = Number(next.replace(/\D/g, ""));
    const year = fromKey(todayKey()).getFullYear();
    let key = toKey(new Date(year, monthIdx, day));
    if (key < todayKey()) key = toKey(new Date(year + 1, monthIdx, day));
    return { due: key, used: 2 };
  }

  const wd = nextWeekday(word);
  if (wd) return { due: wd, used: 1 };
  return null;
}

function parsePriority(token: string): Priority | null {
  const t = token.slice(1).toLowerCase();
  if (!t) return null;
  if (t === "1" || t === "h" || t === "high" || t === "!!") return 2;
  if (t === "2" || t === "m" || t === "med" || t === "medium") return 1;
  if (t === "3" || t === "l" || t === "low") return 0;
  return null;
}

function parseRecurrence(tokens: string[], i: number): { rule: Recurrence; used: number } | null {
  const words = tokens.slice(i, i + 3).map((t) => t.toLowerCase().replace(/[.,]$/, ""));
  const join = words.join(" ");
  if (/^daily\b/.test(join)) return { rule: "daily", used: 1 };
  if (/^weekly\b/.test(join)) return { rule: "weekly", used: 1 };
  if (/^monthly\b/.test(join)) return { rule: "monthly", used: 1 };
  if (/^every\s+day\b/.test(join)) return { rule: "daily", used: 2 };
  if (/^every\s+week\b/.test(join)) return { rule: "weekly", used: 2 };
  if (/^every\s+month\b/.test(join)) return { rule: "monthly", used: 2 };
  if (/^every\s+[a-z]{3}/.test(join)) return { rule: "weekly", used: 2 };
  return null;
}

export function parseQuickAdd(raw: string, lists: TaskList[]): ParsedDraft {
  const tokens = raw.trim().split(/\s+/).filter(Boolean);
  const out: ParsedDraft = {
    title: "",
    due: null,
    priority: null,
    listId: null,
    recurrence: null,
  };
  const rest: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.startsWith("#") && token.length > 1 && !out.listId) {
      const needle = token.slice(1).toLowerCase();
      const match =
        lists.find((l) => l.name.toLowerCase().replace(/\s+/g, "") === needle) ??
        lists.find((l) => l.name.toLowerCase().replace(/\s+/g, "").startsWith(needle));
      if (match) {
        out.listId = match.id;
        continue;
      }
    }

    if (token.startsWith("!") && token.length > 1 && out.priority === null) {
      const p = parsePriority(token);
      if (p !== null) {
        out.priority = p;
        continue;
      }
    }

    if (token.toLowerCase().replace(/[.,]$/, "") === "every" || /^(daily|weekly|monthly)$/i.test(token)) {
      const rec = parseRecurrence(tokens, i);
      if (rec) {
        out.recurrence = rec.rule;
        const weekdayToken = tokens[i + 1]?.toLowerCase().replace(/[.,]$/, "");
        if (rec.used === 2 && weekdayToken && !/^(day|week|month)$/.test(weekdayToken)) {
          const wd = nextWeekday(weekdayToken);
          if (wd) out.due = wd;
        }
        i += rec.used - 1;
        continue;
      }
    }

    if (out.due === null) {
      const date = parseDateToken(tokens, i);
      if (date) {
        out.due = date.due;
        i += date.used - 1;
        continue;
      }
    }

    rest.push(token);
  }

  out.title = rest.join(" ").replace(/\s{2,}/g, " ").trim();
  return out;
}
