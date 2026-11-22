import { useEffect } from "react";
import { Icon } from "./Icons";

export interface ToastData {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function Toast({ data, onClose }: { data: ToastData | null; onClose: () => void }) {
  useEffect(() => {
    if (!data) return;
    const t = window.setTimeout(onClose, 5200);
    return () => window.clearTimeout(t);
  }, [data, onClose]);

  if (!data) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center px-4">
      <div
        key={data.id}
        role="status"
        className="animate-slide-up pointer-events-auto flex items-center gap-3 rounded-xl border border-line bg-surface/95 px-3.5 py-2.5 shadow-[0_24px_60px_-20px_rgba(0,0,0,.6)] backdrop-blur"
      >
        <span className="grid h-6 w-6 place-items-center rounded-full bg-success/15 text-success">
          <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2} />
        </span>
        <span className="text-[13px] text-ink">{data.message}</span>
        {data.onAction && (
          <button
            type="button"
            onClick={() => {
              data.onAction?.();
              onClose();
            }}
            className="ml-1 inline-flex items-center gap-1.5 rounded-lg border border-line px-2 py-1 text-[12px] font-medium text-accent transition hover:bg-accent/10"
          >
            <Icon name="undo" className="h-3.5 w-3.5" />
            {data.actionLabel ?? "Undo"}
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-muted transition hover:bg-surface2 hover:text-ink"
          aria-label="Dismiss"
        >
          <Icon name="x" className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["n"], label: "New task — focus the composer" },
  { keys: ["/"], label: "Search tasks" },
  { keys: ["?"], label: "Toggle this panel" },
  { keys: ["↵"], label: "Add the task you typed" },
  { keys: ["⌘", "↵"], label: "Add task from the notes field" },
  { keys: ["esc"], label: "Clear search / close panels" },
  { keys: ["⌘", "z"], label: "Undo the last delete" },
];

export function ShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 animate-fade bg-black/55 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        className="animate-slide-up relative w-full max-w-[420px] rounded-2xl border border-line bg-surface p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 id="shortcuts-title" className="text-[16px] font-semibold tracking-tight">
              Keyboard shortcuts
            </h2>
            <p className="mt-1 text-[12.5px] text-muted">Everything is reachable without the mouse.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted transition hover:bg-surface2 hover:text-ink"
            aria-label="Close"
          >
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>

        <ul className="mt-4 divide-y divide-line">
          {SHORTCUTS.map((s) => (
            <li key={s.label} className="flex items-center justify-between gap-4 py-2.5">
              <span className="text-[13px] text-ink/85">{s.label}</span>
              <span className="flex shrink-0 gap-1">
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className="rounded-md border border-line bg-surface2 px-1.5 py-0.5 font-mono text-[11px] text-muted"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-xl bg-accent px-3 py-2 text-[13px] font-medium text-white transition hover:brightness-110"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
