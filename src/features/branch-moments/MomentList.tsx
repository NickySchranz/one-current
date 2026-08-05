import type { PsychologicalBranch } from "@/domain/branches/types";
import { sortMoments } from "@/domain/moments/logic";

type Props = { branch: PsychologicalBranch };

export function MomentList({ branch }: Props) {
  const moments = sortMoments(branch.commits);
  if (moments.length === 0) {
    return <p className="hint">No moments recorded yet. The fork and Now are the whole story so far.</p>;
  }
  return (
    <ol style={{ listStyle: "none", padding: 0, margin: 0 }} aria-label="Moments in order">
      {moments.map((m) => (
        <li key={m.id} className="card" style={{ padding: "0.7rem 0.9rem" }}>
          <div className="status-line">
            <span>{new Date(m.date + "T00:00:00").toLocaleDateString()}</span>
            <span aria-hidden="true">·</span>
            <span>{m.type}</span>
            {m.effect && (
              <>
                <span aria-hidden="true">·</span>
                <span>made it {m.effect}</span>
              </>
            )}
          </div>
          <strong>{m.title}</strong>
          {m.description && <p className="hint" style={{ margin: 0 }}>{m.description}</p>}
          {m.beliefAdded && (
            <p style={{ margin: "0.25rem 0 0" }} className="hint">
              Began believing: “{m.beliefAdded}”
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
