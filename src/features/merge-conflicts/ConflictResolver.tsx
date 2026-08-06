import { useState } from "react";
import type { MergeConflict } from "@/domain/conflicts/types";
import type { PsychologicalBranch } from "@/domain/branches/types";
import { CONFLICT_TYPE_LABELS, resolveConflict } from "@/domain/conflicts/logic";
import { useT } from "@/i18n/i18n";
import { TagListEditor } from "@/ui/TagListEditor";

type Props = {
  conflict: MergeConflict;
  branches: PsychologicalBranch[];
  onResolved: (resolved: MergeConflict) => void;
};

/** Two valid branches demand incompatible actions. Resolve the conflict. */
export function ConflictResolver({ conflict, branches, onResolved }: Props) {
  const t = useT();
  const [preserved, setPreserved] = useState<string[]>(conflict.preservedTruths);
  const [excesses, setExcesses] = useState<string[]>(conflict.rejectedExcesses);
  const [resolution, setResolution] = useState(conflict.resolution ?? "");
  const involved = branches.filter((b) => conflict.branchIds.includes(b.id));

  const resolved = !!conflict.resolution;

  return (
    <div className={`card conflict ${resolved ? "resolved" : ""}`}>
      <h3>{t(CONFLICT_TYPE_LABELS[conflict.type])}</h3>
      <p className="hint">
        {t("Between {names}", { names: involved.map((b) => b.title).join(t(" and ")) })}
      </p>
      <div className="demand">{conflict.demandA}</div>
      <div className="demand">{conflict.demandB}</div>

      {resolved ? (
        <p className="calm-note">
          {t("Resolved: {resolution}", { resolution: conflict.resolution ?? "" })}
        </p>
      ) : (
        <>
          <TagListEditor
            label={t("What does each thread correctly understand?")}
            values={preserved}
            onChange={setPreserved}
            placeholder={t("A truth worth keeping")}
          />
          <TagListEditor
            label={t("Where is each thread becoming excessive?")}
            values={excesses}
            onChange={setExcesses}
            placeholder={t("A demand that would fragment you")}
          />
          <div className="field">
            <label>
              {t(
                "What action respects both truths without letting either thread control the whole present?",
              )}
            </label>
            <textarea
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
            />
          </div>
          <button
            className="btn btn-primary"
            disabled={!resolution.trim()}
            onClick={() => onResolved(resolveConflict(conflict, resolution.trim(), preserved, excesses))}
          >
            {t("Resolve the conflict")}
          </button>
        </>
      )}
    </div>
  );
}
