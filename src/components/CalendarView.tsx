import { useMemo, useRef, useState } from "react";
import type { Task, TaskList } from "../types";
import { addDays, diffDays, fromKey, todayKey, toKey } from "../lib/date";
import { Icon } from "./Icons";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function monthDays(year: number, month: number): string[] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // Monday-first grid
  const start = new Date(year, month, 1 - offset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return toKey(d);
  });
}

function label(key: string): string {
  const d = fromKey(key);
  const rel = diffDays(key);
  const base = `${DOW[d.getDay()]}, ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
  if (rel === 0) return `Today · ${base}`;
  if (rel === 1) return `Tomorrow · ${base}`;
  if (rel === -1) return `Yesterday · ${base}`;
  return base;
}

export function CalendarView({
  tasks,
  lists,
  onToggle,
  onDelete,
  onAdd,
  onMove,
}: {
  tasks: Task[];
  lists: TaskList[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: (title: string, due: string, listId: string) => void;
  onMove: (id: string, due: string) => void;
}) {
  const today = todayKey();
  const [cursor, setCursor] = useState(() => {
    const d = fromKey(today);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selected, setSelected] = useState(today);
  const [mode, setMode] = useState<"month" | "week">("month");
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const draftRef = useRef<HTMLInputElement>(null);

  const byDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t.due) continue;
      const arr = map.get(t.due) ?? [];
      arr.push(t);
      map.set(t.due, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => Number(a.done) - Number(b.done) || b.priority - a.priority);
    }
    return map;
  }, [tasks]);

  const days = useMemo(() => monthDays(cursor.year, cursor.month), [cursor]);
  const monthPrefix = `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}`;
  const monthCount = useMemo(
    () => tasks.filter((t) => t.due?.startsWith(monthPrefix)).length,
    [tasks, monthPrefix],
  );

  const monthTasks = useMemo(
    () => tasks.filter((t) => t.due?.startsWith(monthPrefix)),
    [tasks, monthPrefix],
  );
  const monthDone = monthTasks.filter((t) => t.done).length;
  const monthLate = monthTasks.filter((t) => !t.done && t.due !== null && t.due < today).length;
  const busiest = useMemo(() => {
    let best = { key: "", count: 0 };
    for (const [key, arr] of byDay) {
      if (!key.startsWith(monthPrefix)) continue;
      if (arr.length > best.count) best = { key, count: arr.length };
    }
    return best;
  }, [byDay, monthPrefix]);

  const upcoming = useMemo(() => {
    const out: { key: string; items: Task[] }[] = [];
    for (let i = 1; i <= 10 && out.length < 3; i++) {
      const key = addDays(today, i);
      const items = byDay.get(key);
      if (items?.length) out.push({ key, items });
    }
    return out;
  }, [byDay, today]);

  const selectedTasks = byDay.get(selected) ?? [];
  const listOf = (id: string) => lists.find((l) => l.id === id);
  const defaultList = lists[0]?.id ?? "inbox";

  const weekStart = useMemo(
    () => addDays(selected, -((fromKey(selected).getDay() + 6) % 7)),
    [selected],
  );
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );
  const weekEnd = addDays(weekStart, 6);
  const weekCount = weekDays.reduce((n, k) => n + (byDay.get(k)?.length ?? 0), 0);
  const weekLabel = `${MONTHS[fromKey(weekStart).getMonth()].slice(0, 3)} ${fromKey(weekStart).getDate()} - ${MONTHS[fromKey(weekEnd).getMonth()].slice(0, 3)} ${fromKey(weekEnd).getDate()}`;

  const shift = (n: number) => {
    if (mode === "week") {
      setSelected(addDays(selected, 7 * n));
      return;
    }
    const d = new Date(cursor.year, cursor.month + n, 1);
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
  };

  const dropProps = (key: string) => ({
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(key);
    },
    onDragLeave: () => setDragOver((k) => (k === key ? null : k)),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      const id = e.dataTransfer.getData("text/plain");
      if (id) onMove(id, key);
      setDragOver(null);
    },
  });

  const goToday = () => {
    const d = fromKey(today);
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
    setSelected(today);
  };

  const submit = () => {
    const title = draft.trim();
    if (!title) return;
    onAdd(title, selected, defaultList);
    setDraft("");
    draftRef.current?.focus();
  };

  return (
    <div className="mt-4">
      {/* month toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => shift(-1)}
            aria-label="Previous month"
            className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-surface/70 text-muted transition hover:text-ink"
          >
            <Icon name="chevronDown" className="h-4 w-4 rotate-90" />
          </button>
          <button
            type="button"
            onClick={() => shift(1)}
            aria-label="Next month"
            className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-surface/70 text-muted transition hover:text-ink"
          >
            <Icon name="chevronDown" className="h-4 w-4 -rotate-90" />
          </button>
          <div className="ml-2">
            <div className="text-[15px] font-semibold tracking-tight sm:text-[17px]">
              {mode === "month" ? `${MONTHS[cursor.month]} ${cursor.year}` : weekLabel}
            </div>
            <div className="text-[11.5px] text-muted">
              {mode === "month" ? `${monthCount} scheduled` : `${weekCount} this week`}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
        <div className="flex rounded-xl border border-line bg-surface/70 p-0.5" role="group" aria-label="Calendar mode">
          {(["month", "week"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={`rounded-lg px-2.5 py-1 text-[12px] font-medium capitalize transition ${
                mode === m ? "bg-accent/15 text-accent" : "text-muted hover:text-ink"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={goToday}
          className="rounded-xl border border-line bg-surface/70 px-3 py-1.5 text-[12.5px] font-medium text-ink transition hover:border-accent/40 hover:text-accent"
        >
          Today
        </button>
        </div>
      </div>

      <div className={`mt-3 grid gap-4 ${mode === "month" ? "lg:grid-cols-[minmax(0,1fr)_320px]" : ""}`}>
        {/* week board */}
        {mode === "week" ? (
          <div className="rounded-2xl border border-line bg-surface/60 p-2 backdrop-blur sm:p-3">
            <div className="grid gap-1 sm:grid-cols-7">
              {weekDays.map((key) => {
                const dayTasks = byDay.get(key) ?? [];
                const isToday = key === today;
                const isSelected = key === selected;
                return (
                  <div
                    key={key}
                    {...dropProps(key)}
                    className={[
                      "flex flex-col gap-1.5 rounded-xl border p-1.5 transition-colors",
                      dragOver === key
                        ? "border-accent bg-accent/15"
                        : isSelected
                          ? "border-accent/50 bg-accent/8"
                          : "border-line/60",
                    ].join(" ")}
                  >
                    <button
                      type="button"
                      onClick={() => setSelected(key)}
                      className="flex items-center justify-between gap-1 rounded-lg px-0.5 py-0.5 text-left"
                      aria-label={`${label(key)}, ${dayTasks.length} tasks`}
                    >
                      <span className="text-[10px] font-medium uppercase tracking-wider text-muted">
                        {WEEKDAYS[(fromKey(key).getDay() + 6) % 7]}
                      </span>
                      <span
                        className={`grid h-[20px] min-w-[20px] place-items-center rounded-full text-[11.5px] font-medium tabular-nums ${
                          isToday ? "bg-accent text-white" : "text-muted"
                        }`}
                      >
                        {Number(key.slice(-2))}
                      </span>
                    </button>

                    <div className="flex min-h-[64px] flex-col gap-1 sm:min-h-[240px]">
                      {dayTasks.map((t) => (
                        <div
                          key={t.id}
                          data-task-id={t.id}
                          draggable
                          onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)}
                          title="Drag to another day"
                          className={[
                            "group/chip flex cursor-grab items-start gap-1 rounded-md px-1 py-1 text-[11px] leading-snug active:cursor-grabbing",
                            t.done ? "bg-surface2 text-muted line-through" : "bg-accent/10 text-ink/85",
                          ].join(" ")}
                        >
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={t.done}
                            aria-label={t.done ? `Mark "${t.title}" as not done` : `Complete "${t.title}"`}
                            onClick={() => onToggle(t.id)}
                            className="mt-[1px] grid h-3 w-3 shrink-0 place-items-center rounded-[4px] border border-line/80 text-transparent hover:border-accent/70"
                          >
                            <Icon name="check" className="h-2 w-2" strokeWidth={3} />
                          </button>
                          <span className="line-clamp-2 min-w-0">{t.title}</span>
                        </div>
                      ))}
                      {dayTasks.length === 0 && (
                        <span className="px-1 text-[10.5px] text-muted/50">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 px-1 text-[10.5px] text-muted/70">
              Drag a task onto another day to reschedule it.
            </p>
          </div>
        ) : (
        <>
        {/* month grid */}
        <div className="rounded-2xl border border-line bg-surface/60 p-2 backdrop-blur sm:p-3">
          <div className="grid grid-cols-7 gap-1 pb-1">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1 text-center text-[10.5px] font-medium uppercase tracking-wider text-muted">
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((key) => {
              const dayTasks = byDay.get(key) ?? [];
              const openCount = dayTasks.filter((t) => !t.done).length;
              const doneCount = dayTasks.length - openCount;
              const isToday = key === today;
              const isSelected = key === selected;
              const inMonth = key.startsWith(monthPrefix);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelected(key)}
                  {...dropProps(key)}
                  aria-pressed={isSelected}
                  aria-label={`${label(key)}, ${dayTasks.length} tasks`}
                  className={[
                    "group relative flex min-h-[60px] flex-col gap-1 rounded-xl border p-1.5 text-left transition-colors sm:h-[92px] sm:p-2",
                    dragOver === key
                      ? "border-accent bg-accent/15"
                      : isSelected
                        ? "border-accent/60 bg-accent/10"
                        : "border-transparent hover:border-line hover:bg-surface2/60",
                    inMonth ? "text-ink" : "text-muted/45",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={[
                        "grid h-[22px] min-w-[22px] place-items-center rounded-full text-[12px] font-medium tabular-nums",
                        isToday ? "bg-accent text-white" : "",
                      ].join(" ")}
                    >
                      {Number(key.slice(-2))}
                    </span>
                    {dayTasks.length > 0 && (
                      <span className="text-[10px] tabular-nums text-muted/70 sm:hidden">
                        {dayTasks.length}
                      </span>
                    )}
                  </div>

                  {/* mobile: dots */}
                  <div className="flex flex-wrap gap-0.5 sm:hidden">
                    {dayTasks.slice(0, 4).map((t) => (
                      <span
                        key={t.id}
                        className={`h-1.5 w-1.5 rounded-full ${t.done ? "bg-muted/40" : t.priority === 2 ? "bg-danger" : "bg-accent"}`}
                      />
                    ))}
                    {doneCount > 0 && dayTasks.length > 4 && <span className="h-1.5 w-1.5 rounded-full bg-muted/30" />}
                  </div>

                  {/* desktop: task chips */}
                  <div className="hidden flex-col gap-0.5 sm:flex">
                    {dayTasks.slice(0, 2).map((t) => (
                      <div
                        key={t.id}
                        data-task-id={t.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)}
                        title="Drag to another day"
                        className={[
                          "truncate rounded-md px-1 py-0.5 text-[10.5px] leading-tight",
                          t.done ? "bg-surface2 text-muted line-through" : "bg-accent/10 text-ink/85",
                        ].join(" ")}
                      >
                        {t.title}
                      </div>
                    ))}
                    {dayTasks.length > 2 && (
                      <span className="px-1 text-[10px] text-muted">+{dayTasks.length - 2} more</span>
                    )}
                  </div>

                  {openCount > 0 && isToday && (
                    <span className="absolute right-1.5 top-1.5 hidden h-1.5 w-1.5 rounded-full bg-accent sm:block" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        </>
        )}
        {/* selected day */}
        {mode === "month" && (
        <div className="flex flex-col gap-3">
        <div className="flex flex-col rounded-2xl border border-line bg-surface/80 p-3 backdrop-blur sm:p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[13.5px] font-semibold tracking-tight">{label(selected)}</div>
              <div className="text-[11.5px] text-muted">
                {selectedTasks.length === 0
                  ? "Nothing scheduled"
                  : `${selectedTasks.filter((t) => !t.done).length} open · ${selectedTasks.filter((t) => t.done).length} done`}
              </div>
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setSelected(addDays(selected, -1))}
                aria-label="Previous day"
                className="grid h-7 w-7 place-items-center rounded-lg border border-line text-muted transition hover:text-ink"
              >
                <Icon name="chevronDown" className="h-3.5 w-3.5 rotate-90" />
              </button>
              <button
                type="button"
                onClick={() => setSelected(addDays(selected, 1))}
                aria-label="Next day"
                className="grid h-7 w-7 place-items-center rounded-lg border border-line text-muted transition hover:text-ink"
              >
                <Icon name="chevronDown" className="h-3.5 w-3.5 -rotate-90" />
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-xl border border-line bg-surface2/40 px-2 py-1.5 focus-within:border-accent/50">
            <Icon name="plus" className="h-4 w-4 shrink-0 text-accent" />
            <input
              ref={draftRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              placeholder="Add task on this day"
              aria-label={`Add task on ${label(selected)}`}
              className="min-w-0 flex-1 bg-transparent py-1 text-[13px] text-ink outline-none placeholder:text-muted/70"
            />
            {draft.trim() && (
              <button
                type="button"
                onClick={submit}
                className="rounded-lg bg-accent px-2 py-1 text-[11.5px] font-medium text-white"
              >
                Add
              </button>
            )}
          </div>

          <ul className="mt-3 flex flex-col gap-1">
            {selectedTasks.map((t) => {
              const l = listOf(t.listId);
              return (
                <li
                  key={t.id}
                  className="group flex items-start gap-2 rounded-xl px-1.5 py-1.5 transition hover:bg-surface2/60"
                >
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={t.done}
                    aria-label={t.done ? `Mark "${t.title}" as not done` : `Complete "${t.title}"`}
                    onClick={() => onToggle(t.id)}
                    className={[
                      "mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-2 transition",
                      t.done ? "border-accent bg-accent text-white" : "border-line text-transparent hover:border-accent",
                    ].join(" ")}
                  >
                    <Icon name="check" className="h-2.5 w-2.5" strokeWidth={3.4} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className={`truncate text-[13px] leading-snug ${t.done ? "text-muted line-through" : "text-ink"}`}>
                      {t.title}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-muted">
                      {l && (
                        <>
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: l.color }} />
                          {l.name}
                        </>
                      )}
                      {t.priority === 2 && <span className="text-danger">· High</span>}
                      {t.priority === 1 && <span className="text-amber-500">· Medium</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDelete(t.id)}
                    aria-label={`Delete "${t.title}"`}
                    className="mt-0.5 rounded-md p-1 text-muted/50 transition hover:bg-danger/12 hover:text-danger sm:opacity-0 sm:group-hover:opacity-100"
                  >
                    <Icon name="trash" className="h-3.5 w-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>

          {selectedTasks.length === 0 && (
            <div className="mt-4 grid place-items-center rounded-xl border border-dashed border-line px-3 py-6 text-center">
              <Icon name="calendar" className="h-5 w-5 text-muted/60" />
              <p className="mt-2 text-[12px] text-muted">Free day. Add something only if it matters.</p>
            </div>
          )}

          <div className="mt-3 hidden text-[10.5px] text-muted/70 lg:block">
            Tasks appear here when they have a due date.
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-surface/80 p-3 backdrop-blur sm:p-4">
          <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted/80">
            {MONTHS[cursor.month]} at a glance
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-line bg-surface2/50 px-2.5 py-2">
              <div className="text-[10.5px] text-muted">Scheduled</div>
              <div className="text-[16px] font-semibold tabular-nums">{monthTasks.length}</div>
            </div>
            <div className="rounded-xl border border-line bg-surface2/50 px-2.5 py-2">
              <div className="text-[10.5px] text-muted">Done</div>
              <div className="text-[16px] font-semibold tabular-nums text-success">{monthDone}</div>
            </div>
            <div className="rounded-xl border border-line bg-surface2/50 px-2.5 py-2">
              <div className="text-[10.5px] text-muted">Late</div>
              <div className={`text-[16px] font-semibold tabular-nums ${monthLate ? "text-danger" : ""}`}>{monthLate}</div>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between rounded-xl border border-line bg-surface2/50 px-2.5 py-2">
            <span className="text-[10.5px] text-muted">Busiest day</span>
            <span className="text-[11.5px] font-medium">
              {busiest.count > 0 ? `${label(busiest.key).split(" · ").pop()} · ${busiest.count}` : "—"}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-surface/80 p-3 backdrop-blur sm:p-4">
          <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted/80">
            Coming up
          </div>
          {upcoming.length === 0 ? (
            <p className="mt-2.5 text-[12px] leading-relaxed text-muted">
              Nothing scheduled in the next 10 days.
            </p>
          ) : (
            <div className="mt-2.5 flex flex-col gap-2.5">
              {upcoming.map(({ key, items }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setSelected(key);
                    setCursor({ year: fromKey(key).getFullYear(), month: fromKey(key).getMonth() });
                  }}
                  className="group text-left"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[11.5px] font-medium text-ink group-hover:text-accent">
                      {label(key)}
                    </span>
                    <span className="text-[10.5px] tabular-nums text-muted">{items.length}</span>
                  </div>
                  <div className="mt-0.5 flex flex-col">
                    {items.slice(0, 2).map((t) => (
                      <span key={t.id} className="truncate text-[11.5px] leading-5 text-muted">
                        {t.done && <Icon name="check" className="mr-1 inline h-2.5 w-2.5" />}
                        {t.title}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        </div>
        )}
      </div>
    </div>
  );
}
