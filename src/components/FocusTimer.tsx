import { useEffect, useMemo, useRef, useState } from "react";
import type { Task } from "../types";
import { Icon } from "./Icons";

const FOCUS_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;

function clock(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function FocusTimer({
  tasks,
  onComplete,
  onToast,
}: {
  tasks: Task[];
  onComplete: (id: string) => void;
  onToast: (message: string) => void;
}) {
  const [mode, setMode] = useState<"focus" | "break">("focus");
  const [seconds, setSeconds] = useState(FOCUS_SECONDS);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [taskId, setTaskId] = useState("");
  const tick = useRef<number | null>(null);

  const candidates = useMemo(() => tasks.filter((t) => !t.done).slice(0, 25), [tasks]);
  const total = mode === "focus" ? FOCUS_SECONDS : BREAK_SECONDS;
  const pct = 1 - seconds / total;

  useEffect(() => {
    if (!running) return;
    tick.current = window.setInterval(() => {
      setSeconds((s) => {
        if (s > 1) return s - 1;
        // finished
        setRunning(false);
        if (mode === "focus") {
          setSessions((n) => n + 1);
          const target = taskId;
          onToast(target ? "Focus session done — task finished" : "Focus session done. Take five.");
          if (target) onComplete(target);
          setMode("break");
          return BREAK_SECONDS;
        }
        onToast("Break over — back to it.");
        setMode("focus");
        return FOCUS_SECONDS;
      });
    }, 1000);
    return () => {
      if (tick.current) window.clearInterval(tick.current);
    };
  }, [running, mode, taskId, onComplete, onToast]);

  const toggle = () => setRunning((r) => !r);
  const reset = () => {
    setRunning(false);
    setSeconds(total);
  };
  const switchMode = (next: "focus" | "break") => {
    setRunning(false);
    setMode(next);
    setSeconds(next === "focus" ? FOCUS_SECONDS : BREAK_SECONDS);
  };

  const radius = 34;
  const circumference = 2 * Math.PI * radius;

  return (
    <section className="rounded-2xl border border-line bg-surface/80 p-4 backdrop-blur">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-[12.5px] font-semibold">
          <Icon name="zap" className="h-3.5 w-3.5 text-accent" />
          Focus
        </h2>
        <div className="flex rounded-lg border border-line p-0.5" role="group" aria-label="Timer mode">
          {(["focus", "break"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              aria-pressed={mode === m}
              className={`rounded-md px-1.5 py-0.5 text-[10.5px] capitalize transition ${
                mode === m ? "bg-accent/15 text-accent" : "text-muted hover:text-ink"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div className="relative h-[80px] w-[80px] shrink-0">
          <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
            <circle cx="40" cy="40" r={radius} fill="none" stroke="var(--line)" strokeWidth="5" />
            <circle
              cx="40"
              cy="40"
              r={radius}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - pct)}
              style={{ transition: "stroke-dashoffset 0.6s linear" }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <span className="text-[15px] font-semibold tabular-nums" aria-live="off">
              {clock(seconds)}
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggle}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent px-2 py-1.5 text-[12px] font-medium text-white transition hover:brightness-110"
            >
              <Icon name={running ? "clock" : "zap"} className="h-3.5 w-3.5" />
              {running ? "Pause" : "Start"}
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-line px-2 py-1.5 text-[12px] text-muted transition hover:text-ink"
              aria-label="Reset timer"
            >
              <Icon name="undo" className="h-3.5 w-3.5" />
            </button>
          </div>

          <select
            value={taskId}
            onChange={(e) => setTaskId(e.target.value)}
            aria-label="Task to finish after the session"
            className="mt-2 w-full rounded-lg border border-line bg-surface2/60 px-2 py-1.5 text-[11.5px] text-muted outline-none hover:text-ink"
          >
            <option value="">End: just log the session</option>
            {candidates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>

          <p className="mt-1.5 text-[10.5px] text-muted/80">
            {sessions === 0
              ? "25 minutes of one thing."
              : `${sessions} session${sessions === 1 ? "" : "s"} done today.`}
          </p>
        </div>
      </div>
    </section>
  );
}
