import { useRef, useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { isOpen, isWaiting } from "@/domain/branches/logic";
import { defaultDemand } from "@/domain/conflicts/logic";
import { branchColor } from "@/visualization/branch-lines/style";
import { nextReviewText } from "@/domain/waiting/logic";
import { FEELINGS, integrationSummary } from "@/domain/feelings/logic";
import { EnergyBar } from "@/features/life-timeline/EnergyBar";
import { CurrentActionCard } from "@/features/life-timeline/CurrentActionCard";

const DAY = 24 * 60 * 60 * 1000;
const DAYS_BACK = 6;
const SWIPE_THRESHOLD = 60;

function dayIso(offset: number): string {
  return new Date(Date.now() + offset * DAY).toISOString().slice(0, 10);
}

function dayName(offset: number): string {
  if (offset === 0) return "Today";
  if (offset === -1) return "Yesterday";
  return new Date(Date.now() + offset * DAY).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** One day at a time: today as it stands, or the record of a recent day. */
export function NowView() {
  const branches = useAppStore((s) => s.branches);
  const actions = useAppStore((s) => s.actions);
  const waiting = useAppStore((s) => s.waiting);
  const startMerge = useAppStore((s) => s.startMerge);
  const setView = useAppStore((s) => s.setView);
  const theme = useAppStore((s) => s.theme);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // 0 = today; flick right to drift back through the recent days.
  const [dayOffset, setDayOffset] = useState(0);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);

  const entering = branches.filter((b) => isOpen(b) && !isWaiting(b));
  const calm = branches.filter(isWaiting);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  const summary = integrationSummary(branches);
  const anyNamed = summary.held.length > 0 || summary.returnedToday.length > 0;

  const day = dayIso(dayOffset);
  const label = dayName(dayOffset);

  // The record a past day leaves behind: steps, moments, beginnings, endings.
  const dayActions = actions.filter((a) => a.createdAt.slice(0, 10) === day);
  const dayMoments = branches.flatMap((b) =>
    b.commits.filter((m) => m.date === day).map((m) => ({ branch: b, moment: m })),
  );
  const dayStarted = branches.filter((b) => b.firstCreatedAt.slice(0, 10) === day);
  const dayClosed = branches.filter((b) => b.mergeDate === day);

  function onPointerDown(e: React.PointerEvent) {
    swipeStart.current = { x: e.clientX, y: e.clientY };
  }
  function onPointerUp(e: React.PointerEvent) {
    const s = swipeStart.current;
    swipeStart.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    // Swiping right drifts back a day; swiping left returns toward today.
    setDayOffset((o) => Math.max(-DAYS_BACK, Math.min(0, o + (dx < 0 ? 1 : -1))));
  }

  return (
    <div
      className="panel day-swipe"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (swipeStart.current = null)}
    >
      <h1>Now</h1>

      {/* flick sideways (or tap a dot) to move through the recent days */}
      <div className="day-strip">
        <div className="action-dots" role="group" aria-label="Recent days">
          {Array.from({ length: DAYS_BACK + 1 }, (_, i) => i - DAYS_BACK).map((o) => (
            <button
              key={o}
              className={`action-dot ${o === dayOffset ? "current" : ""}`}
              aria-label={dayName(o)}
              aria-current={o === dayOffset}
              onClick={() => setDayOffset(o)}
            />
          ))}
        </div>
        <span className="hint">{label}</span>
      </div>

      {dayOffset < 0 ? (
        <>
          <p className="prompt">What {label.toLowerCase()} held.</p>

          <CurrentActionCard date={day} dayLabel={label} />

          {dayMoments.map(({ branch: b, moment: m }) => (
            <div key={m.id} className="card sunken">
              <strong>{m.title}</strong>
              <p className="hint" style={{ margin: 0 }}>
                a moment on “{b.title}”
              </p>
            </div>
          ))}
          {dayClosed.map((b) => (
            <div key={b.id} className="card sunken">
              <strong>{b.title}</strong>
              <p className="hint" style={{ margin: 0 }}>
                {b.status === "converted-to-project"
                  ? "became real work and left your head"
                  : "folded back into your one line"}
              </p>
            </div>
          ))}
          {dayStarted.map((b) => (
            <div key={b.id} className="card sunken">
              <strong>{b.title}</strong>
              <p className="hint" style={{ margin: 0 }}>
                began pulling on you this day
              </p>
            </div>
          ))}
          {dayActions.length === 0 &&
            dayMoments.length === 0 &&
            dayClosed.length === 0 &&
            dayStarted.length === 0 && (
              <p className="calm-note">Nothing was recorded on this day. It simply passed.</p>
            )}
        </>
      ) : (
        <>
          {/* where your feelings live today */}
          <div className="card integration-card">
            <strong>
              {summary.withYou.length} of {FEELINGS.length} feelings are with you on your one line
            </strong>
            <p className="hint" style={{ margin: 0 }}>
              The quiet aim: one line, with as much of you on it as possible. Any decision on a
              branch brings some of you home for the day.
            </p>
            <EnergyBar branches={branches} />
            {summary.returnedToday.length > 0 && (
              <div className="tag-row" aria-label="Returned today">
                <span className="hint">Returned today:</span>
                {summary.returnedToday.map((f) => (
                  <span key={f} className="tag quality">{f}</span>
                ))}
              </div>
            )}
            {summary.held.map(({ branch: b, feelings }) => (
              <button
                key={b.id}
                className="integration-held"
                style={{ border: "none", background: "none", padding: 0, textAlign: "left", cursor: "pointer" }}
                onClick={() => setView({ kind: "touch", branchId: b.id })}
              >
                <span className="swatch" style={{ background: branchColor(b, theme) }} aria-hidden="true" />
                <span>{b.title}</span>
                <span className="hint">holds</span>
                {feelings.map((f) => (
                  <span key={f} className="tag">{f}</span>
                ))}
              </button>
            ))}
            {!anyNamed && (
              <p className="hint" style={{ margin: 0 }}>
                Tap a line on the timeline and choose what it holds — then you can watch it return.
              </p>
            )}
          </div>

          {/* the steps taken toward your lines today */}
          <CurrentActionCard />

          {entering.length === 0 ? (
            <p className="calm-note">
              No branches are actively pulling on today. Your main line continues.
            </p>
          ) : (
            <>
              <p className="prompt">These branches are active today.</p>
              <p className="hint">Select what is ready to be integrated.</p>
              {entering.map((b) => {
                const color = branchColor(b, theme);
                return (
                  <button
                    key={b.id}
                    className={`branch-chip ${selected.has(b.id) ? "selected" : ""}`}
                    aria-pressed={selected.has(b.id)}
                    onClick={() => toggle(b.id)}
                  >
                    <span className="swatch" style={{ background: color }} aria-hidden="true" />
                    <div style={{ flex: 1 }}>
                      <strong>{b.title}</strong>
                      <div className="meta">
                        Pull {b.pull} of 5 ·{" "}
                        {b.controllability === "outside-control"
                          ? "outside your control"
                          : b.controllability === "unclear"
                            ? "control unclear"
                            : b.controllability}{" "}
                        · {b.status.replace(/-/g, " ")}
                      </div>
                      <div className="meta">Asks: {defaultDemand(b)}</div>
                      {b.storedQualities.length > 0 && (
                        <div className="meta">Carries: {b.storedQualities.join(", ")}</div>
                      )}
                    </div>
                    <span
                      className="btn btn-quiet"
                      role="presentation"
                      onClick={(e) => {
                        e.stopPropagation();
                        setView({ kind: "branch", branchId: b.id, stage: "fork" });
                      }}
                    >
                      Inspect
                    </span>
                  </button>
                );
              })}
              <div className="stage-nav">
                <span className="hint">
                  {selected.size === 0
                    ? "Select one or more branches"
                    : `${selected.size} selected`}
                </span>
                <button
                  className="btn btn-primary btn-large"
                  disabled={selected.size === 0}
                  onClick={() => startMerge([...selected])}
                >
                  Merge what can be integrated now
                </button>
              </div>
            </>
          )}

          {calm.length > 0 && (
            <>
              <h2 style={{ marginTop: "1.5rem" }}>Waiting calmly</h2>
              {calm.map((b) => {
                const container = waiting.find((w) => w.id === b.waitingContainerId);
                return (
                  <div key={b.id} className="card sunken">
                    <strong>{b.title}</strong>
                    {container && <p className="hint" style={{ margin: 0 }}>{nextReviewText(container)}</p>}
                    <button
                      className="btn btn-quiet"
                      onClick={() => setView({ kind: "branch", branchId: b.id, stage: "fork" })}
                    >
                      Review
                    </button>
                  </div>
                );
              })}
            </>
          )}
        </>
      )}
    </div>
  );
}
