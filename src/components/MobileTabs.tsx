import type { IconName } from "./Icons";
import { Icon } from "./Icons";
import type { ViewId } from "../types";

const TABS: { id: ViewId; label: string; icon: IconName }[] = [
  { id: "calendar", label: "Calendar", icon: "calendar" },
  { id: "today", label: "Today", icon: "target" },
  { id: "myday", label: "My Day", icon: "star" },
  { id: "upcoming", label: "Upcoming", icon: "clock" },
  { id: "stats", label: "Stats", icon: "chart" },
];

export function MobileTabs({
  view,
  listsActive,
  onSelect,
  onOpenLists,
}: {
  view: ViewId;
  listsActive: boolean;
  onSelect: (v: ViewId) => void;
  onOpenLists: () => void;
}) {
  const activeClass = "text-accent";
  const idleClass = "text-muted";

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      aria-label="Main"
    >
      <div className="mx-auto grid max-w-[520px] grid-cols-6">
        {TABS.map((tab) => {
          const active = view === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelect(tab.id)}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-[58px] flex-col items-center justify-center gap-1 pt-1.5 pb-1.5 text-[10.5px] font-medium transition-colors ${
                active ? activeClass : idleClass
              }`}
            >
              <span className={`grid h-7 w-12 place-items-center rounded-full transition-colors ${active ? "bg-accent/12" : ""}`}>
                <Icon name={tab.icon} className="h-[18px] w-[18px]" />
              </span>
              {tab.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={onOpenLists}
          aria-expanded={listsActive}
          className={`flex min-h-[58px] flex-col items-center justify-center gap-1 pt-1.5 pb-1.5 text-[10.5px] font-medium transition-colors ${
            listsActive ? activeClass : idleClass
          }`}
        >
          <span className={`grid h-7 w-12 place-items-center rounded-full transition-colors ${listsActive ? "bg-accent/12" : ""}`}>
            <Icon name="layers" className="h-[18px] w-[18px]" />
          </span>
          Lists
        </button>
      </div>
    </nav>
  );
}
