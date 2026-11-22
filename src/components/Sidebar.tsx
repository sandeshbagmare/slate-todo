import { useEffect, useRef, useState } from "react";
import type { IconName } from "./Icons";
import { Icon } from "./Icons";
import type { Theme, ViewId } from "../types";
import { INBOX } from "../lib/seed";

export interface Counts {
  today: number;
  upcoming: number;
  all: number;
  completed: number;
  byList: Record<string, number>;
}

interface SidebarProps {
  lists: { id: string; name: string; color: string }[];
  counts: Counts;
  view: ViewId;
  onSelect: (view: ViewId) => void;
  theme: Theme;
  onToggleTheme: () => void;
  onAddList: (name: string) => void;
  onRenameList: (id: string, name: string) => void;
  onDeleteList: (id: string) => void;
  onOpenShortcuts: () => void;
  streakDays: number;
  onOpenPalette: () => void;
  onExport: () => void;
  onImport: () => void;
  open: boolean;
  onClose: () => void;
}

const NAV: { id: ViewId; label: string; icon: IconName; count?: keyof Counts }[] = [
  { id: "calendar", label: "Calendar", icon: "calendar" },
  { id: "today", label: "Today", icon: "target", count: "today" },
  { id: "upcoming", label: "Upcoming", icon: "clock", count: "upcoming" },
  { id: "stats", label: "Stats & streaks", icon: "chart" },
  { id: "all", label: "All tasks", icon: "layers", count: "all" },
  { id: "completed", label: "Completed", icon: "checkCircle", count: "completed" },
];

function Row({
  active,
  icon,
  label,
  count,
  onClick,
  color,
  onDelete,
  onRename,
}: {
  active: boolean;
  icon?: IconName;
  label: string;
  count?: number;
  onClick: () => void;
  color?: string;
  onDelete?: () => void;
  onRename?: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    const next = draft.trim();
    if (next && next !== label) onRename?.(next);
    else setDraft(label);
    setEditing(false);
  };

  return (
    <div className="group/row relative">
      {editing ? (
        <div className="flex items-center gap-2 rounded-xl border border-line bg-surface2 px-2.5 py-1.5">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setDraft(label);
                setEditing(false);
              }
            }}
            className="w-full bg-transparent text-sm text-ink outline-none"
            aria-label="List name"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={onClick}
          onDoubleClick={() => {
            if (onRename) {
              setDraft(label);
              setEditing(true);
            }
          }}
          className={[
            "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-[7px] text-left text-sm transition-colors",
            active
              ? "bg-accent/12 font-medium text-accent ring-1 ring-accent/20"
              : "text-muted hover:bg-surface2 hover:text-ink",
          ].join(" ")}
          aria-current={active ? "page" : undefined}
        >
          {icon ? (
            <Icon name={icon} className="h-[15px] w-[15px] shrink-0" />
          ) : (
            <span
              className="h-2 w-2 shrink-0 rounded-full ring-2 ring-white/10"
              style={{ background: color }}
            />
          )}
          <span className="truncate">{label}</span>
          {typeof count === "number" && count > 0 && (
            <span
              className={[
                "ml-auto rounded-md px-1.5 py-0.5 text-[11px] tabular-nums",
                active ? "bg-accent/15 text-accent" : "text-muted/80 group-hover/row:text-muted",
              ].join(" ")}
            >
              {count}
            </span>
          )}
        </button>
      )}

      {onDelete && !editing && (
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete list ${label}`}
          className="absolute right-1.5 top-1/2 hidden -translate-y-1/2 rounded-md p-1 text-muted opacity-0 transition hover:bg-danger/15 hover:text-danger group-hover/row:opacity-100 lg:block"
        >
          <Icon name="x" className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export function Sidebar({
  lists,
  counts,
  view,
  onSelect,
  theme,
  onToggleTheme,
  onAddList,
  onRenameList,
  onDeleteList,
  onOpenShortcuts,
  streakDays,
  onOpenPalette,
  onExport,
  onImport,
  open,
  onClose,
}: SidebarProps) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const addRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding) addRef.current?.focus();
  }, [adding]);

  const submit = () => {
    const next = name.trim();
    if (next) onAddList(next);
    setName("");
    setAdding(false);
  };

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-black/50 backdrop-blur-sm transition-opacity lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden="true"
      />
      <aside
        className={[
          "fixed inset-y-0 left-0 z-40 flex w-[276px] flex-col border-r border-line bg-surface/95 backdrop-blur-xl transition-transform duration-300 lg:static lg:z-auto lg:w-[268px] lg:shrink-0 lg:translate-x-0 lg:border-r-0 lg:bg-transparent lg:backdrop-blur-none",
          open ? "translate-x-0 shadow-2xl" : "-translate-x-full",
        ].join(" ")}
        aria-label="Sidebar"
      >
        <div className="flex h-full flex-col gap-5 overflow-y-auto px-4 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-4 thin-scroll lg:sticky lg:top-0 lg:max-h-screen lg:px-0 lg:pt-5">
          {/* brand */}
          <div className="flex items-center gap-3 px-1">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-accent to-cyan-400 text-white shadow-lg shadow-accent/25">
              <Icon name="check" className="h-[18px] w-[18px]" strokeWidth={2.4} />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[15px] font-semibold tracking-tight">
                Slate
                {streakDays > 0 && (
                  <span
                    className="inline-flex items-center gap-1 rounded-md border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[10.5px] font-medium text-accent"
                    title={`${streakDays} day streak`}
                  >
                    <Icon name="fire" className="h-3 w-3" />
                    {streakDays}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-muted">Personal workspace</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="ml-auto rounded-lg p-1.5 text-muted hover:bg-surface2 hover:text-ink lg:hidden"
              aria-label="Close menu"
            >
              <Icon name="x" className="h-4 w-4" />
            </button>
          </div>

          {/* smart views */}
          <nav className="flex flex-col gap-0.5" aria-label="Views">
            {NAV.map((item) => (
              <Row
                key={item.id}
                active={view === item.id}
                icon={item.icon}
                label={item.label}
                count={item.count ? (counts[item.count] as number) : undefined}
                onClick={() => {
                  onSelect(item.id);
                  onClose();
                }}
              />
            ))}
          </nav>

          {/* lists */}
          <div className="flex flex-col gap-0.5">
            <div className="mb-1 flex items-center justify-between px-2.5">
              <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted/70">
                Lists
              </span>
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="rounded-md p-1 text-muted transition hover:bg-surface2 hover:text-ink"
                aria-label="Add list"
              >
                <Icon name="plus" className="h-3.5 w-3.5" />
              </button>
            </div>

            {lists.map((list) => (
              <Row
                key={list.id}
                active={view === `list:${list.id}`}
                label={list.name}
                color={list.color}
                count={counts.byList[list.id] ?? 0}
                onClick={() => {
                  onSelect(`list:${list.id}`);
                  onClose();
                }}
                onRename={(next) => onRenameList(list.id, next)}
                onDelete={list.id === INBOX ? undefined : () => onDeleteList(list.id)}
              />
            ))}

            {adding ? (
              <div className="mt-1 flex items-center gap-2 rounded-xl border border-accent/40 bg-surface2 px-2.5 py-1.5">
                <span className="h-2 w-2 rounded-full bg-accent" />
                <input
                  ref={addRef}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={submit}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submit();
                    if (e.key === "Escape") {
                      setName("");
                      setAdding(false);
                    }
                  }}
                  placeholder="List name…"
                  className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted/60"
                  aria-label="New list name"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="mt-1 flex items-center gap-2 rounded-xl px-2.5 py-[7px] text-left text-sm text-muted transition hover:bg-surface2 hover:text-ink"
              >
                <Icon name="plus" className="h-3.5 w-3.5" />
                New list
              </button>
            )}
          </div>

          <div className="mt-auto flex flex-col gap-2 pt-4">
            <div className="flex items-center gap-1 rounded-xl border border-line bg-surface/60 p-1">
              <button
                type="button"
                onClick={() => theme !== "light" && onToggleTheme()}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[12px] transition ${
                  theme === "light" ? "bg-surface2 text-ink shadow-sm" : "text-muted hover:text-ink"
                }`}
                aria-pressed={theme === "light"}
              >
                <Icon name="sun" className="h-3.5 w-3.5" />
                Light
              </button>
              <button
                type="button"
                onClick={() => theme !== "dark" && onToggleTheme()}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[12px] transition ${
                  theme === "dark" ? "bg-surface2 text-ink shadow-sm" : "text-muted hover:text-ink"
                }`}
                aria-pressed={theme === "dark"}
              >
                <Icon name="moon" className="h-3.5 w-3.5" />
                Dark
              </button>
            </div>
            <button
              type="button"
              onClick={onOpenPalette}
              className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-[12px] text-muted transition hover:bg-surface2 hover:text-ink"
            >
              <Icon name="command" className="h-4 w-4" />
              Command palette
              <kbd className="ml-auto rounded border border-line px-1.5 py-0.5 text-[10px] text-muted">⌘K</kbd>
            </button>
            <div className="flex items-center gap-2 border-t border-line pt-2">
              <button
                type="button"
                onClick={onExport}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-line px-2 py-1.5 text-[11.5px] text-muted transition hover:border-accent/40 hover:text-accent"
              >
                <Icon name="download" className="h-3.5 w-3.5" />
                Export
              </button>
              <button
                type="button"
                onClick={onImport}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-line px-2 py-1.5 text-[11.5px] text-muted transition hover:border-accent/40 hover:text-accent"
              >
                <Icon name="upload" className="h-3.5 w-3.5" />
                Import
              </button>
            </div>
            <button
              type="button"
              onClick={onOpenShortcuts}
              className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-[12px] text-muted transition hover:bg-surface2 hover:text-ink"
            >
              <Icon name="keyboard" className="h-4 w-4" />
              Keyboard shortcuts
              <kbd className="ml-auto rounded border border-line px-1.5 py-0.5 text-[10px] text-muted">?</kbd>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
