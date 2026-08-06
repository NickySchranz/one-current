import type { PsychologicalBranch } from "@/domain/branches/types";
import { sortMoments } from "@/domain/moments/logic";
import { useT } from "@/i18n/i18n";

type Props = { branch: PsychologicalBranch };

export function MomentList({ branch }: Props) {
  const t = useT();
  const moments = sortMoments(branch.commits);
  if (moments.length === 0) {
    return (
      <p className="hint">
        {t("No moments recorded yet. Where it began and Now are the whole story so far.")}
      </p>
    );
  }
  return (
    <ol style={{ listStyle: "none", padding: 0, margin: 0 }} aria-label={t("Moments in order")}>
      {moments.map((m) => (
        <li key={m.id} className="card" style={{ padding: "0.7rem 0.9rem" }}>
          <div className="status-line">
            <span>{new Date(m.date + "T00:00:00").toLocaleDateString()}</span>
            <span aria-hidden="true">·</span>
            <span>{t(m.type)}</span>
            {m.effect && (
              <>
                <span aria-hidden="true">·</span>
                <span>{t("made it {effect}", { effect: t(m.effect) })}</span>
              </>
            )}
          </div>
          <strong>{m.title}</strong>
          {m.description && <p className="hint" style={{ margin: 0 }}>{m.description}</p>}
          {m.beliefAdded && (
            <p style={{ margin: "0.25rem 0 0" }} className="hint">
              {t("Began believing: “{belief}”", { belief: m.beliefAdded })}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
