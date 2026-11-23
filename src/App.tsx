import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Priority, SortKey, StatusFilter, Task, TaskList, Theme, ViewId } from "./types";
import { INBOX, STARTER_LISTS, starterTasks } from "./lib/seed";
import { load, save, uid } from "./lib/storage";
import { Sidebar } from "./components/Sidebar";
import type { Counts } from "./components/Sidebar";
import { Composer } from "./components/Composer";
import type { DraftTask } from "./components/Composer";
import { TaskRow } from "./components/TaskRow";
import { FocusPanel, ProgressStrip } from "./components/FocusPanel";
import { ShortcutsModal, Toast } from "./components/Overlays";
import type { ToastData } from "./components/Overlays";
import { FilterChips, SearchBox, SortSelect } from "./components/Toolbar";
import { Icon } from "./components/Icons";
import { Capacitor } from "@capacitor/core";
import { App as NativeApp } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import { CalendarView } from "./components/CalendarView";
import { MobileTabs } from "./components/MobileTabs";
import { StatsView } from "./components/StatsView";
import { FocusTimer } from "./components/FocusTimer";
import { CommandPalette } from "./components/CommandPalette";
import { emptyStreak, recordCompletion, repairStreak, summarize } from "./lib/streak";
import type { StreakState } from "./lib/streak";
import { nextDue, RECURRENCE_META } from "./lib/recurrence";
import { formatDue, longToday, todayKey } from "./lib/date";

const LIST_COLORS = ["#8b7bff", "#22d3ee", "#34d399", "#ff8a4c", "#f472b6", "#facc15"];

const byDue = (a: Task, b: Task) =>
  (a.due ?? "9999-12-31").localeCompare(b.due ?? "9999-12-31");

const formatShort = formatDue;

function sortTasks(list: Task[], sort: SortKey, doneLast: boolean): Task[] {
  const arr = [...list];
  if (sort === "due") arr.sort((a, b) => byDue(a, b) || b.priority - a.priority);
  else if (sort === "priority") arr.sort((a, b) => b.priority - a.priority || byDue(a, b));
  else if (sort === "created") arr.sort((a, b) => b.createdAt - a.createdAt);

  if (!doneLast) {
    return arr.sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
  }
  return [...arr.filter((t) => !t.done), ...arr.filter((t) => t.done)];
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(() => load<Theme>("slate.theme", "dark"));
  const [lists, setLists] = useState<TaskList[]>(() => load<TaskList[]>("slate.lists", STARTER_LISTS));
  const [tasks, setTasks] = useState<Task[]>(() => load<Task[]>("slate.tasks", starterTasks()));
  const [view, setView] = useState<ViewId>(() => load<ViewId>("slate.view", "calendar"));
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortKey>(() => load<SortKey>("slate.sort", "manual"));
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<ToastData | null>(null);
  const [shortcuts, setShortcuts] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropId, setDropId] = useState<string | null>(null);
  const [streak, setStreak] = useState<StreakState>(() => load<StreakState>("slate.streak", emptyStreak));
  const [palette, setPalette] = useState(false);

  const composerRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const undoRef = useRef<(() => void) | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  /* ---------- persistence ---------- */
  useEffect(() => save("slate.tasks", tasks), [tasks]);
  useEffect(() => save("slate.lists", lists), [lists]);
  useEffect(() => save("slate.theme", theme), [theme]);
  useEffect(() => save("slate.view", view), [view]);
  useEffect(() => save("slate.sort", sort), [sort]);
  useEffect(() => save("slate.streak", streak), [streak]);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  /* ---------- derived data ---------- */
  const scoped = useMemo(() => {
    const today = todayKey();
    let out = tasks;
    if (view === "today") out = tasks.filter((t) => t.due !== null && t.due <= today);
    else if (view === "upcoming") out = tasks.filter((t) => t.due !== null && t.due > today);
    else if (view === "completed") out = tasks.filter((t) => t.done);
    else if (view !== "all") out = tasks.filter((t) => t.listId === view.slice(5));
    return out;
  }, [tasks, view]);

  const visible = useMemo(() => {
    let out = scoped;
    if (view === "all" || view.startsWith("list:")) {
      if (status === "active") out = out.filter((t) => !t.done);
      if (status === "done") out = out.filter((t) => t.done);
    }
    const q = query.trim().toLowerCase();
    if (q) out = out.filter((t) => t.title.toLowerCase().includes(q) || (t.notes ?? "").toLowerCase().includes(q));
    return sortTasks(out, sort, view !== "completed");
  }, [scoped, status, query, sort, view]);

  const counts: Counts = useMemo(() => {
    const today = todayKey();
    const open = tasks.filter((t) => !t.done);
    const byList: Record<string, number> = {};
    for (const l of lists) byList[l.id] = open.filter((t) => t.listId === l.id).length;
    return {
      today: open.filter((t) => t.due !== null && t.due <= today).length,
      upcoming: open.filter((t) => t.due !== null && t.due > today).length,
      all: open.length,
      completed: tasks.filter((t) => t.done).length,
      byList,
    };
  }, [tasks, lists]);

  const statusCounts = useMemo(
    () => ({
      all: scoped.length,
      active: scoped.filter((t) => !t.done).length,
      done: scoped.filter((t) => t.done).length,
    }),
    [scoped],
  );

  const activeList = lists.find((l) => `list:${l.id}` === view);
  const isCalendar = view === "calendar";
  const isStats = view === "stats";
  const streakSummary = summarize(streak);
  const scheduled = tasks.filter((t) => t.due !== null).length;
  const title =
    view === "calendar" ? "Calendar"
    : view === "today" ? "Today"
    : view === "upcoming" ? "Upcoming"
    : view === "stats" ? "Stats & streaks"
    : view === "all" ? "All tasks"
    : view === "completed" ? "Completed"
    : activeList?.name ?? "Tasks";

  const defaultListId = activeList?.id ?? (view === "today" ? INBOX : lists[0]?.id ?? INBOX);

  /* ---------- task actions ---------- */
  const pushToast = useCallback((message: string, action?: { label: string; run: () => void }) => {
    undoRef.current = action?.run ?? null;
    setToast({ id: Date.now(), message, actionLabel: action?.label, onAction: action?.run });
  }, []);

  const addTask = (draft: DraftTask) => {
    const task: Task = {
      id: uid(),
      title: draft.title,
      notes: draft.notes,
      done: false,
      priority: draft.priority,
      due: draft.due,
      listId: draft.listId,
      createdAt: Date.now(),
      completedAt: null,
      recurrence: draft.recurrence ?? "none",
    };
    setTasks((prev) => [task, ...prev]);

    const today = todayKey();
    const visibleHere =
      view === "all" || view === "calendar"
        ? true
        : view === "today"
          ? task.due !== null && task.due <= today
          : view === "upcoming"
            ? task.due !== null && task.due > today
            : view === "completed"
              ? false
              : task.listId === view.slice(5);

    if (visibleHere) {
      setToast({ id: Date.now(), message: "Task added" });
    } else {
      const listName = lists.find((l) => l.id === task.listId)?.name ?? "Inbox";
      pushToast(`Added to ${listName}`, {
        label: "View",
        run: () => setView(`list:${task.listId}` as ViewId),
      });
    }
  };

  const toggleTask = (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    if (task.done) {
      // un-completing also removes the occurrence it spawned
      setTasks((prev) =>
        prev
          .filter((t) => t.spawnedFrom !== task.id)
          .map((t) => (t.id === id ? { ...t, done: false, completedAt: null } : t)),
      );
      return;
    }

    const repeats = !!task.recurrence && task.recurrence !== "none";
    const upcoming = repeats && task.due ? nextDue(task.due, task.recurrence!) : null;

    setTasks((prev) => {
      const next = prev.map((t) =>
        t.id === id ? { ...t, done: true, completedAt: Date.now() } : t,
      );
      if (repeats && upcoming) {
        next.unshift({
          ...task,
          id: uid(),
          due: upcoming,
          done: false,
          completedAt: null,
          createdAt: Date.now(),
          spawnedFrom: task.id,
        });
      }
      return next;
    });

    if (repeats && upcoming && streak.enabled) {
      setStreak((s) => recordCompletion(s));
      pushToast(`${RECURRENCE_META[task.recurrence!].short} · next on ${formatShort(upcoming)}`);
    } else if (streak.enabled) {
      setStreak((s) => recordCompletion(s));
    }
  };

  const renameTask = (id: string, next: string) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, title: next } : t)));

  const cyclePriority = (id: string) =>
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, priority: ((t.priority + 1) % 3) as Priority } : t)),
    );

  const setDue = (id: string, due: string | null) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, due } : t)));

  const moveTask = (id: string, due: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task || task.due === due) return;
    const previous = task.due;
    setDue(id, due);
    pushToast(`Moved to ${formatShort(due)}`, {
      label: "Undo",
      run: () => setDue(id, previous),
    });
  };

  /* ---------- checklist + duplicate ---------- */
  const addStep = (id: string, title: string) =>
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, steps: [...(t.steps ?? []), { id: uid(), title, done: false }] } : t,
      ),
    );

  const toggleStep = (id: string, stepId: string) =>
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              steps: (t.steps ?? []).map((s) => (s.id === stepId ? { ...s, done: !s.done } : s)),
            }
          : t,
      ),
    );

  const deleteStep = (id: string, stepId: string) =>
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, steps: (t.steps ?? []).filter((s) => s.id !== stepId) } : t,
      ),
    );

  const duplicateTask = (id: string) => {
    const source = tasks.find((t) => t.id === id);
    if (!source) return;
    const copy: Task = {
      ...source,
      id: uid(),
      done: false,
      completedAt: null,
      createdAt: Date.now(),
      spawnedFrom: undefined,
      steps: source.steps?.map((s) => ({ ...s, id: uid(), done: false })),
    };
    setTasks((prev) => [copy, ...prev]);
    pushToast(`Duplicated “${source.title}”`);
  };

  const deleteTask = (id: string) => {
    const snapshot = tasks;
    const victim = tasks.find((t) => t.id === id);
    if (!victim) return;
    setTasks((prev) => prev.filter((t) => t.id !== id));
    pushToast("Task deleted", { label: "Undo", run: () => setTasks(snapshot) });
  };

  const clearCompleted = () => {
    const snapshot = tasks;
    const count = tasks.filter((t) => t.done).length;
    if (!count) return;
    setTasks((prev) => prev.filter((t) => !t.done));
    pushToast(`${count} completed ${count === 1 ? "task" : "tasks"} cleared`, {
      label: "Undo",
      run: () => setTasks(snapshot),
    });
  };

  /* ---------- data portability ---------- */
  const exportData = () => {
    const payload = { version: 1, exportedAt: new Date().toISOString(), tasks, lists, streak };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `slate-backup-${todayKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast("Backup downloaded");
  };

  const importData = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as {
          tasks?: Task[];
          lists?: TaskList[];
          streak?: StreakState;
        };
        if (!Array.isArray(parsed.tasks) || !Array.isArray(parsed.lists)) {
          throw new Error("shape");
        }
        const before = { tasks, lists, streak };
        setTasks(parsed.tasks);
        setLists(parsed.lists);
        if (parsed.streak) setStreak(parsed.streak);
        pushToast(`Imported ${parsed.tasks.length} tasks`, {
          label: "Undo",
          run: () => {
            setTasks(before.tasks);
            setLists(before.lists);
            setStreak(before.streak);
          },
        });
      } catch {
        pushToast("That file is not a Slate backup");
      }
    };
    reader.readAsText(file);
  };

  /* ---------- list actions ---------- */
  const addList = (name: string) => {
    const list: TaskList = {
      id: uid(),
      name,
      color: LIST_COLORS[lists.length % LIST_COLORS.length],
    };
    setLists((prev) => [...prev, list]);
    setView(`list:${list.id}` as ViewId);
    setToast({ id: Date.now(), message: `List “${name}” created` });
  };

  const renameList = (id: string, name: string) =>
    setLists((prev) => prev.map((l) => (l.id === id ? { ...l, name } : l)));

  const deleteList = (id: string) => {
    if (id === INBOX) return;
    const listSnap = lists;
    const taskSnap = tasks;
    setLists((prev) => prev.filter((l) => l.id !== id));
    setTasks((prev) => prev.map((t) => (t.listId === id ? { ...t, listId: INBOX } : t)));
    if (view === `list:${id}`) setView("all");
    pushToast("List deleted — its tasks moved to Inbox", {
      label: "Undo",
      run: () => {
        setLists(listSnap);
        setTasks(taskSnap);
      },
    });
  };

  /* ---------- drag & drop ---------- */
  const drop = (targetId: string) => {
    if (draggingId && draggingId !== targetId) {
      setTasks((prev) => {
        const from = prev.findIndex((t) => t.id === draggingId);
        const to = prev.findIndex((t) => t.id === targetId);
        if (from < 0 || to < 0) return prev;
        const next = [...prev];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        return next;
      });
    }
    setDraggingId(null);
    setDropId(null);
  };

  /* ---------- native shell (Android) ---------- */
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    StatusBar.setStyle({ style: theme === "dark" ? Style.Dark : Style.Light }).catch(() => {});
  }, [theme]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let unsub: (() => void) | undefined;
    NativeApp.addListener("backButton", () => {
      if (sidebarOpen) return setSidebarOpen(false);
      if (shortcuts) return setShortcuts(false);
      if (toast) return setToast(null);
      NativeApp.exitApp();
    }).then((h) => {
      unsub = () => {
        void h.remove();
      };
    });
    return () => unsub?.();
  }, [sidebarOpen, shortcuts, toast]);

  /* ---------- shortcuts ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing =
        !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);

      if (e.key === "Escape") {
        setQuery("");
        setShortcuts(false);
        setSidebarOpen(false);
        setPalette(false);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((v) => !v);
        return;
      }
      if (!typing && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undoRef.current?.();
        return;
      }
      if (typing) return;

      if (e.key === "n") {
        e.preventDefault();
        composerRef.current?.focus();
      } else if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === "?") {
        e.preventDefault();
        setShortcuts((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ---------- empty state copy ---------- */
  const q = query.trim();
  const empty = q
    ? { title: "No matches", body: `Nothing matches “${q}”. Try another word, or clear the search.`, cta: "Clear search" }
    : view === "completed"
      ? { title: "Nothing completed yet", body: "Tick something off and it will land here, with the time it was finished." }
      : view === "today"
        ? { title: "Today is clear", body: "No tasks due today. Add one below, or pull something forward from Upcoming." }
        : view === "upcoming"
          ? { title: "Nothing scheduled", body: "Give a task a due date and it will show up here automatically." }
          : { title: "No tasks here yet", body: "Add your first task — press N anywhere to jump to the composer." };

  const openRowForList = (id: string) => lists.find((l) => l.id === id);
  const showListBadge = view === "today" || view === "upcoming" || view === "all" || view === "completed";
  const showFilters = view === "all" || view.startsWith("list:");
  const hideTaskChrome = isCalendar || isStats;

  return (
    <div className="relative min-h-screen text-ink">
      <div className="aurora" aria-hidden="true" />

      <div className="relative z-10 mx-auto flex w-full max-w-[1360px] gap-6 px-3 sm:px-5 lg:gap-8 lg:px-6">
        <Sidebar
          lists={lists}
          counts={counts}
          view={view}
          onSelect={setView}
          theme={theme}
          onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
          onAddList={addList}
          onRenameList={renameList}
          onDeleteList={deleteList}
          onOpenShortcuts={() => setShortcuts(true)}
          streakDays={streakSummary.current}
          onOpenPalette={() => setPalette(true)}
          onExport={exportData}
          onImport={() => importRef.current?.click()}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="min-w-0 flex-1 pt-4 pb-36 sm:pt-6 lg:pb-16">
          {/* mobile bar */}
          <div className="mb-3 flex items-center gap-2 lg:hidden">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-xl border border-line bg-surface/70 p-2 text-ink"
              aria-label="Open menu"
            >
              <Icon name="menu" className="h-4 w-4" />
            </button>
            <span className="flex items-center gap-2 text-[14px] font-semibold tracking-tight">
              <span className="grid h-6 w-6 place-items-center rounded-lg bg-gradient-to-br from-accent to-cyan-400 text-white">
                <Icon name="check" className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
              Slate
            </span>
            <button
              type="button"
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              className="ml-auto rounded-xl border border-line bg-surface/70 p-2 text-muted transition hover:text-ink"
              aria-label="Toggle theme"
            >
              <Icon name={theme === "dark" ? "sun" : "moon"} className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setShortcuts(true)}
              className="rounded-xl border border-line bg-surface/70 p-2 text-muted transition hover:text-ink sm:hidden"
              aria-label="Keyboard shortcuts"
            >
              <Icon name="keyboard" className="h-4 w-4" />
            </button>
          </div>

          {/* header */}
          <header className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[12px] text-muted">
                <span>{longToday()}</span>
                <span className="hidden text-muted/40 sm:inline">·</span>
                <span className="hidden tabular-nums sm:inline">{counts.today} due today</span>
                <span className="text-muted/40">·</span>
                <span className="tabular-nums">
                  {isCalendar
                    ? `${scheduled} scheduled`
                    : isStats
                      ? `${streakSummary.current} day streak`
                      : `${counts.all} open`}
                </span>
              </div>
              <h1 className="mt-1 flex items-center gap-2.5 text-[26px] font-semibold tracking-[-0.03em] sm:text-[30px]">
                {title}
                <span className="rounded-lg border border-line px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-muted">
                  {isStats ? streakSummary.activeDays : visible.length}
                </span>
              </h1>
            </div>

            {!hideTaskChrome && (
            <div className="flex items-center gap-2">
              <SearchBox query={query} onQuery={setQuery} inputRef={searchRef} className="hidden w-[210px] sm:block" />
              <button
                type="button"
                onClick={() => composerRef.current?.focus()}
                className="btn-shine relative hidden items-center gap-1.5 overflow-hidden rounded-xl bg-accent px-3 py-2 text-[13px] font-medium text-white shadow-sm shadow-accent/20 transition hover:brightness-110 sm:flex"
              >
                <Icon name="plus" className="h-4 w-4" />
                New task
              </button>
            </div>
            )}
          </header>

          {!hideTaskChrome && (
          <div className="mt-3 sm:hidden">
            <SearchBox query={query} onQuery={setQuery} inputRef={searchRef} />
          </div>
          )}

          {isStats ? (
            <StatsView
              tasks={tasks}
              lists={lists}
              streak={streak}
              onToggleStreak={() => setStreak((s) => ({ ...s, enabled: !s.enabled }))}
              onRepair={() => {
                setStreak((s) => repairStreak(s));
                pushToast("Freeze used — yesterday is patched");
              }}
              onSetGoal={(goal) => setStreak((s) => ({ ...s, goal }))}
            />
          ) : isCalendar ? (
            <CalendarView
              tasks={tasks}
              lists={lists}
              onToggle={toggleTask}
              onDelete={deleteTask}
              onAdd={(title, due, listId) => addTask({ title, notes: undefined, priority: 0, due, listId })}
              onMove={moveTask}
            />
          ) : (
          <>

          <div className="mt-3">
            <ProgressStrip tasks={tasks} />
          </div>

          <div className="mt-4">
            <Composer lists={lists} defaultListId={defaultListId} onAdd={addTask} inputRef={composerRef} />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            {showFilters ? (
              <FilterChips status={status} counts={statusCounts} onChange={setStatus} />
            ) : (
              <span className="text-[12px] text-muted">
                {view === "today" ? "Due today and overdue" : view === "upcoming" ? "Next 7 days and beyond" : "Everything you've finished"}
              </span>
            )}
            <div className="flex items-center gap-2">
              <span className="hidden text-[12px] text-muted sm:block">Sort</span>
              <SortSelect sort={sort} onChange={setSort} />
            </div>
          </div>

          {/* task list */}
          {visible.length > 0 ? (
            <ul className="stagger mt-3 flex flex-col gap-2" aria-label="Tasks">
              {visible.map((task, i) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  list={openRowForList(task.listId)}
                  index={i}
                  showList={showListBadge}
                  draggable={sort === "manual"}
                  dragging={draggingId === task.id}
                  dropTarget={dropId === task.id && draggingId !== task.id}
                  onToggle={toggleTask}
                  onRename={renameTask}
                  onDelete={deleteTask}
                  onCyclePriority={cyclePriority}
                  onSetDue={setDue}
                  onAddStep={addStep}
                  onToggleStep={toggleStep}
                  onDeleteStep={deleteStep}
                  onDuplicate={duplicateTask}
                  onDragStart={setDraggingId}
                  onDragOver={(id) => setDropId((prev) => (prev === id ? prev : id))}
                  onDrop={drop}
                  onDragEnd={() => {
                    setDraggingId(null);
                    setDropId(null);
                  }}
                />
              ))}
            </ul>
          ) : (
            <div className="mt-4 grid place-items-center rounded-2xl border border-dashed border-line bg-surface/40 px-6 py-14 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent/12 text-accent">
                <Icon name={q ? "search" : "sparkle"} className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-[15px] font-semibold tracking-tight">{empty.title}</h2>
              <p className="mt-1 max-w-[42ch] text-[13px] leading-relaxed text-muted">{empty.body}</p>
              <button
                type="button"
                onClick={() => {
                  if (q) setQuery("");
                  else composerRef.current?.focus();
                }}
                className="mt-4 rounded-xl border border-line bg-surface px-3 py-1.5 text-[12.5px] font-medium text-ink transition hover:border-accent/40 hover:text-accent"
              >
                {q ? "Clear search" : "Add a task"}
              </button>
            </div>
          )}

          {/* footer */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-[12px] text-muted">
            <span className="tabular-nums">
              {counts.completed} of {tasks.length} completed
              {counts.today > 0 && <span className="ml-2 text-muted/60">· {counts.today} due today</span>}
            </span>
            <div className="flex items-center gap-2">
              <span className="hidden items-center gap-1.5 sm:flex">
                <Icon name="grip" className="h-3.5 w-3.5" />
                drag rows to reorder
              </span>
              {counts.completed > 0 && (
                <button
                  type="button"
                  onClick={clearCompleted}
                  className="rounded-lg border border-line px-2 py-1 transition hover:border-danger/40 hover:text-danger"
                >
                  Clear completed
                </button>
              )}
            </div>
          </div>
          </>
          )}
        </main>

        {!hideTaskChrome && (
          <div className="hidden w-[292px] shrink-0 flex-col gap-4 pt-4 sm:pt-6 xl:flex">
            <FocusTimer tasks={tasks} onComplete={toggleTask} onToast={pushToast} />
            <FocusPanel tasks={tasks} />
          </div>
        )}
      </div>

      <MobileTabs
        view={view}
        listsActive={view.startsWith("list:") || sidebarOpen}
        onSelect={setView}
        onOpenLists={() => setSidebarOpen(true)}
      />
      {palette && (
        <CommandPalette
          open={palette}
        onClose={() => setPalette(false)}
        tasks={tasks}
        lists={lists}
        onGo={setView}
        onComplete={toggleTask}
        onNewTask={() => {
          setView("all");
          window.setTimeout(() => composerRef.current?.focus(), 60);
        }}
        onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        onExport={exportData}
        onImport={() => importRef.current?.click()}
          onOpenShortcuts={() => setShortcuts(true)}
        />
      )}
      <input
        ref={importRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        aria-label="Import Slate backup"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) importData(file);
          e.target.value = "";
        }}
      />
      <Toast data={toast} onClose={() => setToast(null)} />
      <ShortcutsModal open={shortcuts} onClose={() => setShortcuts(false)} />
    </div>
  );
}
