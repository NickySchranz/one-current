import { useRef, useState } from "react";
import { useAppStore } from "@/stores/app-store";

const SWIPE_THRESHOLD = 40;

type Props = {
  /** ISO day whose actions are shown. Defaults to today. */
  date?: string;
  /** Human name for that day, used in the overline. */
  dayLabel?: string;
};

/**
 * The steps taken toward your lines on one day — a record, not a checklist.
 * Deciding on a step is the act itself; there is nothing to tick off.
 * Swipe (or use the dots) to move through the day's steps.
 */
export function CurrentActionCard({ date, dayLabel = "Today" }: Props) {
  const actions = useAppStore((s) => s.actions);
  const [index, setIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const swipeStart = useRef<number | null>(null);

  const day = date ?? new Date().toISOString().slice(0, 10);

  // Newest first: the step you decided on last is the one on top.
  const taken = [...actions].reverse().filter((a) => a.createdAt.slice(0, 10) === day);
  const i = Math.min(index, Math.max(0, taken.length - 1));
  const current: (typeof taken)[number] | undefined = taken[i];

  if (!current) return null;

  const source = current.branchesIntegrated[0]?.branchTitle;
  const stacked = taken.length > 1;

  function onPointerDown(e: React.PointerEvent) {
    e.stopPropagation();
    swipeStart.current = e.clientX;
  }
  function onPointerMove(e: React.PointerEvent) {
    if (swipeStart.current === null || !stacked) return;
    setDragX(e.clientX - swipeStart.current);
  }
  function onPointerUp(e: React.PointerEvent) {
    if (swipeStart.current === null) return;
    e.stopPropagation();
    const delta = e.clientX - swipeStart.current;
    swipeStart.current = null;
    setDragX(0);
    if (Math.abs(delta) < SWIPE_THRESHOLD) return;
    if (delta < 0 && i < taken.length - 1) setIndex(i + 1);
    if (delta > 0 && i > 0) setIndex(i - 1);
  }

  return (
    <div
      className="card action-card"
      style={dragX ? { transform: `translateX(${dragX * 0.35}px)` } : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="action-card-text">
        <span className="action-overline">
          {dayLabel}
          {source ? ` · toward ${source}` : ""}
        </span>
        <strong className="action-title">{current.title}</strong>
        <span className="hint action-meta">
          {current.instruction && current.instruction !== current.title
            ? `${current.instruction} · `
            : ""}
          about {current.durationMinutes} min · smallest version: {current.minimumVersion}
        </span>
      </div>
      {stacked && (
        <div className="action-dots" role="group" aria-label="Steps this day">
          {taken.map((a, j) => (
            <button
              key={a.id}
              className={`action-dot ${j === i ? "current" : ""}`}
              aria-label={`Step ${j + 1} of ${taken.length}: ${a.title}`}
              aria-current={j === i}
              onClick={() => setIndex(j)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
