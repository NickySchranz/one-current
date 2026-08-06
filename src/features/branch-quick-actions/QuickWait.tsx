import { useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { useT } from "@/i18n/i18n";
import { TagListEditor } from "@/ui/TagListEditor";
import { RECLAIMABLE_QUALITIES } from "@/domain/branches/diff";

type Props = { branchId: string };

/** Deliberate waiting in three honest inputs. Boundaries are optional depth. */
export function QuickWait({ branchId }: Props) {
  const branch = useAppStore((s) => s.branches.find((b) => b.id === branchId));
  const placeInWaiting = useAppStore((s) => s.placeInWaiting);
  const setOperation = useAppStore((s) => s.setOperation);
  const t = useT();

  const [awaiting, setAwaiting] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [reviewDate, setReviewDate] = useState("");
  // Stronger boundaries, only if wanted.
  const [outside, setOutside] = useState<string[]>([]);
  const [reopen, setReopen] = useState<string[]>([]);
  const [meanwhile, setMeanwhile] = useState<string[]>([]);
  const [reclaimed, setReclaimed] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (!branch) return null;

  const valid = awaiting.trim() && actionTaken.trim() && reviewDate;

  async function save() {
    if (!valid || busy) return;
    setBusy(true);
    try {
      await placeInWaiting({
        branchId,
        awaiting,
        actionTaken,
        outsideControl: outside,
        reviewDate,
        reopenConditions: reopen,
        continueMeanwhile: meanwhile,
        reclaimedNow: reclaimed,
      });
      setDone(true);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="panel">
        <p className="calm-note">
          {t("Nothing further is required from you until the review point.")}
        </p>
        <button className="btn btn-primary" onClick={() => setOperation({ kind: "idle" })}>
          {t("Return to timeline")}
        </button>
      </div>
    );
  }

  return (
    <div className="panel">
      <p className="touch-sheet-title">
        <strong>{branch.title}</strong>
      </p>
      <p className="prompt">{t("Stop carrying what cannot move yet.")}</p>
      <div className="field">
        <label htmlFor="qw-awaiting">{t("What are you waiting for?")}</label>
        <input id="qw-awaiting" value={awaiting} onChange={(e) => setAwaiting(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="qw-action">{t("What have you already done?")}</label>
        <input
          id="qw-action"
          value={actionTaken}
          onChange={(e) => setActionTaken(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="qw-review">{t("When will you check again?")}</label>
        <input
          id="qw-review"
          type="date"
          min={new Date().toISOString().slice(0, 10)}
          value={reviewDate}
          onChange={(e) => setReviewDate(e.target.value)}
        />
      </div>
      <details className="optional-details">
        <summary>{t("Set stronger boundaries (optional)")}</summary>
        <TagListEditor
          label={t("What remains outside your control?")}
          values={outside}
          onChange={setOutside}
        />
        <TagListEditor
          label={t("What new information would justify reopening earlier?")}
          values={reopen}
          onChange={setReopen}
          placeholder={t("e.g. a new request arrives, the deadline passes")}
        />
        <TagListEditor
          label={t("What will you continue living in the meantime?")}
          values={meanwhile}
          onChange={setMeanwhile}
          placeholder={t("e.g. work, training, the relationship")}
        />
        <TagListEditor
          label={t("Which qualities come back to you now, ahead of the outcome?")}
          values={reclaimed}
          onChange={setReclaimed}
          suggestions={RECLAIMABLE_QUALITIES}
          variant="quality"
        />
      </details>
      <div className="stage-nav">
        <button
          className="btn btn-quiet"
          onClick={() => setOperation({ kind: "quick-touch", branchId })}
        >
          {t("Back")}
        </button>
        <button className="btn btn-primary" disabled={!valid || busy} onClick={save}>
          {t("Begin waiting")}
        </button>
      </div>
    </div>
  );
}
