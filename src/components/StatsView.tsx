import { useMemo } from "react";
import type { Task, TaskList } from "../types";
import { addDays, fromKey, todayKey } from "../lib/date";
import { heatmapWeeks, MAX_SHIELDS, summarize } from "../lib/streak";
import type { StreakState } from "../lib/streak";
import { Icon } from "./Icons";

const DOW = ["S", "M", "T", "W", "T", "F", "S"];

function when(ts: number | null): string {
  if (!ts) return "";
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function Tile({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface2/50 px-3 py-2.5">
      <div className="text-[10.5px] uppercase tracking-[0.12em] text-muted/80">{label}</div>
      <div className="mt-0.5 text-[18px] font-semibold tabular-nums">{value}</div>
      {hint && <div className="text-[10.5px] text-muted">{hint}</div>}
    </div>
  );
}

export function StatsView({
  tasks,
  lists,
  streak,
  onToggleStreak,
  onRepair,
  onSetGoal,
}: {
  tasks: Task[];
  lists: TaskList[];
  streak: StreakState;
  onToggleStreak: () => void;
  onRepair: () => void;
  onSetGoal: (goal: number) => void;
}) {
  const summary = useMemo(() => summarize(streak), [streak]);
  const weeks = useMemo(() => heatmapWeeks(streak, 13), [streak]);

  const weekBars = useMemo(() => {
    const out: { key: string; label: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const key = addDays(todayKey(), -i);
      out.push({ key, label: DOW[fromKey(key).getDay()], count: streak.log[key] ?? 0 });
    }
    return out;
  }, [streak]);
  const weekMax = Math.max(1, ...weekBars.map((d) => d.count));

  const perList = useMemo(
    () =>
      lists
        .map((l) => {
          const own = tasks.filter((t) => t.listId === l.id);
          const done = own.filter((t) => t.done).length;
          return { ...l, total: own.length, done, pct: own.length ? Math.round((done / own.length) * 100) : 0 };
        })
        .filter((l) => l.total > 0)
        .sort((a, b) => b.total - a.total),
    [lists, tasks],
  );

  const goalPct = Math.min(100, Math.round((summary.today / Math.max(1, streak.goal)) * 100));

  const recent = useMemo(
    () =>
      tasks
        .filter((t) => t.done && t.completedAt)
        .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
        .slice(0, 5),
    [tasks],
  );
  const bestDay = useMemo(() => {
    let key = "";
    let count = 0;
    for (const [k, v] of Object.entries(streak.log)) if (v > count) { count = v; key = k; }
    return key ? { key, count } : null;
  }, [streak]);

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <div className="flex flex-col gap-3">
        {/* streak hero */}
        <section className="relative overflow-hidden rounded-2xl border border-line bg-surface/80 p-4 backdrop-blur sm:p-5">
          <div
            className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-accent/15 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
                <Icon name="fire" className="h-3.5 w-3.5 text-accent" />
                Streak
              </div>
              <div className="mt-1 flex items-end gap-2">
                <span className="text-[44px] font-semibold leading-none tracking-[-0.04em] tabular-nums">
                  {summary.current}
                </span>
                <span className="pb-1 text-[13px] text-muted">
                  {summary.current === 1 ? "day" : "days"} in a row
                </span>
              </div>
              <p className="mt-2 max-w-[34ch] text-[12.5px] leading-relaxed text-muted">
                {summary.current === 0
                  ? "Finish one task today to light the flame."
                  : summary.atRisk
                    ? "Today is still open — finish one task to keep it alive."
                    : "Every day with a finished task counts. Keep it going."}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-[10.5px] uppercase tracking-[0.12em] text-muted/80">Today</div>
                <div className="text-[16px] font-semibold tabular-nums">
                  {summary.today}
                  <span className="text-muted">/{streak.goal}</span>
                </div>
                <div className="mt-1.5 flex justify-end gap-1">
                  {Array.from({ length: Math.max(streak.goal, summary.today) }, (_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 w-3.5 rounded-full ${i < summary.today ? "bg-accent" : "bg-line"}`}
                    />
                  ))}
                </div>
              </div>
              <div
                className="grid h-14 w-14 place-items-center rounded-full"
                style={{
                  background: `conic-gradient(var(--accent) ${goalPct * 3.6}deg, var(--line) 0deg)`,
                }}
                aria-label={`Daily goal ${goalPct}%`}
              >
                <span className="grid h-11 w-11 place-items-center rounded-full bg-surface text-[11px] font-semibold tabular-nums">
                  {goalPct}%
                </span>
              </div>
            </div>
          </div>

          <div className="relative mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onToggleStreak}
              aria-pressed={streak.enabled}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11.5px] font-medium transition ${
                streak.enabled
                  ? "border-accent/40 bg-accent/10 text-accent"
                  : "border-line bg-surface2/60 text-muted hover:text-ink"
              }`}
            >
              <Icon name="fire" className="h-3.5 w-3.5" />
              Streaks {streak.enabled ? "on" : "off"}
            </button>

            <div className="flex items-center gap-1.5 rounded-lg border border-line bg-surface2/60 px-2.5 py-1.5">
              <Icon name="shield" className="h-3.5 w-3.5 text-muted" />
              <span className="text-[11.5px] text-muted">
                Freezes <span className="tabular-nums text-ink">{streak.shields}</span>/{MAX_SHIELDS}
              </span>
            </div>

            {summary.repairable && (
              <button
                type="button"
                onClick={onRepair}
                disabled={streak.shields <= 0}
                className="rounded-lg border border-accent/40 bg-accent/10 px-2.5 py-1.5 text-[11.5px] font-medium text-accent transition hover:bg-accent/15 disabled:opacity-50"
              >
                Use a freeze to save yesterday
              </button>
            )}

            <div className="ml-auto flex items-center gap-1.5 text-[11.5px] text-muted">
              <span className="hidden sm:inline">Daily goal</span>
              {[2, 3, 5].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => onSetGoal(g)}
                  aria-pressed={streak.goal === g}
                  className={`h-6 w-6 rounded-md border text-[11px] tabular-nums transition ${
                    streak.goal === g
                      ? "border-accent/50 bg-accent/15 text-accent"
                      : "border-line text-muted hover:text-ink"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* heatmap */}
        <section className="rounded-2xl border border-line bg-surface/80 p-4 backdrop-blur">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[12.5px] font-semibold">Consistency</h2>
            <span className="text-[11px] text-muted">last 13 weeks</span>
          </div>
          <div className="mt-3 grid grid-cols-[auto_repeat(13,minmax(0,1fr))] gap-x-[5px] gap-y-0 pb-1">
            <div className="flex flex-col gap-[5px] pr-1" aria-hidden="true">
              {["M", "", "W", "", "F", "", "S"].map((d, i) => (
                <span key={i} className="flex h-[16px] items-center text-[9px] leading-none text-muted/70">
                  {d}
                </span>
              ))}
            </div>
            {weeks.map((col, ci) => (
              <div key={ci} className="flex flex-col gap-[3px]">
                {col.map((day) => {
                  const level = day.count === 0 ? 0 : Math.min(4, day.count);
                  return (
                    <span
                      key={day.key}
                      title={`${day.key} — ${day.count} done`}
                      className="h-[16px] w-full rounded-[4px] transition-colors"
                      style={{
                        background:
                          level === 0
                            ? "color-mix(in oklab, var(--muted) 16%, transparent)"
                            : level === 1
                              ? "color-mix(in oklab, var(--accent) 40%, transparent)"
                              : level === 2
                                ? "color-mix(in oklab, var(--accent) 62%, transparent)"
                                : level === 3
                                  ? "color-mix(in oklab, var(--accent) 82%, transparent)"
                                  : "var(--accent)",
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[10.5px] text-muted">
            <span>less</span>
            {[0, 1, 2, 3, 4].map((l) => (
              <span
                key={l}
                className="h-[10px] w-[10px] rounded-[2px]"
                style={{
                  background:
                    l === 0
                      ? "color-mix(in oklab, var(--muted) 16%, transparent)"
                      : `color-mix(in oklab, var(--accent) ${l * 21 + 19}%, transparent)`,
                }}
              />
            ))}
            <span>more</span>
          </div>
        </section>

        {/* recently finished */}
        <section className="rounded-2xl border border-line bg-surface/80 p-4 backdrop-blur">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[12.5px] font-semibold">Recently finished</h2>
            <span className="text-[11px] text-muted">{summary.totalDone} all time</span>
          </div>
          {recent.length === 0 ? (
            <p className="mt-2 text-[12px] text-muted">Finished tasks will collect here.</p>
          ) : (
            <ul className="mt-2 flex flex-col">
              {recent.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center gap-2 border-b border-line/70 py-1.5 text-[12px] last:border-0"
                >
                  <Icon name="checkCircle" className="h-3.5 w-3.5 shrink-0 text-success" />
                  <span className={`truncate ${t.done ? "text-muted line-through" : "text-ink"}`}>
                    {t.title}
                  </span>
                  <span className="ml-auto shrink-0 text-[10.5px] text-muted">{when(t.completedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 7 day momentum */}
        <section className="rounded-2xl border border-line bg-surface/80 p-4 backdrop-blur">
          <h2 className="text-[12.5px] font-semibold">Last 7 days</h2>
          <div className="mt-3 flex items-end gap-2">
            {weekBars.map((d) => {
              const h = Math.max(4, Math.round((d.count / weekMax) * 62));
              const isToday = d.key === todayKey();
              return (
                <div key={d.key} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className="text-[10px] tabular-nums text-muted">{d.count || ""}</span>
                  <div
                    className={`w-full rounded-md ${isToday ? "bg-accent" : "bg-accent/35"}`}
                    style={{ height: h }}
                    title={`${d.count} completed`}
                  />
                  <span className={`text-[10px] ${isToday ? "text-accent" : "text-muted"}`}>{d.label}</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* right column */}
      <div className="flex flex-col gap-3">
        <section className="rounded-2xl border border-line bg-surface/80 p-4 backdrop-blur">
          <h2 className="text-[12.5px] font-semibold">Records</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Tile label="Best streak" value={summary.best} hint="days in a row" />
            <Tile label="Active days" value={summary.activeDays} hint="with a finish" />
            <Tile label="Tasks done" value={summary.totalDone} hint="all time" />
            <Tile
              label="Best day"
              value={bestDay ? bestDay.count : 0}
              hint={bestDay ? bestDay.key.slice(5).replace("-", "/") : "—"}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-surface/80 p-4 backdrop-blur">
          <h2 className="text-[12.5px] font-semibold">Lists</h2>
          {perList.length === 0 ? (
            <p className="mt-2 text-[12px] text-muted">No tasks yet.</p>
          ) : (
            <div className="mt-3 flex flex-col gap-3">
              {perList.map((l) => (
                <div key={l.id}>
                  <div className="flex items-baseline justify-between text-[11.5px]">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: l.color }} />
                      {l.name}
                    </span>
                    <span className="tabular-nums text-muted">
                      {l.done}/{l.total}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full transition-[width] duration-500"
                      style={{ width: `${l.pct}%`, background: l.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-line bg-surface/80 p-4 text-[11.5px] leading-relaxed text-muted backdrop-blur">
          <div className="mb-1 flex items-center gap-1.5 text-[12.5px] font-semibold text-ink">
            <Icon name="zap" className="h-3.5 w-3.5 text-accent" />
            How streaks work
          </div>
          One finished task keeps a day alive. Every 7 days in a row earns a freeze; a freeze can
          patch a single missed day. Streaks are a setting you can switch off at any time.
        </section>
      </div>
    </div>
  );
}
