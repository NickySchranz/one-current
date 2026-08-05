import { useState } from "react";
import { useAppStore, type View } from "@/stores/app-store";
import {
  RECURRENCE_REASONS,
  recommendForRecurrence,
  type RecurrenceReasonId,
} from "@/domain/branches/recurrence";

type Props = { view: Extract<View, { kind: "recurrence" }> };

/** A new concern resembles a branch merged before. Recurrence is not failure. */
export function RecurrenceCheck({ view }: Props) {
  const branches = useAppStore((s) => s.branches);
  const createBranchNow = useAppStore((s) => s.createBranchNow);
  const recordRecurrenceOn = useAppStore((s) => s.recordRecurrenceOn);
  const addMoment = useAppStore((s) => s.addMoment);
  const updateBranch = useAppStore((s) => s.updateBranch);
  const setView = useAppStore((s) => s.setView);

  const matched = branches.find((b) => b.id === view.matchedBranchId);
  const [reason, setReason] = useState<RecurrenceReasonId | null>(null);
  const [busy, setBusy] = useState(false);

  if (!matched) return null;

  async function proceed() {
    if (!reason || busy || !matched) return;
    setBusy(true);
    await recordRecurrenceOn(matched.id);
    const rec = recommendForRecurrence(reason);

    if (rec === "new-branch") {
      const branch = await createBranchNow(view.pending);
      setView({ kind: "branch", branchId: branch.id, stage: "fork" });
    } else if (rec === "add-moment") {
      await addMoment({
        branchId: matched.id,
        date: new Date().toISOString().slice(0, 10),
        title: view.pending.title,
        type: "intensification",
        description: `Returned: ${RECURRENCE_REASONS.find((r) => r.id === reason)?.label}`,
      });
      setView({ kind: "branch", branchId: matched.id, stage: "fork" });
    } else if (rec === "reopen-waiting") {
      await updateBranch(matched.id, { status: "active", lastActivatedAt: new Date().toISOString() });
      setView({ kind: "branch", branchId: matched.id, stage: "difference" });
    } else if (rec === "new-conflict") {
      await updateBranch(matched.id, { status: "active" });
      setView({ kind: "merge", branchIds: [matched.id] });
    } else {
      await updateBranch(matched.id, { status: "needs-support" });
      setView({ kind: "branch", branchId: matched.id, stage: "decide" });
    }
  }

  return (
    <div className="panel">
      <p className="prompt">This resembles a branch you merged before.</p>
      <div className="card sunken">
        <strong>{matched.title}</strong>
        <p className="hint">
          Merged {matched.mergeDate ?? "earlier"} · returned {matched.recurrenceCount} time
          {matched.recurrenceCount === 1 ? "" : "s"} before
        </p>
      </div>
      <p className="calm-note">
        Returning does not mean the previous merge was false. Something new may be asking for
        attention.
      </p>
      <p className="prompt">What is different now?</p>
      <div className="choice-grid">
        {RECURRENCE_REASONS.map((r) => (
          <button
            key={r.id}
            className="choice"
            aria-pressed={reason === r.id}
            onClick={() => setReason(r.id)}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div className="stage-nav">
        <button
          className="btn btn-quiet"
          onClick={async () => {
            // Treat it as genuinely new anyway.
            const branch = await createBranchNow(view.pending);
            setView({ kind: "branch", branchId: branch.id, stage: "fork" });
          }}
        >
          It is something new
        </button>
        <button className="btn btn-primary" disabled={!reason || busy} onClick={proceed}>
          Continue
        </button>
      </div>
    </div>
  );
}
