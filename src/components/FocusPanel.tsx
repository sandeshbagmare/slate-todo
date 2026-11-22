import type { Task } from "../types";
import { last7Days, todayKey, toKey } from "../lib/date";
import { Icon } from "./Icons";

function computeStats(tasks: Task[]) {
  const today = todayKey();
  const dueToday = tasks.filter((t) => t.due === today);
  const doneToday = dueToday.filter((t) => t.done).length;
  const overdue = tasks.filter((t) => !t.done && t.due !== null && t.due < today).length;
  const active = tasks.filter((t) => !t.done).length;
  const done = tasks.filter((t) => t.done).length;

  const days = last7Days().map((d) => ({
    ...d,
    count: tasks.filter((t) => t.completedAt && toKey(new Date(t.completedAt)) === d.key).length,
  }));
  const weekTotal = days.reduce((sum, d) => sum + d.count, 0);
  const pct = dueToday.length ? Math.round((doneToday / dueToday.length) * 100) : 0;

  return { dueToday, doneToday, overdue, active, done, days, weekTotal, pct };
}

export function ProgressStrip({ tasks }: { tasks: Task[] }) {
  const { dueToday, doneToday, overdue } = computeStats(tasks);
  const pct = dueToday.length ? Math.round((doneToday / dueToday.length) * 100) : 0;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface/70 px-3.5 py-2.5 xl:hidden">
      <div className="relative h-8 w-8 shrink-0">
        <svg viewBox="0 0 36 36" className="h-8 w-8 -rotate-90">
          <circle cx="18" cy="18" r="15" fill="none" strokeWidth="4" className="ring-track" />
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            strokeWidth="4"
            strokeLinecap="round"
            stroke="var(--accent)"
            strokeDasharray={2 * Math.PI * 15}
            strokeDashoffset={2 * Math.PI * 15 * (1 - pct / 100)}
            style={{ transition: "stroke-dashoffset .8s cubic-bezier(.16,1,.3,1)" }}
          />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[12px] font-medium">Today</span>
          <span className="text-[11px] tabular-nums text-muted">
            {doneToday}/{dueToday.length || 0} done
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface2">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent to-cyan-400 transition-[width] duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      {overdue > 0 && (
        <span className="shrink-0 rounded-md bg-danger/12 px-1.5 py-0.5 text-[11px] text-danger">
          {overdue} late
        </span>
      )}
    </div>
  );
}

export function FocusPanel({ tasks }: { tasks: Task[] }) {
  const { dueToday, doneToday, overdue, active, done, days, weekTotal, pct } = computeStats(tasks);
  const R = 52;
  const C = 2 * Math.PI * R;
  const maxDay = Math.max(1, ...days.map((d) => d.count));
  const today = todayKey();

  const tip =
    dueToday.length === 0
      ? "Nothing due today. Pull one thing forward from Upcoming — small wins compound."
      : pct === 100
        ? "Today is clear. Protect the rest of the day, you earned it."
        : overdue > 0
          ? `${overdue} ${overdue === 1 ? "task is" : "tasks are"} overdue. Reschedule or clear them first.`
          : `${dueToday.length - doneToday} left today. Start with the highest-priority one.`;

  return (
    <aside className="hidden w-[292px] shrink-0 flex-col gap-4 xl:flex" aria-label="Focus panel">
      <div className="sticky top-6 flex flex-col gap-4">
        {/* progress ring */}
        <div className="rounded-2xl border border-line bg-surface/80 p-5 backdrop-blur">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted/80">Focus</div>
              <div className="mt-0.5 text-[15px] font-semibold tracking-tight">Today&apos;s progress</div>
            </div>
            <Icon name="sparkle" className="h-4 w-4 text-accent" />
          </div>

          <div className="relative mx-auto mt-4 h-[136px] w-[136px]">
            <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
              <defs>
                <linearGradient id="ringGradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" />
                  <stop offset="60%" stopColor="#22d3ee" />
                  <stop offset="100%" stopColor="#34d399" />
                </linearGradient>
              </defs>
              <circle cx="60" cy="60" r={R} fill="none" strokeWidth="8" className="ring-track" />
              <circle
                cx="60"
                cy="60"
                r={R}
                fill="none"
                strokeWidth="8"
                strokeLinecap="round"
                className="ring-fill"
                strokeDasharray={C}
                strokeDashoffset={C * (1 - pct / 100)}
                style={{ ["--circumference" as string]: `${C}` }}
              />
            </svg>
            <div className="absolute inset-0 grid place-content-center text-center">
              <div className="text-[28px] font-semibold tracking-tight tabular-nums">{pct}%</div>
              <div className="text-[11px] text-muted">
                {doneToday}/{dueToday.length || 0} tasks
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-line bg-surface2/60 px-3 py-2">
              <div className="text-[11px] text-muted">Open</div>
              <div className="text-[17px] font-semibold tabular-nums">{active}</div>
            </div>
            <div className="rounded-xl border border-line bg-surface2/60 px-3 py-2">
              <div className="text-[11px] text-muted">Completed</div>
              <div className="text-[17px] font-semibold tabular-nums">{done}</div>
            </div>
          </div>

          {overdue > 0 && (
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-danger/25 bg-danger/10 px-3 py-2 text-[12px] text-danger">
              <Icon name="fire" className="h-3.5 w-3.5" />
              {overdue} overdue
            </div>
          )}
        </div>

        {/* week */}
        <div className="rounded-2xl border border-line bg-surface/80 p-5 backdrop-blur">
          <div className="flex items-baseline justify-between">
            <div className="text-[13px] font-semibold tracking-tight">This week</div>
            <div className="text-[11px] text-muted">{weekTotal} done</div>
          </div>
          <div className="mt-4 flex h-[76px] items-stretch gap-1.5">
            {days.map((d) => {
              const h = Math.round((d.count / maxDay) * 100);
              const isToday = d.key === today;
              return (
                <div key={d.key} className="flex h-full flex-1 flex-col items-center gap-1.5" title={`${d.count} completed`}>
                  <div className="relative flex w-full flex-1 items-end">
                    <div
                      className={[
                        "w-full rounded-t-[5px] transition-all duration-500",
                        isToday ? "bg-gradient-to-t from-accent to-cyan-400" : "bg-accent/40 group-hover/bar:bg-accent/55",
                      ].join(" ")}
                      style={{ height: `${Math.max(d.count ? 12 : 5, h)}%` }}
                    />
                  </div>
                  <span className={`text-[10.5px] ${isToday ? "font-medium text-accent" : "text-muted"}`}>{d.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* tip */}
        <div className="relative overflow-hidden rounded-2xl border border-accent/25 bg-gradient-to-br from-accent/12 via-surface/60 to-cyan-400/10 p-4">
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
            <Icon name="sparkle" className="h-3.5 w-3.5" />
            Nudge
          </div>
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink/85">{tip}</p>
        </div>
      </div>
    </aside>
  );
}
