import type { Task } from "../types";
import type { StreakState } from "../lib/streak";
import { addDays, formatDue, todayKey } from "../lib/date";
import { weekSummary } from "../lib/week";
import { Icon } from "./Icons";

export function ReviewView({
  tasks,
  streak,
  onSetDue,
  onToggleMyDay,
  onOpenTask,
}: {
  tasks: Task[];
  streak: StreakState;
  onSetDue: (id: string, due: string | null) => void;
  onToggleMyDay: (id: string) => void;
  onOpenTask: (id: string) => void;
}) {
  const today = todayKey();
  const s = weekSummary(tasks, streak, today);
  const maxDay = Math.max(1, ...s.days.map((d) => d.count));

  const tiles = [
    { label: "Completed this week", value: String(s.doneThisWeek.length), icon: "checkCircle" as const },
    { label: "Still open", value: String(s.open), icon: "layers" as const },
    { label: "Overdue", value: String(s.overdue.length), icon: "clock" as const },
    { label: "Streak", value: `${s.streak.current}d`, icon: "fire" as const },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-2xl border border-line bg-surface/80 p-3.5">
            <div className="flex items-center gap-1.5 text-[11.5px] text-muted">
              <Icon name={t.icon} className="h-3.5 w-3.5" />
              {t.label}
            </div>
            <div className="mt-1.5 text-[22px] font-semibold leading-none tabular-nums">{t.value}</div>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-line bg-surface/80 p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[12.5px] font-semibold">This week</h2>
          <span className="text-[11.5px] text-muted">
            {s.doneThisWeek.length} done · {s.open} open
          </span>
        </div>
        <div className="mt-3 flex items-end gap-2">
          {s.days.map((d) => (
            <div key={d.key} className="flex flex-1 flex-col items-center gap-1.5">
              <span className={`h-3 text-[10px] tabular-nums ${d.count > 0 ? "text-muted" : "text-muted/40"}`}>{d.count}</span>
              <div
                className={[
                  "w-full rounded-md transition-all",
                  d.count === 0 ? "bg-line" : d.isToday ? "bg-accent" : "bg-accent/55",
                  d.future ? "opacity-40" : "",
                ].join(" ")}
                style={{ height: `${8 + (d.count / maxDay) * 56}px` }}
                title={`${d.count} completed`}
              />
              <span className={`text-[10.5px] ${d.isToday ? "font-semibold text-accent" : "text-muted"}`}>
                {d.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface/80 p-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-[12.5px] font-semibold">
            <Icon name="clock" className="h-3.5 w-3.5 text-danger" />
            Overdue triage
            {s.overdue.length > 0 && (
              <span className="rounded-full bg-danger/15 px-1.5 text-[10.5px] text-danger">{s.overdue.length}</span>
            )}
          </h2>
        </div>
        {s.overdue.length === 0 ? (
          <p className="mt-2 text-[12px] text-muted">Nothing overdue. That is the whole point.</p>
        ) : (
          <ul className="mt-2.5 flex flex-col gap-1.5">
            {s.overdue.slice(0, 6).map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-line/70 bg-surface2/40 px-2.5 py-2">
                <button
                  type="button"
                  onClick={() => onOpenTask(t.id)}
                  className="min-w-0 flex-1 truncate text-left text-[12.5px] text-ink"
                  title="Open this task"
                >
                  {t.title}
                </button>
                <span className="text-[10.5px] text-danger">{t.due ? formatDue(t.due) : ""}</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => onSetDue(t.id, today)}
                    className="rounded-md border border-line inline-flex min-h-[30px] items-center bg-surface2/70 px-2.5 py-1.5 text-[11px] text-ink transition hover:border-accent/50 hover:text-accent"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => onSetDue(t.id, addDays(today, 1))}
                    className="rounded-md border border-line inline-flex min-h-[30px] items-center bg-surface2/70 px-2.5 py-1.5 text-[11px] text-ink transition hover:border-accent/50 hover:text-accent"
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleMyDay(t.id)}
                    aria-label={`Add "${t.title}" to My Day`}
                    className="rounded-md border border-line bg-surface2/60 px-2 py-1 text-muted transition hover:border-accent/50 hover:text-accent"
                  >
                    <Icon name="star" className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-surface/80 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[12.5px] font-semibold">Rest of the week</h2>
          <span className="text-[11.5px] text-muted">{s.planned.length} scheduled</span>
        </div>
        {s.planned.length === 0 ? (
          <p className="mt-2 text-[12px] text-muted">No due dates between today and Sunday.</p>
        ) : (
          <ul className="mt-2.5 flex flex-col gap-1">
            {s.planned.slice(0, 8).map((t) => (
              <li key={t.id} className="flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-surface2/50">
                <span className="w-16 shrink-0 text-[10.5px] text-muted">{formatDue(t.due as string)}</span>
                <button
                  type="button"
                  onClick={() => onOpenTask(t.id)}
                  className="min-w-0 flex-1 truncate text-left text-[12.5px] text-ink/90"
                >
                  {t.title}
                </button>
                <button
                  type="button"
                  onClick={() => onToggleMyDay(t.id)}
                  aria-label={`Add "${t.title}" to My Day`}
                  className={`rounded-md p-1 transition hover:bg-accent/10 ${t.myDay ? "text-accent" : "text-muted/50 hover:text-accent"}`}
                >
                  <Icon name="star" className="h-3.5 w-3.5" fill={t.myDay ? "currentColor" : "none"} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
