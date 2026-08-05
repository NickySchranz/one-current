import { useAppStore } from "@/stores/app-store";
import { CONFLICT_TYPE_LABELS } from "@/domain/conflicts/logic";

type Props = { mergeId: string };

/** Text-based merge summary: what was integrated at this merge point. */
export function MergeReview({ mergeId }: Props) {
  const merge = useAppStore((s) => s.merges.find((m) => m.id === mergeId));
  const branches = useAppStore((s) => s.branches);
  const setView = useAppStore((s) => s.setView);

  if (!merge) {
    return (
      <div className="panel">
        <p>This merge record no longer exists.</p>
      </div>
    );
  }

  const involved = branches.filter((b) => merge.branchIds.includes(b.id));

  return (
    <div className="panel">
      <h1>Merge point</h1>
      <p className="hint">
        {new Date(merge.createdAt).toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })}{" "}
        · {involved.map((b) => b.title).join(", ")}
      </p>

      {merge.contribution && (
        <div className="card action-card">
          <h3>What it now contributes</h3>
          <p style={{ margin: 0 }}>
            {merge.contributionKind ? `${merge.contributionKind.replace(/-/g, " ")}: ` : ""}
            {merge.contribution}
          </p>
        </div>
      )}

      <div className="four-grid">
        <div className="card">
          <h3>Preserved as true</h3>
          {merge.stillValid.length > 0 ? (
            merge.stillValid.map((s) => <div key={s} className="diff-item">{s}</div>)
          ) : (
            <p className="hint">—</p>
          )}
        </div>
        <div className="card">
          <h3>Released as outdated</h3>
          {merge.outdatedBeliefs.length > 0 ? (
            merge.outdatedBeliefs.map((s) => <div key={s} className="diff-item">{s}</div>)
          ) : (
            <p className="hint">—</p>
          )}
        </div>
        <div className="card">
          <h3>Left outside control</h3>
          {merge.outsideControl.length > 0 ? (
            merge.outsideControl.map((s) => <div key={s} className="diff-item">{s}</div>)
          ) : (
            <p className="hint">—</p>
          )}
        </div>
        <div className="card">
          <h3>Qualities reclaimed</h3>
          <div className="tag-row">
            {merge.reclaimedQualities.length > 0 ? (
              merge.reclaimedQualities.map((q) => <span key={q} className="tag quality">{q}</span>)
            ) : (
              <p className="hint">—</p>
            )}
          </div>
        </div>
      </div>

      {merge.released.length > 0 && (
        <div className="card sunken">
          <h3>Stopped running separately</h3>
          {merge.released.map((r) => (
            <div key={r} className="diff-item">{r}</div>
          ))}
        </div>
      )}

      {merge.conflicts.length > 0 && (
        <div className="card">
          <h3>Conflicts resolved</h3>
          {merge.conflicts.map((c) => (
            <div key={c.id} className="conflict resolved" style={{ marginBottom: "0.75rem" }}>
              <strong>{CONFLICT_TYPE_LABELS[c.type]}</strong>
              <div className="demand">{c.demandA}</div>
              <div className="demand">{c.demandB}</div>
              {c.resolution && <p className="calm-note">{c.resolution}</p>}
            </div>
          ))}
        </div>
      )}

      {merge.action && (
        <div className="card">
          <h3>The action it became</h3>
          <p style={{ fontWeight: 600, margin: 0 }}>{merge.action.title}</p>
          <p>{merge.action.instruction}</p>
          {merge.action.branchesIntegrated.map((r) => (
            <p key={r.branchId} className="hint" style={{ margin: 0 }}>
              {r.branchTitle} → {r.representedAs}
            </p>
          ))}
        </div>
      )}

      <p className="calm-note">
        This remains part of your history, but it no longer needs to organise today.
      </p>
      <button className="btn btn-primary" onClick={() => setView({ kind: "timeline" })}>
        Return to Now
      </button>
    </div>
  );
}
