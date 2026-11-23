# Slate — a todo app that stays out of your way

Keyboard-first todo app with lists, due dates, priorities, drag-and-drop order,
undo, a daily focus ring and a light/dark theme. Everything is stored locally in
`localStorage` — no account, no backend.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build into dist/
npm run preview  # serve the build
```

## Features

| Area | What you get |
| --- | --- |
| Views | Today (due today + overdue), Upcoming, All tasks, Completed, plus your own lists |
| Tasks | Title, notes, priority (low/med/high), due date, list, done state |
| Editing | Click a title to rename inline, tick to complete, click the date chip to reschedule, flag chip cycles priority |
| Ordering | Drag rows to reorder (manual), or sort by due date / priority / newest |
| Filtering | All / Active / Done chips + search across titles and notes |
| Lists | Create, rename (double-click), delete — deleted lists move their tasks to Inbox |
| Safety | Undo on delete, clear-completed and list delete (toast button or `Ctrl/⌘+Z`) |
| Focus | Progress ring for today, open/completed counts, 7-day completion chart, overdue alert, rotating nudge |
| Theme | Dark (default) and light, remembered before first paint |
| Mobile | Off-canvas sidebar, full-width composer, no horizontal overflow |

## Keyboard

| Key | Action |
| --- | --- |
| `n` | Focus the composer |
| `/` | Focus search |
| `?` | Shortcut sheet |
| `Enter` | Add task |
| `⌘/Ctrl + Enter` | Add from the notes field |
| `Esc` | Clear search / close panels |
| `⌘/Ctrl + Z` | Undo last delete |

## Structure

```
src/
├── App.tsx                 state, derived views, actions, shortcuts
├── index.css               design tokens, dark variant, keyframes
├── types.ts                Task / TaskList / view types
├── lib/
│   ├── date.ts             local YYYY-MM-DD helpers (no UTC drift)
│   ├── storage.ts          safe localStorage load/save + ids
│   └── seed.ts             first-run demo data
└── components/
    ├── Sidebar.tsx         brand, smart views, lists, theme switch
    ├── Composer.tsx        add-task card with meta controls
    ├── TaskRow.tsx         checkbox, inline rename, chips, drag
    ├── FocusPanel.tsx      progress ring, weekly chart, nudge
    ├── Toolbar.tsx         search, filter chips, sort select
    ├── Overlays.tsx        toast, shortcut sheet
    ├── CalendarView.tsx    month grid, day detail, month stats, what's coming up
    ├── MobileTabs.tsx      phone bottom navigation
    └── Icons.tsx           thin-stroke icon set (Lucide, 1.75 stroke)
```

## Notes

- Tailwind v4 via `@tailwindcss/vite`; theme tokens live in `src/index.css` under
  `:root` / `.dark` and are exposed to utilities with `@theme inline`.
- State is intentionally plain React (`useState` + `useMemo`); the data volume is
  small and undo works by snapshotting the task array.
- `prefers-reduced-motion` disables every animation and transition.
- Tested in Chromium at 1440×900 and 390×844: add/complete/rename/delete/undo,
  search, filters, drag reorder, list create/delete, theme + view persistence,
  no console errors, no horizontal overflow.

## Calendar

- `Calendar` is the first smart view and the default screen. Monday-first 42-cell
  month grid, prev/next month, jump to today, click any day to see and edit that
  day's tasks, and add a task straight onto the selected date.
- Right column: selected day, month summary (scheduled / done / late / busiest
  day) and a "Coming up" list for the next 10 days that jumps the grid to a day.
- **Week board** toggle (Month / Week) with the seven days side by side, inline
  checkboxes and two-line task chips; it takes the full width so names stay readable.
- **Drag to reschedule**: drag any chip onto another day in month or week mode — the
  task's due date moves, with a toast and Undo.
- Phones swap the grid chips for dot markers and move navigation to the bottom
  tab bar (Calendar · Today · Upcoming · Stats · Lists).

## Streaks and stats

- **Streak engine** (`src/lib/streak.ts`, pure functions): a day counts when at least
  one task is completed on it; the run ends today, or yesterday while today is still
  open. Every 7 days adds a **freeze** (max 3) that can patch one missed day, so a
  single bad day does not wipe a long run.
- **Stats view**: streak hero with a daily goal (2/3/5), 13-week consistency heatmap
  with weekday labels, last-7-days momentum, records (best streak, active days, tasks
  done, best day), per-list progress and recently finished tasks.
- Streaks are a **setting**: `Streaks on/off` in the hero stops all recording, and
  `slate.streak` is plain JSON in localStorage.

## Power features

- **Recurring tasks** — daily / weekly / monthly. Completing an occurrence marks it done
  and schedules the next one; un-completing removes the spawned occurrence. Repeats also
  respect month-end clamping (Jan 31 → Feb 28).
- **Quick add** (`src/lib/nlp.ts`) — type `Call the bank tomorrow !2 #Work every week`
  and the composer extracts the date, priority, list and repeat, leaving a clean title.
  Unknown words stay in the title, so plain typing is never mangled.
- **Command palette** — `Ctrl/⌘ K`: fuzzy search live tasks, jump to any view, complete a
  task, toggle theme, export/import, open shortcuts.
- **My Day** — star any task (the ☆ on the row) and it joins today's short list
  whatever its due date; open items carry over until they are done, and the
  view has its own sidebar badge, phone tab and palette command.
- **Reminders** — set a time on any task; Android gets a real OS notification
  (exact alarm + boot restore), the browser falls back to a notification while the
  tab is open. Permission is requested the first time you set one.
- **Checklists** — add steps inside any task; the row shows `done/total`, steps can be
  ticked, removed, and are copied when you duplicate a task.
- **Focus timer** — 25/5 pomodoro in the right rail; pick a task and finishing the
  session completes it, otherwise it just logs the session.
- **Duplicate** — one click copies a task (title, notes, priority, due, list, repeat, steps).
- **Backups** — Export writes `slate-backup-YYYY-MM-DD.json` (tasks, lists, streak);
  Import validates the shape and offers Undo.

## Tests

```bash
npm run dev            # terminal 1
python tests/e2e.py    # terminal 2 — 42 checks, screenshots in shots/
```

Covers calendar landing, stats rendering, quick-add parsing, streak logging, recurring
spawn + date maths, palette navigation, freeze repair, export payload, phone layout,
week board + drag reschedule, checklists, focus timer, duplicate and console errors.

## Android app

The same build ships as a native Android app through Capacitor.

```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

Installable debug APK: `Slate-calendar.apk` (also on the Desktop).

- package `com.slate.tasks`, app name `Slate`, minSdk 24, targetSdk 36
- native back button closes the drawer / shortcut sheet before exiting
- status-bar icon style follows the in-app theme
- safe-area padding for edge-to-edge Android 15, keyboard resizes the composer
- fully offline: the web bundle is packaged inside the APK

Build tooling lives outside the project: JDK 21 in `C:/dev/jdk`, Android SDK in
`C:/dev/android-sdk` (`local.properties` points at it). On this machine the JVM
needs `-Djava.net.preferIPv4Stack=true` to reach Maven/Google, already set in
`android/gradle.properties`.

### Installing the APK

1. Copy `Slate-calendar.apk` to the phone (USB, Drive, or `adb install`).
2. Open it, allow "install unknown apps" for the file manager / browser.
3. Launch **Slate**.
