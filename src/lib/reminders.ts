/**
 * Reminders. Pure planning lives in `upcomingReminders` (easy to reason about and
 * to test); delivery is best-effort:
 *   - Android/iOS: @capacitor/local-notifications schedules them with the OS
 *   - Web: a Notification fires while the tab is open (and permission was granted)
 * Nothing here touches task state — the caller owns persistence.
 */
import type { Task } from "../types";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

export interface PlannedReminder {
  taskId: string;
  title: string;
  at: number;
}

const MINUTE = 60_000;

/** Future reminders, soonest first, capped so we never spam the OS. */
export function upcomingReminders(tasks: Task[], now = Date.now(), limit = 40): PlannedReminder[] {
  return tasks
    .filter((t) => !t.done && typeof t.remindAt === "number" && t.remindAt > now)
    .map((t) => ({ taskId: t.id, title: t.title, at: t.remindAt as number }))
    .sort((a, b) => a.at - b.at)
    .slice(0, limit);
}

/** Stable positive 31-bit id for a task, required by the native scheduler. */
function numericId(taskId: string): number {
  let h = 0;
  for (let i = 0; i < taskId.length; i++) h = (h * 31 + taskId.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}

export async function requestReminderPermission(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    const status = await LocalNotifications.requestPermissions();
    return status.display === "granted";
  }
  if (typeof Notification === "undefined") return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

/** Replace the OS schedule with the current set. Returns how many were scheduled. */
export async function syncReminders(tasks: Task[]): Promise<number> {
  const planned = upcomingReminders(tasks);
  if (!Capacitor.isNativePlatform()) return 0;

  try {
    await LocalNotifications.cancel({ notifications: [] }).catch(() => undefined);
    if (planned.length === 0) return 0;
    await LocalNotifications.schedule({
      notifications: planned.map((r) => ({
        id: numericId(r.taskId),
        title: "Slate",
        body: r.title,
        schedule: { at: new Date(r.at), allowWhileIdle: true },
        smallIcon: "ic_stat_slate",
      })),
    });
    return planned.length;
  } catch {
    return 0;
  }
}

/** Web fallback: fire notifications for reminders whose time passed while open. */
export function startWebReminderLoop(
  getTasks: () => Task[],
  onFire: (title: string) => void,
): () => void {
  if (Capacitor.isNativePlatform() || typeof Notification === "undefined") return () => undefined;
  const fired = new Set<string>();
  const tick = () => {
    if (Notification.permission !== "granted") return;
    const now = Date.now();
    for (const r of upcomingReminders(getTasks(), now)) {
      if (r.at - now > MINUTE) break;
    }
    for (const t of getTasks()) {
      if (!t.remindAt || t.done) continue;
      const late = now - t.remindAt;
      if (late < 0 || late > MINUTE || fired.has(t.id)) continue;
      fired.add(t.id);
      try {
        new Notification("Slate", { body: t.title });
      } catch {
        /* some browsers throw without a service worker */
      }
      onFire(t.title);
    }
  };
  const handle = window.setInterval(tick, 20_000);
  return () => window.clearInterval(handle);
}
