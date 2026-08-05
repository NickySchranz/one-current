import { useAppStore } from "@/stores/app-store";
import { isClosed } from "@/domain/branches/logic";

/** Merged branches, recurring patterns, and past merges. */
export function HistoryView() {
  const branches = useAppStore((s) => s.branches);
  const merges = useAppStore((s) => s.merges);
  const setView = useAppStore((s) => s.setView);

  const mergedBranches = branches.filter(
    (b) => isClosed(b) || b.status === "partly-integrated",
  );
  const recurring = branches.filter((b) => b.recurrenceCount > 0);

  return (
    <div className="panel">
      <h1>History</h1>

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
