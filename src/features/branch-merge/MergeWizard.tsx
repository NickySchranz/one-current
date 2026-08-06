import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/stores/app-store";
import type { PsychologicalBranch } from "@/domain/branches/types";
import type { MergeConflict } from "@/domain/conflicts/types";
import type { MergeResultStatus } from "@/domain/merges/types";
import { detectConflicts, unresolvedConflicts } from "@/domain/conflicts/logic";
import { composeIntegratedAction, type ComposeActionInput } from "@/domain/actions/logic";
import { RECLAIMABLE_QUALITIES } from "@/domain/branches/diff";
import { useT } from "@/i18n/i18n";
import { TagListEditor } from "@/ui/TagListEditor";
import { ConflictResolver } from "../merge-conflicts/ConflictResolver";
import { ActionComposer } from "./ActionComposer";

const RELEASE_EXAMPLES = [
  "repeated checking",
  "comparison with a past self",
  "imaginary conversations",
  "trying to control another person",
  "postponing life",
  "reopening the same decision",
];

type Props = { branchIds: string[] };

/** One screen: what returns with you, one present action, merge. */
export function MergeWizard({ branchIds }: Props) {
  const t = useT();
  const allBranches = useAppStore((s) => s.branches);
  const mergeDraft = useAppStore((s) => s.mergeDraft);
  const saveMergeDraft = useAppStore((s) => s.saveMergeDraft);
  const cancelMerge = useAppStore((s) => s.cancelMerge);
  const completeMerge = useAppStore((s) => s.completeMerge);
  const startMerge = useAppStore((s) => s.startMerge);

  const branches = useMemo(
    () => branchIds.map((id) => allBranches.find((b) => b.id === id)).filter((b): b is PsychologicalBranch => !!b),
    [branchIds, allBranches],
  );

  const combined = useMemo(() => {
    const merge = (key: "stillValid" | "outdated" | "outsideControl" | "reclaimable") =>
      [...new Set(branches.flatMap((b) => b.preserveRelease?.[key] ?? []))];
    return {
      stillValid: merge("stillValid"),
      outdated: merge("outdated"),
      outsideControl: merge("outsideControl"),
      reclaimable: merge("reclaimable"),
    };
  }, [branches]);

  // Sorted during inspection; carried straight through here.
  const [stillValid] = useState<string[]>(mergeDraft?.partial.stillValid ?? combined.stillValid);
  const [outdated] = useState<string[]>(mergeDraft?.partial.outdatedBeliefs ?? combined.outdated);
  const [outsideControl] = useState<string[]>(
    mergeDraft?.partial.outsideControl ?? combined.outsideControl,
  );
  const [reclaimable, setReclaimable] = useState<string[]>(
    mergeDraft?.partial.reclaimedQualities ?? combined.reclaimable,
  );
  const [conflicts, setConflicts] = useState<MergeConflict[]>(
    () => mergeDraft?.partial.conflicts ?? detectConflicts(branches),
  );
  const [released, setReleased] = useState<string[]>(mergeDraft?.partial.released ?? []);
  const [contribution, setContribution] = useState(mergeDraft?.partial.contribution ?? "");
  // The outcome was decided before arriving here ("what is true now?").
  const [outcome, setOutcome] = useState<MergeResultStatus>(
    mergeDraft?.partial.resultStatus ?? "merged",
  );
  const [actionInput, setActionInput] = useState<Omit<
    ComposeActionInput,
    "branches" | "qualitiesCarried" | "mergeId"
  > | null>(null);
  const [busy, setBusy] = useState(false);

  // Ensure a draft exists (restores interrupted merges after reload).
  useEffect(() => {
    if (!mergeDraft) void startMerge(branchIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mergeDraft) return;
    void saveMergeDraft({
      ...mergeDraft,
      stage: "merge",
      partial: {
        stillValid,
        outdatedBeliefs: outdated,
        outsideControl,
        reclaimedQualities: reclaimable,
        conflicts,
        contribution,
        released,
        resultStatus: outcome,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stillValid, outdated, outsideControl, reclaimable, conflicts, contribution, released, outcome]);

  if (branches.length === 0) {
    return (
      <div className="panel">
        <p>{t("These threads are no longer available.")}</p>
      </div>
    );
  }

  const open = unresolvedConflicts(conflicts);
  const canCarryAction = outcome === "merged" || outcome === "partly-merged";
  const ready = open.length === 0;

  async function finish() {
    if (busy || !ready) return;
    setBusy(true);
    try {
      const resolution =
        conflicts.map((c) => c.resolution).filter(Boolean).join(" ") ||
        contribution ||
        "Brought back into the present.";
      const action =
        canCarryAction && actionInput
          ? composeIntegratedAction({
              ...actionInput,
              branches,
              qualitiesCarried: reclaimable,
            })
          : undefined;
      await completeMerge({
        branches,
        preserveRelease: { stillValid, outdated, outsideControl, reclaimable },
        conflicts,
        resolution,
        contribution: contribution || undefined,
        released,
        action,
        resultStatus: outcome,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel">
      <h1>{t("Bring it back to Now")}</h1>
      <p className="hint">
        {branches.length === 1
          ? branches[0].title
          : t("{n} threads entering the present together", { n: branches.length })}
      </p>
      <p className="calm-note">
        {branches.length === 1
          ? t("This thread is complete for now.")
          : t("These threads are complete for now.")}{" "}
        {t(
          "Nothing valuable is lost — what still matters crosses into the present with you, and the rest stays in the past, where it happened. If it returns, you can meet the new version of it.",
        )}
      </p>

      {conflicts.length > 0 && (
        <section aria-label={t("Conflicts")}>
          <p className="prompt">
            {conflicts.length === 1
              ? t(
                  "Two of these pulls ask for opposite things. Decide what the present must honour.",
                )
              : t(
                  "Some of these pulls ask for opposite things. Decide what the present must honour.",
                )}
          </p>
          {conflicts.map((c) => (
            <ConflictResolver
              key={c.id}
              conflict={c}
              branches={branches}
              onResolved={(resolved) =>
                setConflicts(conflicts.map((x) => (x.id === resolved.id ? resolved : x)))
              }
            />
          ))}
        </section>
      )}

      <div className="field">
        <TagListEditor
          label={t("What returns with you")}
          values={reclaimable}
          onChange={setReclaimable}
          suggestions={RECLAIMABLE_QUALITIES}
          variant="quality"
        />
      </div>

      <details className="optional-details">
        <summary>{t("What quiets down when you bring it back (optional)")}</summary>
        <div className="field">
          <TagListEditor
            label={t("Mental processes that can stop running now")}
            values={released}
            onChange={setReleased}
            suggestions={RELEASE_EXAMPLES}
          />
        </div>
        <div className="field">
          <label htmlFor="merge-words">
            {t("In your own words, what did this time away give you?")}
          </label>
          <textarea
            id="merge-words"
            value={contribution}
            onChange={(e) => setContribution(e.target.value)}
          />
        </div>
      </details>

      {canCarryAction && (
        <details className="optional-details">
          <summary>{t("One small step to carry it (optional)")}</summary>
          <ActionComposer
            branches={branches}
            qualitiesCarried={reclaimable}
            onChange={setActionInput}
          />
        </details>
      )}

      <label className="hint partial-toggle">
        <input
          type="checkbox"
          style={{ width: "auto", minHeight: 0 }}
          checked={outcome === "partly-merged"}
          onChange={(e) => setOutcome(e.target.checked ? "partly-merged" : "merged")}
        />
        {t("Only part of it comes back for now — the rest stays with less pull")}
      </label>

      <div className="stage-nav">
        <button className="btn btn-quiet" onClick={cancelMerge}>
          {t("Set aside for now")}
        </button>
        <button
          className="btn btn-primary btn-large"
          disabled={!ready || busy}
          onClick={finish}
        >
          {open.length > 0
            ? t(
                open.length === 1
                  ? "1 conflict to settle first"
                  : "{n} conflicts to settle first",
                { n: open.length },
              )
            : t("Bring it back to Now")}
        </button>
      </div>
    </div>
  );
}
