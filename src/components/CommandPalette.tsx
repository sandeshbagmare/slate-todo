import { useEffect, useMemo, useRef, useState } from "react";
import type { Task, TaskList, ViewId } from "../types";
import { Icon } from "./Icons";
import type { IconName } from "./Icons";

interface Item {
  id: string;
  label: string;
  hint?: string;
  icon: IconName;
  run: () => void;
}

export function CommandPalette({
  open,
  onClose,
  tasks,
  lists,
  onGo,
  onComplete,
  onNewTask,
  onToggleTheme,
  onExport,
  onImport,
  onOpenShortcuts,
}: {
  open: boolean;
  onClose: () => void;
  tasks: Task[];
  lists: TaskList[];
  onGo: (view: ViewId) => void;
  onComplete: (id: string) => void;
  onNewTask: () => void;
  onToggleTheme: () => void;
  onExport: () => void;
  onImport: () => void;
  onOpenShortcuts: () => void;
}) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(t);
  }, [open]);

  const commands: Item[] = useMemo(
    () => [
      { id: "cmd-new", label: "New task", hint: "N", icon: "plus", run: onNewTask },
      { id: "cmd-cal", label: "Go to Calendar", icon: "calendar", run: () => onGo("calendar") },
      { id: "cmd-today", label: "Go to Today", icon: "target", run: () => onGo("today") },
      { id: "cmd-review", label: "Open weekly review", icon: "sparkle", run: () => onGo("review") },
      { id: "cmd-myday", label: "Go to My Day", icon: "star", run: () => onGo("myday") },
      { id: "cmd-up", label: "Go to Upcoming", icon: "clock", run: () => onGo("upcoming") },
      { id: "cmd-stats", label: "Go to Stats & streaks", icon: "chart", run: () => onGo("stats") },
      { id: "cmd-all", label: "Go to All tasks", icon: "layers", run: () => onGo("all") },
      { id: "cmd-theme", label: "Toggle theme", icon: "moon", run: onToggleTheme },
      { id: "cmd-export", label: "Export data as JSON", icon: "download", run: onExport },
      { id: "cmd-import", label: "Import data from JSON", icon: "upload", run: onImport },
      { id: "cmd-keys", label: "Keyboard shortcuts", hint: "?", icon: "keyboard", run: onOpenShortcuts },
    ],
    [onGo, onNewTask, onToggleTheme, onExport, onImport, onOpenShortcuts],
  );

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const match = (s: string) => !needle || s.toLowerCase().includes(needle);
    const cmds = commands.filter((c) => match(c.label));
    const rows = tasks
      .filter((t) => !t.done && match(t.title))
      .slice(0, 6)
      .map<Item>((t) => ({
        id: `task-${t.id}`,
        label: t.title,
        hint: lists.find((l) => l.id === t.listId)?.name,
        icon: "check",
        run: () => onComplete(t.id),
      }));
    return [...cmds, ...rows];
  }, [q, commands, tasks, lists, onComplete]);

  if (!open) return null;

  const activeIndex = Math.min(active, Math.max(0, results.length - 1));

  const commit = (item: Item | undefined) => {
    if (!item) return;
    item.run();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/55 px-4 pt-[12vh] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[520px] overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
        <div className="flex items-center gap-2 border-b border-line px-3.5 py-3">
          <Icon name="search" className="h-4 w-4 text-muted" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                onClose();
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => (i + 1) % Math.max(1, results.length));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => (i - 1 + results.length) % Math.max(1, results.length));
              } else if (e.key === "Enter") {
                e.preventDefault();
                commit(results[activeIndex]);
              }
            }}
            placeholder="Search tasks, jump somewhere, run an action…"
            className="w-full bg-transparent text-[13.5px] outline-none placeholder:text-muted/70"
            aria-label="Command palette input"
          />
          <kbd className="rounded-md border border-line px-1.5 py-0.5 text-[10px] text-muted">esc</kbd>
        </div>

        <div className="max-h-[46vh] overflow-y-auto p-1.5 thin-scroll">
          {results.length === 0 && (
            <p className="px-3 py-6 text-center text-[12.5px] text-muted">Nothing matches “{q}”.</p>
          )}
          {results.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onMouseEnter={() => setActive(i)}
              onClick={() => commit(item)}
              className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] transition-colors ${
                i === activeIndex ? "bg-accent/12 text-ink" : "text-muted hover:bg-surface2 hover:text-ink"
              }`}
            >
              <Icon name={item.icon} className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
              {item.hint && <span className="ml-auto shrink-0 text-[11px] text-muted/80">{item.hint}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
