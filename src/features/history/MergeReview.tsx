import { useAppStore } from "@/stores/app-store";
import { CONFLICT_TYPE_LABELS } from "@/domain/conflicts/logic";
import { useT } from "@/i18n/i18n";

type Props = { mergeId: string };

/** Text summary of a bring-back: what was integrated at this point. */
export function MergeReview({ mergeId }: Props) {
  const t = useT();
  const language = useAppStore((s) => s.language);
  const merge = useAppStore((s) => s.merges.find((m) => m.id === mergeId));
  const branches = useAppStore((s) => s.branches);
  const setView = useAppStore((s) => s.setView);

  if (!merge) {
    return (
      <div className="panel">
        <p>{t("This record no longer exists.")}</p>
      </div>
    );
  }

  const involved = branches.filter((b) => merge.branchIds.includes(b.id));

  return (
    <div className="panel">
      <h1>{t("Integrated")}</h1>
      <p className="hint">
        {new Date(merge.createdAt).toLocaleDateString(language === "es" ? "es" : undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })}{" "}
        · {involved.map((b) => b.title).join(", ")}
      </p>

      {merge.contribution && (
        <div className="card action-card">
          <h3>{t("What it now contributes")}</h3>
          <p style={{ margin: 0 }}>
            {merge.contributionKind ? `${t(merge.contributionKind.replace(/-/g, " "))}: ` : ""}
            {merge.contribution}
          </p>
        </div>
      )}

      <div className="four-grid">
        <div className="card">
          <h3>{t("Preserved as true")}</h3>
          {merge.stillValid.length > 0 ? (
            merge.stillValid.map((s) => <div key={s} className="diff-item">{s}</div>)
          ) : (
            <p className="hint">—</p>
          )}
        </div>
        <div className="card">
          <h3>{t("Released as outdated")}</h3>
          {merge.outdatedBeliefs.length > 0 ? (
            merge.outdatedBeliefs.map((s) => <div key={s} className="diff-item">{s}</div>)
          ) : (
            <p className="hint">—</p>
          )}
        </div>
        <div className="card">
          <h3>{t("Left outside control")}</h3>
          {merge.outsideControl.length > 0 ? (
            merge.outsideControl.map((s) => <div key={s} className="diff-item">{s}</div>)
          ) : (
            <p className="hint">—</p>
          )}
        </div>
        <div className="card">
          <h3>{t("Qualities reclaimed")}</h3>
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
          <h3>{t("Stopped running separately")}</h3>
          {merge.released.map((r) => (
            <div key={r} className="diff-item">{r}</div>
          ))}
        </div>
      )}

      {merge.conflicts.length > 0 && (
        <div className="card">
          <h3>{t("Conflicts resolved")}</h3>
          {merge.conflicts.map((c) => (
            <div key={c.id} className="conflict resolved" style={{ marginBottom: "0.75rem" }}>
              <strong>{t(CONFLICT_TYPE_LABELS[c.type])}</strong>
              <div className="demand">{c.demandA}</div>
              <div className="demand">{c.demandB}</div>
              {c.resolution && <p className="calm-note">{c.resolution}</p>}
            </div>
          ))}
        </div>
      )}

      {merge.action && (
        <div className="card">
          <h3>{t("The action it became")}</h3>
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
        {t("This remains part of your history, but it no longer needs to organise today.")}
      </p>
      <button className="btn btn-primary" onClick={() => setView({ kind: "now" })}>
        {t("Return to Now")}
      </button>
    </div>
  );
}
