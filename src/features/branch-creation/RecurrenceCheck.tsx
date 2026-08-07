import { useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { useT } from "@/i18n/i18n";
import type { CreateBranchInput } from "@/stores/app-store";
import { appNow } from "@/domain/time/clock";
import {
  RECURRENCE_REASONS,
  recommendForRecurrence,
  type RecurrenceReasonId,
} from "@/domain/branches/recurrence";

type Props = { matchedBranchId: string; pending: CreateBranchInput };

/** A new concern resembles a thread integrated before. Recurrence is not failure. */
export function RecurrenceCheck({ matchedBranchId, pending }: Props) {
  const branches = useAppStore((s) => s.branches);
  const createBranchNow = useAppStore((s) => s.createBranchNow);
  const recordRecurrenceOn = useAppStore((s) => s.recordRecurrenceOn);
  const addMoment = useAppStore((s) => s.addMoment);
  const updateBranch = useAppStore((s) => s.updateBranch);
  const setOperation = useAppStore((s) => s.setOperation);
  const t = useT();

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
      setOperation({ kind: "quick-touch", branchId: branch.id });
    } else if (rec === "add-moment") {
      await addMoment({
        branchId: matched.id,
        date: appNow().toISOString().slice(0, 10),
        title: pending.title,
        type: "intensification",
        description: t("Returned: {reason}", {
          reason: t(RECURRENCE_REASONS.find((r) => r.id === reason)?.label ?? ""),
        }),
      });
      setOperation({ kind: "quick-touch", branchId: matched.id });
    } else if (rec === "reopen") {
      await updateBranch(matched.id, { status: "active", lastActivatedAt: appNow().toISOString() });
      setOperation({ kind: "quick-touch", branchId: matched.id });
    } else if (rec === "new-conflict") {
      await updateBranch(matched.id, { status: "active" });
      setOperation({ kind: "quick-merge", branchId: matched.id });
    } else {
      await updateBranch(matched.id, { status: "needs-support" });
      setOperation({ kind: "seeking-support", branchId: matched.id });
    }
  }

  return (
    <div className="panel">
      <p className="prompt">{t("This resembles a thread you integrated before.")}</p>
      <div className="card sunken">
        <strong>{matched.title}</strong>
        <p className="hint">
          {t(
            matched.recurrenceCount === 1
              ? "Integrated {date} · returned {n} time before"
              : "Integrated {date} · returned {n} times before",
            { date: matched.mergeDate ?? t("earlier"), n: matched.recurrenceCount },
          )}
        </p>
      </div>
      <p className="calm-note">
        {t(
          "Returning does not mean it was integrated too soon. Something new may be asking for attention.",
        )}
      </p>
      <p className="prompt">{t("What is different now?")}</p>
      <div className="choice-grid">
        {RECURRENCE_REASONS.map((r) => (
          <button
            key={r.id}
            className="choice"
            aria-pressed={reason === r.id}
            onClick={() => setReason(r.id)}
          >
            {t(r.label)}
          </button>
        ))}
      </div>
      <div className="stage-nav">
        <button
          className="btn btn-quiet"
          onClick={async () => {
            // Treat it as genuinely new anyway.
            const branch = await createBranchNow(pending);
            setOperation({ kind: "quick-touch", branchId: branch.id });
          }}
        >
          {t("It is something new")}
        </button>
        <button className="btn btn-primary" disabled={!reason || busy} onClick={proceed}>
          {t("Continue")}
        </button>
      </div>
    </div>
  );
}
