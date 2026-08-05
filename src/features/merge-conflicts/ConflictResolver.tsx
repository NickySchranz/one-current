import { useState } from "react";
import type { MergeConflict } from "@/domain/conflicts/types";
import type { PsychologicalBranch } from "@/domain/branches/types";
import { CONFLICT_TYPE_LABELS, resolveConflict } from "@/domain/conflicts/logic";
import { TagListEditor } from "@/ui/TagListEditor";

type Props = {
  conflict: MergeConflict;
  branches: PsychologicalBranch[];
  onResolved: (resolved: MergeConflict) => void;
};

/** Two valid branches demand incompatible actions. Resolve the conflict. */
export function ConflictResolver({ conflict, branches, onResolved }: Props) {
  const [preserved, setPreserved] = useState<string[]>(conflict.preservedTruths);
  const [excesses, setExcesses] = useState<string[]>(conflict.rejectedExcesses);
  const [resolution, setResolution] = useState(conflict.resolution ?? "");
  const involved = branches.filter((b) => conflict.branchIds.includes(b.id));

  const resolved = !!conflict.resolution;

  return (
    <div className={`card conflict ${resolved ? "resolved" : ""}`}>
      <h3>{CONFLICT_TYPE_LABELS[conflict.type]}</h3>
      <p className="hint">
        Between {involved.map((b) => b.title).join(" and ")}
      </p>
      <div className="demand">{conflict.demandA}</div>
      <div className="demand">{conflict.demandB}</div>

      {resolved ? (
        <p className="calm-note">Resolved: {conflict.resolution}</p>
      ) : (
        <>
          <TagListEditor
            label="What does each branch correctly understand?"
            values={preserved}
            onChange={setPreserved}
            placeholder="A truth worth keeping"
          />
          <TagListEditor
            label="Where is each branch becoming excessive?"
            values={excesses}
            onChange={setExcesses}
            placeholder="A demand that would fragment you"
          />
          <div className="field">
            <label>
              What action respects both truths without letting either branch control the whole
              present?
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
            Resolve the conflict
          </button>
        </>
      )}
    </div>
  );
}
