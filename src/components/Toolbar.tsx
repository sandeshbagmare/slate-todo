import type { RefObject } from "react";
import type { SortKey, StatusFilter } from "../types";
import { Icon } from "./Icons";

const selectClass =
  "appearance-none rounded-xl border border-line bg-surface/70 py-2 pl-3 pr-8 text-[12.5px] text-ink transition hover:border-muted/40 focus:border-accent/50 focus:outline-none";

export function SearchBox({
  query,
  onQuery,
  inputRef,
  className = "",
}: {
  query: string;
  onQuery: (v: string) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <Icon
        name="search"
        className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
      />
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder="Search tasks"
        aria-label="Search tasks"
        className="w-full rounded-xl border border-line bg-surface/70 py-2 pl-8 pr-8 text-[13px] text-ink outline-none transition placeholder:text-muted/60 focus:border-accent/50 focus:bg-surface"
      />
      {query ? (
        <button
          type="button"
          onClick={() => onQuery("")}
          aria-label="Clear search"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted transition hover:bg-surface2 hover:text-ink"
        >
          <Icon name="x" className="h-3 w-3" />
        </button>
      ) : (
        <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-line px-1 text-[10px] text-muted/60">
          /
        </kbd>
      )}
    </div>
  );
}

export function FilterChips({
  status,
  counts,
  onChange,
}: {
  status: StatusFilter;
  counts: { all: number; active: number; done: number };
  onChange: (s: StatusFilter) => void;
}) {
  const items: { id: StatusFilter; label: string; count: number }[] = [
    { id: "all", label: "All", count: counts.all },
    { id: "active", label: "Active", count: counts.active },
    { id: "done", label: "Done", count: counts.done },
  ];

  return (
    <div className="flex items-center gap-1 rounded-xl border border-line bg-surface/60 p-1">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          aria-pressed={status === item.id}
          className={[
            "rounded-lg px-2.5 py-1 text-[12.5px] transition-colors",
            status === item.id
              ? "bg-accent/15 font-medium text-accent"
              : "text-muted hover:text-ink",
          ].join(" ")}
        >
          {item.label}
          <span className="ml-1.5 text-[11px] tabular-nums opacity-60">{item.count}</span>
        </button>
      ))}
    </div>
  );
}

export function SortSelect({ sort, onChange }: { sort: SortKey; onChange: (s: SortKey) => void }) {
  return (
    <div className="relative">
      <select
        value={sort}
        onChange={(e) => onChange(e.target.value as SortKey)}
        aria-label="Sort tasks"
        className={selectClass}
      >
        <option value="manual">Manual order</option>
        <option value="due">Due date</option>
        <option value="priority">Priority</option>
        <option value="created">Newest first</option>
      </select>
      <Icon
        name="chevronDown"
        className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
      />
    </div>
  );
}
