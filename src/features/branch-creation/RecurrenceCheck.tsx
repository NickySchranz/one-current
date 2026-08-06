import { useState } from "react";
import { useAppStore } from "@/stores/app-store";
import type { CreateBranchInput } from "@/stores/app-store";
import {
  RECURRENCE_REASONS,
  recommendForRecurrence,
  type RecurrenceReasonId,
} from "@/domain/branches/recurrence";

type Props = { matchedBranchId: string; pending: CreateBranchInput };

/** A new concern resembles a branch merged before. Recurrence is not failure. */
export function RecurrenceCheck({ matchedBranchId, pending }: Props) {
  const branches = useAppStore((s) => s.branches);
  const createBranchNow = useAppStore((s) => s.createBranchNow);
  const recordRecurrenceOn = useAppStore((s) => s.recordRecurrenceOn);
  const addMoment = useAppStore((s) => s.addMoment);
  const updateBranch = useAppStore((s) => s.updateBranch);
  const setOperation = useAppStore((s) => s.setOperation);

  const matched = branches.find((b) => b.id === matchedBranchId);
  const [reason, setReason] = useState<RecurrenceReasonId | null>(null);
  const [busy, setBusy] = useState(false);

  if (!matched) return null;

  async function proceed() {
    if (!reason || busy || !matched) return;
    setBusy(true);
    await recordRecurrenceOn(matched.id);
    const rec = recommendForRecurrence(reason);

    if (rec === "new-branch") {
      const branch = await createBranchNow(pending);
      setOperation({ kind: "inspecting-branch", branchId: branch.id, depth: "deep" });
    } else if (rec === "add-moment") {
      await addMoment({
        branchId: matched.id,
        date: new Date().toISOString().slice(0, 10),
        title: pending.title,
        type: "intensification",
        description: `Returned: ${RECURRENCE_REASONS.find((r) => r.id === reason)?.label}`,
      });
      setOperation({ kind: "inspecting-branch", branchId: matched.id, depth: "deep" });
    } else if (rec === "reopen-waiting") {
      await updateBranch(matched.id, { status: "active", lastActivatedAt: new Date().toISOString() });
      setOperation({ kind: "inspecting-branch", branchId: matched.id, depth: "deep" });
    } else if (rec === "new-conflict") {
      await updateBranch(matched.id, { status: "active" });
      setOperation({ kind: "merging-branch", branchIds: [matched.id] });
    } else {
      await updateBranch(matched.id, { status: "needs-support" });
      setOperation({ kind: "inspecting-branch", branchId: matched.id, depth: "deep" });
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
            const branch = await createBranchNow(pending);
            setOperation({ kind: "inspecting-branch", branchId: branch.id, depth: "deep" });
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
