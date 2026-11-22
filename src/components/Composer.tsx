import { useState } from "react";
import type { RefObject } from "react";
import type { Priority, TaskList } from "../types";
import { PRIORITY_META } from "../types";
import { formatDue } from "../lib/date";
import { Icon } from "./Icons";

export interface DraftTask {
  title: string;
  notes?: string;
  priority: Priority;
  due: string | null;
  listId: string;
}

const PRIORITY_STYLE: Record<Priority, string> = {
  0: "text-muted border-line hover:border-muted/40",
  1: "text-amber-500 border-amber-500/30 bg-amber-500/10 hover:border-amber-500/50",
  2: "text-danger border-danger/30 bg-danger/10 hover:border-danger/50",
};

export function Composer({
  lists,
  defaultListId,
  onAdd,
  inputRef,
}: {
  lists: TaskList[];
  defaultListId: string;
  onAdd: (draft: DraftTask) => void;
  inputRef: RefObject<HTMLInputElement | null>;
}) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [notesOpen, setNotesOpen] = useState(false);
  const [priority, setPriority] = useState<Priority>(0);
  const [due, setDue] = useState<string | null>(null);
  const [listId, setListId] = useState(defaultListId);
  const [lastDefault, setLastDefault] = useState(defaultListId);

  // follow the list you are currently looking at (adjust during render, no effect)
  if (lastDefault !== defaultListId) {
    setLastDefault(defaultListId);
    setListId(defaultListId);
  }

  const canSubmit = title.trim().length > 0;

  const submit = () => {
    if (!canSubmit) return;
    onAdd({
      title: title.trim(),
      notes: notes.trim() || undefined,
      priority,
      due,
      listId,
    });
    setTitle("");
    setNotes("");
    setNotesOpen(false);
    setPriority(0);
    setDue(null);
  };

  const chip =
    "inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[12px] transition-colors";

  return (
    <div className="rounded-2xl border border-line bg-surface/90 shadow-[var(--shadow)] backdrop-blur transition-colors focus-within:border-accent/45 focus-within:shadow-accent/10">
      <div className="flex items-center gap-2 px-2.5 py-2">
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent/12 text-accent transition hover:bg-accent/20 disabled:opacity-40"
          aria-label="Add task"
        >
          <Icon name="plus" className="h-[17px] w-[17px]" />
        </button>

        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
            if (e.key === "Escape") {
              setTitle("");
              e.currentTarget.blur();
            }
          }}
          placeholder="Add a task… press N anytime"
          aria-label="New task title"
          className="min-w-0 flex-1 bg-transparent py-1 text-[15px] text-ink outline-none placeholder:text-muted/70"
        />

        <button
          type="button"
          onClick={submit}
          className="hidden items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[13px] font-medium text-white shadow-sm transition hover:brightness-110 disabled:opacity-40 sm:flex"
          disabled={!canSubmit}
        >
          Add
          <kbd className="rounded bg-white/20 px-1 text-[10px] font-normal">↵</kbd>
        </button>
      </div>

      {(notesOpen || title.length > 0) && (
        <div className="animate-fade border-t border-line px-3 py-2">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                submit();
              }
            }}
            rows={2}
            placeholder="Notes (optional) — ⌘↵ to save"
            aria-label="Task notes"
            className="w-full resize-none bg-transparent text-[13px] leading-relaxed text-ink/90 outline-none placeholder:text-muted/60"
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5 border-t border-line px-2.5 py-2">
        <button
          type="button"
          onClick={() => setPriority((p) => ((p + 1) % 3) as Priority)}
          className={`${chip} ${PRIORITY_STYLE[priority]}`}
          aria-label="Cycle priority"
          title="Priority — click to cycle"
        >
          <Icon name="flag" className="h-3.5 w-3.5" />
          {PRIORITY_META[priority].label}
        </button>

        <label className={`${chip} relative cursor-pointer ${due ? "border-accent/30 bg-accent/10 text-accent" : "border-line text-muted hover:border-muted/40"}`}>
          <Icon name="calendar" className="h-3.5 w-3.5" />
          {due ? formatDue(due) : "Due date"}
          <input
            type="date"
            value={due ?? ""}
            onChange={(e) => setDue(e.target.value || null)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label="Set due date"
          />
        </label>

        {due && (
          <button
            type="button"
            onClick={() => setDue(null)}
            className="rounded-md p-1 text-muted transition hover:bg-surface2 hover:text-ink"
            aria-label="Clear due date"
          >
            <Icon name="x" className="h-3.5 w-3.5" />
          </button>
        )}

        <div className="relative">
          <select
            value={listId}
            onChange={(e) => setListId(e.target.value)}
            aria-label="List"
            className={`${chip} appearance-none border-line pr-6 text-muted hover:border-muted/40`}
          >
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <Icon
            name="chevronDown"
            className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted"
          />
        </div>

        <button
          type="button"
          onClick={() => setNotesOpen((v) => !v)}
          className={`${chip} border-line text-muted hover:border-muted/40 ${notesOpen ? "bg-surface2 text-ink" : ""}`}
          aria-pressed={notesOpen}
        >
          <Icon name="note" className="h-3.5 w-3.5" />
          Note
        </button>
      </div>
    </div>
  );
}
