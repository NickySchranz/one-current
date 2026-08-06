import { useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { TagListEditor } from "@/ui/TagListEditor";
import { RECLAIMABLE_QUALITIES } from "@/domain/branches/diff";

type Props = { branchId: string };

/** Deliberate waiting: boundaries around an unresolved reality. */
export function WaitingSetup({ branchId }: Props) {
  const branch = useAppStore((s) => s.branches.find((b) => b.id === branchId));
  const placeInWaiting = useAppStore((s) => s.placeInWaiting);
  const setOperation = useAppStore((s) => s.setOperation);

  const [awaiting, setAwaiting] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [outside, setOutside] = useState<string[]>(branch?.preserveRelease?.outsideControl ?? []);
  const [reviewDate, setReviewDate] = useState("");
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
  }

  if (done) {
    return (
      <div className="panel">
        <h1>{branch.title}</h1>
        <p className="calm-note">
          Nothing further is required from you until the review condition occurs.
        </p>
        <button className="btn btn-primary" onClick={() => setOperation({ kind: "idle" })}>
          Return to Now
        </button>
      </div>
    );
  }

  return (
    <div className="panel">
      <h1>Deliberate waiting</h1>
      <p className="hint">
        {branch.title} — the line stays connected to Now, but stops pulling continuously.
      </p>
      <div className="field">
        <label htmlFor="awaiting">What is being awaited?</label>
        <input id="awaiting" value={awaiting} onChange={(e) => setAwaiting(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="action-taken">What action have you already taken?</label>
        <input id="action-taken" value={actionTaken} onChange={(e) => setActionTaken(e.target.value)} />
      </div>
      <TagListEditor
        label="What remains outside your control?"
        values={outside}
        onChange={setOutside}
      />
      <div className="field">
        <label htmlFor="review-date">Next review date</label>
        <input
          id="review-date"
          type="date"
          min={new Date().toISOString().slice(0, 10)}
          value={reviewDate}
          onChange={(e) => setReviewDate(e.target.value)}
        />
      </div>
      <TagListEditor
        label="What new information would justify reopening earlier?"
        values={reopen}
        onChange={setReopen}
        placeholder="e.g. a new request arrives, the deadline passes"
      />
      <TagListEditor
        label="What will you continue living in the meantime?"
        values={meanwhile}
        onChange={setMeanwhile}
        placeholder="e.g. work, training, the relationship"
      />
      <TagListEditor
        label="Which qualities will you no longer store entirely inside the outcome?"
        values={reclaimed}
        onChange={setReclaimed}
        suggestions={RECLAIMABLE_QUALITIES}
        variant="quality"
      />
      <div className="stage-nav">
        <button className="btn btn-quiet" onClick={() => setOperation({ kind: "inspecting-branch", branchId, depth: "deep" })}>
          Back
        </button>
        <button className="btn btn-primary" disabled={!valid || busy} onClick={save}>
          Begin waiting with boundaries
        </button>
      </div>
    </div>
  );
}
