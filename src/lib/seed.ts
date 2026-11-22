import type { Task, TaskList } from "../types";
import { addDays, todayKey } from "./date";

export const INBOX = "inbox";

export const STARTER_LISTS: TaskList[] = [
  { id: INBOX, name: "Inbox", color: "#8b7bff" },
  { id: "work", name: "Work", color: "#22d3ee" },
  { id: "personal", name: "Personal", color: "#34d399" },
  { id: "side", name: "Side project", color: "#ff8a4c" },
];

const t = todayKey();

export function starterTasks(): Task[] {
  const base = Date.now();
  const make = (
    i: number,
    title: string,
    listId: string,
    extra: Partial<Task> = {},
  ): Task => ({
    id: `seed-${i}`,
    title,
    done: false,
    priority: 1,
    due: null,
    listId,
    notes: undefined,
    createdAt: base - i * 60_000,
    completedAt: null,
    ...extra,
  });

  return [
    make(1, "Ship the onboarding redesign", "work", { priority: 2, due: t, notes: "Hand off the final three screens to engineering." }),
    make(2, "Review pull request #482", "work", { priority: 1, due: t }),
    make(3, "Book dentist appointment", "personal", { priority: 0, due: addDays(t, 1) }),
    make(4, "Draft the launch announcement", "work", { priority: 2, due: addDays(t, 2) }),
    make(5, "Renew domain + SSL", "side", { priority: 1, due: addDays(t, -1) }),
    make(6, "Weekly review & plan next sprint", "personal", { priority: 1, due: addDays(t, 3), notes: "Inbox zero, then pick max 3 outcomes." }),
    make(7, "Buy coffee beans", "personal", { priority: 0, done: true, completedAt: base - 3 * 3600_000, due: t }),
    make(8, "Sketch the settings page", "side", { priority: 1, due: addDays(t, 5) }),
  ];
}
