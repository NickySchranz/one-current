import { useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { isOpen, isWaiting } from "@/domain/branches/logic";
import { defaultDemand } from "@/domain/conflicts/logic";
import { branchColor } from "@/visualization/branch-lines/style";
import { nextReviewText } from "@/domain/waiting/logic";
import { FEELINGS, integrationSummary } from "@/domain/feelings/logic";
import { EnergyBar } from "@/features/life-timeline/EnergyBar";
import { CurrentActionCard } from "@/features/life-timeline/CurrentActionCard";

/** Today as it stands: what is entering the present, and what returned. */
export function NowView() {
  const branches = useAppStore((s) => s.branches);
  const waiting = useAppStore((s) => s.waiting);
  const startMerge = useAppStore((s) => s.startMerge);
  const setOperation = useAppStore((s) => s.setOperation);
  const theme = useAppStore((s) => s.theme);
  const [selected, setSelected] = useState<Set<string>>(new Set());

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

  return (
    <div className="panel">
      <h1>Now</h1>
      <p className="hint">Recent days live in History; this is only today.</p>

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
            onClick={() => setOperation({ kind: "inspecting-branch", branchId: b.id, depth: "touch" })}
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
                    setOperation({ kind: "inspecting-branch", branchId: b.id, depth: "deep" });
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
                  onClick={() => setOperation({ kind: "inspecting-branch", branchId: b.id, depth: "deep" })}
                >
                  Review
                </button>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
