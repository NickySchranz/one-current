import { useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { isClosed } from "@/domain/branches/logic";
import { CurrentActionCard } from "@/features/life-timeline/CurrentActionCard";

const DAY = 24 * 60 * 60 * 1000;
const DAYS_BACK = 6;

function dayIso(offset: number): string {
  return new Date(Date.now() + offset * DAY).toISOString().slice(0, 10);
}

function dayName(offset: number): string {
  if (offset === -1) return "Yesterday";
  return new Date(Date.now() + offset * DAY).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** Recent days, merged branches, recurring patterns, and past merges. */
export function HistoryView() {
  const branches = useAppStore((s) => s.branches);
  const merges = useAppStore((s) => s.merges);
  const setView = useAppStore((s) => s.setView);
  // -1 = yesterday; today itself lives in Now.
  const [dayOffset, setDayOffset] = useState(-1);

  const mergedBranches = branches.filter(
    (b) => isClosed(b) || b.status === "partly-integrated",
  );
  const recurring = branches.filter((b) => b.recurrenceCount > 0);

  const day = dayIso(dayOffset);
  const label = dayName(dayOffset);
  // The record a past day leaves behind: steps, moments, beginnings, endings.
  const dayActions = useAppStore((s) => s.actions).filter(
    (a) => a.createdAt.slice(0, 10) === day,
  );
  const dayMoments = branches.flatMap((b) =>
    b.commits.filter((m) => m.date === day).map((m) => ({ branch: b, moment: m })),
  );
  const dayStarted = branches.filter((b) => b.firstCreatedAt.slice(0, 10) === day);
  const dayClosed = branches.filter((b) => b.mergeDate === day);

  return (
    <div className="panel">
      <h1>History</h1>

      <h2>Recent days</h2>
      <div className="day-strip">
        <div className="action-dots" role="group" aria-label="Recent days">
          {Array.from({ length: DAYS_BACK }, (_, i) => i - DAYS_BACK).map((o) => (
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

      <h2>Merged branches</h2>
      {mergedBranches.length === 0 ? (
        <p className="hint">Nothing merged yet. Merged branches stay visible here and on the timeline.</p>
      ) : (
        mergedBranches.map((b) => (
          <div key={b.id} className="card">
            <strong>{b.title}</strong>
            <p className="hint" style={{ margin: 0 }}>
              Forked {b.forkLabel ?? b.forkDate}
              {b.mergeDate ? ` · merged ${b.mergeDate}` : " · partly integrated"}
              {b.storedQualities.length > 0 ? ` · reclaimed: ${b.storedQualities.join(", ")}` : ""}
            </p>
            {b.mergeIds.length > 0 && (
              <button
                className="btn btn-quiet"
                onClick={() =>
                  setView({ kind: "merge-review", mergeId: b.mergeIds[b.mergeIds.length - 1] })
                }
              >
                What was integrated
              </button>
            )}
          </div>
        ))
      )}

      {recurring.length > 0 && (
        <>
          <h2>Patterns</h2>
          <p className="hint">
            Branches that returned. Returning does not undo a merge — it usually points at a need
            that keeps asking.
          </p>
          {recurring.map((b) => (
            <div key={b.id} className="card sunken">
              <strong>{b.title}</strong>
              <p className="hint" style={{ margin: 0 }}>
                Returned {b.recurrenceCount} time{b.recurrenceCount === 1 ? "" : "s"} ·{" "}
                {b.unmetNeeds.length > 0 ? `needs: ${b.unmetNeeds.join(", ")}` : "no needs recorded"}
              </p>
            </div>
          ))}
        </>
      )}

      <h2>All merges</h2>
      {merges.length === 0 ? (
        <p className="hint">No merges recorded yet.</p>
      ) : (
        [...merges]
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .map((m) => (
            <button
              key={m.id}
              className="branch-chip"
              onClick={() => setView({ kind: "merge-review", mergeId: m.id })}
            >
              <div>
                <strong>{new Date(m.createdAt).toLocaleDateString()}</strong>
                <p className="hint" style={{ margin: 0 }}>
                  {m.branchIds.length} branch{m.branchIds.length > 1 ? "es" : ""} ·{" "}
                  {m.resultStatus.replace(/-/g, " ")}
                  {m.reclaimedQualities.length > 0
                    ? ` · reclaimed ${m.reclaimedQualities.join(", ")}`
                    : ""}
                </p>
              </div>
            </button>
          ))
      )}
    </div>
  );
}
