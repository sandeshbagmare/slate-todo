import type { Recurrence } from "./lib/recurrence";

export type Priority = 0 | 1 | 2;

export interface Step {
  id: string;
  title: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  notes?: string;
  done: boolean;
  priority: Priority;
  due: string | null; // YYYY-MM-DD
  listId: string;
  createdAt: number;
  completedAt: number | null;
  /** repeating rule; completing spawns the next occurrence */
  recurrence?: Recurrence;
  /** id of the task this occurrence was created from */
  spawnedFrom?: string;
  /** checklist inside the task */
  steps?: Step[];
  /** epoch ms when the reminder should fire */
  remindAt?: number | null;
  /** date key the task was pulled into My Day for (carries over until done) */
  myDay?: string | null;
}

export interface TaskList {
  id: string;
  name: string;
  color: string;
}

export type SmartView = "calendar" | "today" | "myday" | "upcoming" | "stats" | "all" | "completed";
export type ViewId = SmartView | `list:${string}`;
export type SortKey = "manual" | "due" | "priority" | "created";
export type StatusFilter = "all" | "active" | "done";
export type Theme = "dark" | "light";

export const PRIORITY_META: Record<Priority, { label: string; short: string }> = {
  0: { label: "Low", short: "Low" },
  1: { label: "Medium", short: "Med" },
  2: { label: "High", short: "High" },
};
