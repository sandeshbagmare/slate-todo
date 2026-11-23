import { useEffect, useRef, useState } from "react";
import type { Task, TaskList } from "../types";
import { PRIORITY_META } from "../types";
import { RECURRENCE_META } from "../lib/recurrence";
import { dueTone, formatDue, fromKey, todayKey } from "../lib/date";
import { Icon } from "./Icons";

const hhmm = (ms: number): string => {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

interface TaskRowProps {
  task: Task;
  list?: TaskList;
  index: number;
  showList: boolean;
  draggable: boolean;
  dragging: boolean;
  dropTarget: boolean;
  onToggle: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onCyclePriority: (id: string) => void;
  onSetDue: (id: string, due: string | null) => void;
  onSetReminder: (id: string, at: number | null) => void;
  onToggleMyDay: (id: string) => void;
  onAddStep: (id: string, title: string) => void;
  onToggleStep: (id: string, stepId: string) => void;
  onDeleteStep: (id: string, stepId: string) => void;
  onDuplicate: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragOver: (id: string) => void;
  onDrop: (id: string) => void;
  onDragEnd: () => void;
}

const toneClass = {
  overdue: "text-danger border-danger/25 bg-danger/10",
  today: "text-accent border-accent/25 bg-accent/10",
  soon: "text-amber-500 border-amber-500/25 bg-amber-500/10",
  later: "text-muted border-line",
} as const;

export function TaskRow({
  task,
  list,
  index,
  showList,
  draggable,
  dragging,
  dropTarget,
  onToggle,
  onRename,
  onDelete,
  onCyclePriority,
  onSetDue,
  onSetReminder,
  onToggleMyDay,
  onAddStep,
  onToggleStep,
  onDeleteStep,
  onDuplicate,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: TaskRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      editRef.current?.focus();
      editRef.current?.select();
    }
  }, [editing]);

  const startEdit = () => {
    setDraft(task.title);
    setEditing(true);
  };

  const commit = () => {
    const next = draft.trim();
    if (next && next !== task.title) onRename(task.id, next);
    setEditing(false);
  };

  const tone = task.due ? dueTone(task.due, task.done) : null;
  const steps = task.steps ?? [];
  const doneSteps = steps.filter((s) => s.done).length;
  const [stepsOpen, setStepsOpen] = useState(false);
  const [stepDraft, setStepDraft] = useState("");

  const submitStep = () => {
    const title = stepDraft.trim();
    if (!title) return;
    onAddStep(task.id, title);
    setStepDraft("");
  };

  return (
    <li
      draggable={draggable && !editing}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", task.id);
        onDragStart(task.id);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        onDragOver(task.id);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(task.id);
      }}
      onDragEnd={onDragEnd}
      style={{ animationDelay: `${Math.min(index, 12) * 32}ms` }}
      className={[
        "group relative flex items-start gap-2.5 rounded-2xl border px-3 py-3.5 transition-all duration-200 sm:gap-3 sm:px-3.5",
        task.done ? "border-line/70 bg-surface/35" : "border-line bg-surface/85 hover:border-accent/30 hover:bg-surface",
        dragging ? "scale-[0.99] opacity-40" : "",
        dropTarget ? "border-accent/70 ring-2 ring-accent/25" : "",
        "animate-rise",
      ].join(" ")}
    >
      {/* drag handle */}
      {draggable && (
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          className="mt-1 hidden cursor-grab text-muted/40 transition hover:text-muted active:cursor-grabbing sm:block"
          onClick={(e) => e.preventDefault()}
        >
          <Icon name="grip" className="h-4 w-4" />
        </button>
      )}

      {/* checkbox */}
      <button
        type="button"
        role="checkbox"
        aria-checked={task.done}
        aria-label={task.done ? `Mark "${task.title}" as not done` : `Complete "${task.title}"`}
        onClick={() => onToggle(task.id)}
        className={[
          "mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border-2 transition-all duration-200",
          task.done
            ? "done border-accent bg-accent text-white"
            : "border-line text-transparent hover:border-accent hover:bg-accent/10",
        ].join(" ")}
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
          <path className="check-path" d="m5 12.5 4.5 4.5L19 6.5" />
        </svg>
      </button>

      {/* content */}
      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            ref={editRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") setEditing(false);
            }}
            className="w-full rounded-lg border border-accent/40 bg-surface2 px-2 py-1 text-[15px] leading-snug text-ink outline-none"
            aria-label="Edit task title"
          />
        ) : (
          <button
            type="button"
            onClick={startEdit}
            className={[
              "block w-full truncate text-left text-[15px] leading-snug tracking-[-0.01em] transition-colors",
              task.done ? "text-muted line-through decoration-muted/50" : "text-ink",
            ].join(" ")}
            title="Click to rename"
          >
            {task.title}
          </button>
        )}

        {task.notes && !editing && (
          <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-muted">{task.notes}</p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {/* steps */}
          <button
            type="button"
            onClick={() => setStepsOpen((v) => !v)}
            aria-expanded={stepsOpen}
            aria-label={`Checklist, ${doneSteps} of ${steps.length} done`}
            className={[
              "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11.5px] transition-colors",
              steps.length
                ? "border-line text-muted hover:border-accent/40 hover:text-accent"
                : "border-transparent text-transparent group-hover:text-muted hover:border-line",
            ].join(" ")}
          >
            <Icon name="checkCircle" className="h-3 w-3" />
            {steps.length ? `${doneSteps}/${steps.length}` : "Steps"}
          </button>

          {/* due */}
          {task.due ? (
            <label
              className={`inline-flex cursor-pointer items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11.5px] transition-colors ${toneClass[tone ?? "later"]}`}
              title="Change due date"
            >
              <Icon name="calendar" className="h-3 w-3" />
              {formatDue(task.due)}
              <input
                type="date"
                value={task.due}
                onChange={(e) => onSetDue(task.id, e.target.value || null)}
                className="absolute h-0 w-0 opacity-0"
                aria-label="Change due date"
              />
            </label>
          ) : (
            <label
              className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-transparent px-1 py-0.5 text-[11.5px] text-transparent transition-colors group-hover:text-muted hover:border-line"
              title="Set due date"
            >
              <Icon name="calendar" className="h-3 w-3" />
              <input
                type="date"
                onChange={(e) => onSetDue(task.id, e.target.value || null)}
                className="absolute h-0 w-0 opacity-0"
                aria-label="Set due date"
              />
            </label>
          )}

          {/* reminder */}
          <label
            className={[
              "inline-flex cursor-pointer items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11.5px] transition-colors",
              task.remindAt
                ? "border-accent/25 bg-accent/10 text-accent"
                : "border-transparent text-transparent group-hover:text-muted hover:border-line",
            ].join(" ")}
            title="Reminder"
          >
            <Icon name="bell" className="h-3 w-3" />
            {task.remindAt
              ? new Date(task.remindAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
              : "Remind"}
            <input
              type="time"
              value={task.remindAt ? hhmm(task.remindAt) : ""}
              onChange={(e) => {
                const v = e.target.value;
                if (!v) {
                  onSetReminder(task.id, null);
                  return;
                }
                const [h, m] = v.split(":").map(Number);
                const base = fromKey(task.due ?? todayKey());
                base.setHours(h, m, 0, 0);
                let at = base.getTime();
                if (at < Date.now()) at += 86_400_000;
                onSetReminder(task.id, at);
              }}
              className="absolute h-0 w-0 opacity-0"
              aria-label="Set reminder time"
            />
          </label>

          {/* priority */}
          <button
            type="button"
            onClick={() => onCyclePriority(task.id)}
            title={`Priority: ${PRIORITY_META[task.priority].label} — click to change`}
            className={[
              "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11.5px] transition-colors",
              task.priority === 2
                ? "border-danger/25 bg-danger/10 text-danger"
                : task.priority === 1
                  ? "border-amber-500/25 bg-amber-500/10 text-amber-500"
                  : "border-transparent text-transparent group-hover:text-muted hover:border-line",
            ].join(" ")}
          >
            <Icon name="flag" className="h-3 w-3" />
            {task.priority > 0 ? PRIORITY_META[task.priority].label : "Priority"}
          </button>

          {/* repeat */}
          {task.recurrence && task.recurrence !== "none" && (
            <span
              className="inline-flex items-center gap-1 rounded-md border border-accent/25 bg-accent/10 px-1.5 py-0.5 text-[11.5px] text-accent"
              title={`Repeats ${RECURRENCE_META[task.recurrence].label.toLowerCase()}`}
            >
              <Icon name="repeat" className="h-3 w-3" />
              {RECURRENCE_META[task.recurrence].short}
            </span>
          )}

          {/* list badge */}
          {showList && list && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-line px-1.5 py-0.5 text-[11.5px] text-muted">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: list.color }} />
              {list.name}
            </span>
          )}

          {task.done && task.completedAt && (
            <span className="inline-flex items-center gap-1 text-[11px] text-success">
              <Icon name="check" className="h-3 w-3" />
              Done
            </span>
          )}
        </div>

        {/* checklist */}
        {stepsOpen && (
          <div className="mt-2.5 rounded-xl border border-line/80 bg-surface2/40 p-2">
            {steps.length > 0 && (
              <ul className="flex flex-col gap-0.5">
                {steps.map((s) => (
                  <li key={s.id} className="group/step flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-surface2/70">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={s.done}
                      aria-label={s.done ? `Reopen step "${s.title}"` : `Finish step "${s.title}"`}
                      onClick={() => onToggleStep(task.id, s.id)}
                      className={[
                        "grid h-[15px] w-[15px] shrink-0 place-items-center rounded-[4px] border transition-colors",
                        s.done
                          ? "border-accent bg-accent text-white"
                          : "border-line text-transparent hover:border-accent",
                      ].join(" ")}
                    >
                      <Icon name="check" className="h-2.5 w-2.5" strokeWidth={3} />
                    </button>
                    <span className={`min-w-0 flex-1 text-[12.5px] ${s.done ? "text-muted line-through" : "text-ink/90"}`}>
                      {s.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDeleteStep(task.id, s.id)}
                      aria-label={`Delete step "${s.title}"`}
                      className="rounded p-0.5 text-muted/0 transition hover:text-danger group-hover/step:text-muted/60"
                    >
                      <Icon name="x" className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-1 flex items-center gap-1.5 px-1">
              <Icon name="plus" className="h-3 w-3 shrink-0 text-muted" />
              <input
                value={stepDraft}
                onChange={(e) => setStepDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submitStep();
                  }
                }}
                placeholder="Add a step and press enter"
                aria-label="Add checklist step"
                className="min-w-0 flex-1 bg-transparent py-0.5 text-[12.5px] text-ink outline-none placeholder:text-muted/60"
              />
            </div>
          </div>
        )}
      </div>

      {/* actions */}
      {/* star — always visible, it is the My Day affordance */}
      <button
        type="button"
        onClick={() => onToggleMyDay(task.id)}
        aria-pressed={Boolean(task.myDay)}
        aria-label={task.myDay ? `Remove "${task.title}" from My Day` : `Add "${task.title}" to My Day`}
        className={[
          "mt-0.5 rounded-lg p-1.5 transition hover:bg-accent/10",
          task.myDay ? "text-accent" : "text-muted/35 hover:text-accent",
        ].join(" ")}
      >
        <Icon name="star" className="h-4 w-4" fill={task.myDay ? "currentColor" : "none"} />
      </button>

      <div className="mt-0.5 flex flex-col gap-0.5 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:focus-within:opacity-100">
        <button
          type="button"
          onClick={() => onDuplicate(task.id)}
          aria-label={`Duplicate "${task.title}"`}
          className="rounded-lg p-1.5 text-muted/50 transition hover:bg-surface2 hover:text-ink"
        >
          <Icon name="copy" className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(task.id)}
          aria-label={`Delete "${task.title}"`}
          className="rounded-lg p-1.5 text-muted/50 transition hover:bg-danger/12 hover:text-danger"
        >
          <Icon name="trash" className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}
