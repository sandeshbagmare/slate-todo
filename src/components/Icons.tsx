import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  Check,
  ChevronDown,
  CircleCheck,
  Target,
  Clock,
  Flag,
  Flame,
  GripVertical,
  Inbox,
  Keyboard,
  Layers,
  Menu,
  Moon,
  Plus,
  Repeat2,
  Search,
  Sparkles,
  StickyNote,
  Sun,
  Trash2,
  BarChart3,
  Command,
  Copy,
  Download,
  Shield,
  Upload,
  Zap,
  Undo2,
  X,
} from "lucide-react";

/**
 * One icon language for the whole app: Lucide's hand-drawn 24px grid,
 * a single 1.75 stroke, round caps and joins, absolute stroke width so
 * 14px and 20px glyphs keep the same optical weight.
 */
const GLYPHS = {
  arrowRight: ArrowRight,
  calendar: CalendarDays,
  calendarClock: CalendarClock,
  check: Check,
  checkCircle: CircleCheck,
  clock: Clock,
  target: Target,
  chevronDown: ChevronDown,
  fire: Flame,
  flag: Flag,
  grip: GripVertical,
  inbox: Inbox,
  keyboard: Keyboard,
  layers: Layers,
  menu: Menu,
  moon: Moon,
  note: StickyNote,
  plus: Plus,
  repeat: Repeat2,
  chart: BarChart3,
  command: Command,
  copy: Copy,
  download: Download,
  shield: Shield,
  upload: Upload,
  zap: Zap,
  search: Search,
  sparkle: Sparkles,
  sun: Sun,
  trash: Trash2,
  undo: Undo2,
  x: X,
} as const;

export type IconName = keyof typeof GLYPHS;

export function Icon({
  name,
  className = "h-4 w-4",
  strokeWidth = 1.75,
}: {
  name: IconName;
  className?: string;
  /** only raise this for tick marks that must read at 12px */
  strokeWidth?: number;
}) {
  const Glyph = GLYPHS[name];
  return (
    <Glyph
      className={className}
      strokeWidth={strokeWidth}
      absoluteStrokeWidth
      aria-hidden="true"
      focusable="false"
    />
  );
}
