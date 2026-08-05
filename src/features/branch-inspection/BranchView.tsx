import { useMemo, useState } from "react";
import { useAppStore, type View } from "@/stores/app-store";
import { DIFF_CHANGE_OPTIONS, RECLAIMABLE_QUALITIES, type DiffChangeId } from "@/domain/branches/diff";
import type { Controllability } from "@/domain/branches/types";
import { describeBranch } from "@/visualization/a11y/describe";
import { branchColor } from "@/visualization/branch-lines/style";
import { TagListEditor } from "@/ui/TagListEditor";
import { MomentList } from "../branch-moments/MomentList";
import { MomentEditor } from "../branch-moments/MomentEditor";
import { BranchContextStrip } from "./BranchContextStrip";

const EXAMPLE_BELIEFS = [
  "I cannot relax until this is resolved.",
  "My real life begins after this.",
  "I was stronger then.",
  "I need this person's approval.",
  "I have fallen behind.",
  "If I do not control this, something bad will happen.",
];

const CONTROLLABILITY: { id: Controllability; label: string }[] = [
  { id: "changeable", label: "I can change this" },
  { id: "influenceable", label: "I can influence this" },
  { id: "outside-control", label: "This is outside my control" },
  { id: "unclear", label: "Unclear for now" },
];

const VALID_EXAMPLES = [
  "I need connection.",
  "This relationship matters.",
  "My body needs recovery.",
  "A boundary was crossed.",
  "There is still a real task to complete.",
];
const OUTDATED_EXAMPLES = [
  "My life cannot begin yet.",
  "I must solve everything tonight.",
  "I need certainty before acting.",
  "This other person determines my value.",
];
const OUTSIDE_EXAMPLES = [
  "another person's decision",
  "approval",
  "institutional timing",
  "an uncertain outcome",
];

type Props = { view: Extract<View, { kind: "branch" }> };

/** One calm page: the whole line — story, what's still yours, and what happens next. */
export function BranchView({ view }: Props) {
  const branches = useAppStore((s) => s.branches);
  const setView = useAppStore((s) => s.setView);
  const startMerge = useAppStore((s) => s.startMerge);
  const handOffBranch = useAppStore((s) => s.handOffBranch);
  const updateBranch = useAppStore((s) => s.updateBranch);
  const theme = useAppStore((s) => s.theme);
  const branch = useMemo(
    () => branches.find((b) => b.id === view.branchId),
    [branches, view.branchId],
  );

  const [happened, setHappened] = useState(branch?.description ?? "");
  const [belief, setBelief] = useState(branch?.originalBelief ?? "");
  const [currentBelief, setCurrentBelief] = useState(branch?.currentBelief ?? "");
  const [addingMoment, setAddingMoment] = useState(false);

  if (!branch) {
    return (
      <div className="panel">
        <p>This line no longer exists.</p>
      </div>
    );
  }

  const color = branchColor(branch, theme);
  const diffSelected = new Set((branch.diffSelections ?? []) as DiffChangeId[]);
  const pr = branch.preserveRelease ?? {
    stillValid: [],
    outdated: [],
    outsideControl: [],
    reclaimable: [],
  };

  function saveStory() {
    if (!branch) return;
    const patch: Parameters<typeof updateBranch>[1] = {};
    if (happened !== (branch.description ?? "")) patch.description = happened;
    if (belief !== (branch.originalBelief ?? "")) patch.originalBelief = belief;
    if (currentBelief !== (branch.currentBelief ?? "")) {
      patch.currentBelief = currentBelief;
      if (branch.status === "active" || branch.status === "activated") patch.status = "explored";
    }
    if (Object.keys(patch).length > 0) void updateBranch(branch.id, patch);
  }

  function toggleDiff(id: DiffChangeId) {
    if (!branch) return;
    const next = new Set(diffSelected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    void updateBranch(branch.id, {
      diffSelections: [...next],
      status:
        branch.status === "active" || branch.status === "activated" ? "explored" : branch.status,
    });
  }

  function savePr(patch: Partial<typeof pr>) {
    if (!branch) return;
    const next = { ...pr, ...patch };
    void updateBranch(branch.id, {
      preserveRelease: next,
      unmetNeeds: next.stillValid,
      status:
        next.stillValid.length + next.reclaimable.length > 0 && branch.status === "explored"
          ? "ready-to-merge"
          : branch.status,
    });
  }

  return (
    <>
      <BranchContextStrip branch={branch} color={color} />
      <div className="panel">
        <h1>{branch.title}</h1>
        <p className="hint">
          A part of you stayed at an older moment. Take what is still yours; leave the rest where
          it happened. Nothing on this page is required.
        </p>
        <p className="visually-hidden">{describeBranch(branch)}</p>

        <div className="field">
          <TagListEditor
            label="What from this still belongs to you now?"
            values={pr.reclaimable}
            onChange={(v) => savePr({ reclaimable: v })}
            suggestions={RECLAIMABLE_QUALITIES}
            variant="quality"
          />
        </div>

        <details className="optional-details">
          <summary>The story, then and now (optional)</summary>
          <div className="field">
            <textarea
              value={happened}
              onChange={(e) => setHappened(e.target.value)}
              onBlur={saveStory}
              placeholder="What was happening when this line began"
              aria-label="What happened when this branch began"
            />
          </div>
          <div className="tag-row" role="group" aria-label="Example conclusions">
            {EXAMPLE_BELIEFS.map((b) => (
              <button key={b} className="tag" onClick={() => setBelief(b)}>
                {b}
              </button>
            ))}
          </div>
          <div className="field">
            <textarea
              value={belief}
              onChange={(e) => setBelief(e.target.value)}
              onBlur={saveStory}
              placeholder="What you started believing back then"
              aria-label="What did you begin believing?"
            />
          </div>
          <div className="field">
            <label htmlFor="current-belief">What feels true today, in your own words?</label>
            <textarea
              id="current-belief"
              value={currentBelief}
              onChange={(e) => setCurrentBelief(e.target.value)}
              onBlur={saveStory}
              placeholder={branch.originalBelief ? `Then: “${branch.originalBelief}”` : undefined}
            />
          </div>
          <p className="hint">If any of these have changed since then, mark them.</p>
          <div className="tag-row" role="group" aria-label="What has changed">
            {DIFF_CHANGE_OPTIONS.map((o) => (
              <button
                key={o.id}
                className="chip"
                aria-pressed={diffSelected.has(o.id)}
                onClick={() => toggleDiff(o.id)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </details>

        <details className="optional-details">
          <summary>
            Moments on this line
            {branch.commits.length > 0 ? ` (${branch.commits.length})` : ""}
          </summary>
          <MomentList branch={branch} />
          {addingMoment ? (
            <MomentEditor branchId={branch.id} onDone={() => setAddingMoment(false)} />
          ) : (
            <button className="btn" onClick={() => setAddingMoment(true)}>
              Add a moment
            </button>
          )}
        </details>

        <details className="optional-details">
          <summary>Sort more precisely (optional)</summary>
          <div className="field">
            <TagListEditor
              label="Still true and worth keeping"
              values={pr.stillValid}
              onChange={(v) => savePr({ stillValid: v })}
              suggestions={VALID_EXAMPLES}
            />
          </div>
          <div className="field">
            <TagListEditor
              label="No longer fits reality"
              values={pr.outdated}
              onChange={(v) => savePr({ outdated: v })}
              suggestions={OUTDATED_EXAMPLES}
            />
          </div>
          <div className="field">
            <TagListEditor
              label="Outside your control"
              values={pr.outsideControl}
              onChange={(v) => savePr({ outsideControl: v })}
              suggestions={OUTSIDE_EXAMPLES}
            />
          </div>
          <div className="field">
            <label>How much of this can you actually move?</label>
            <div className="tag-row" role="group" aria-label="Controllability">
              {CONTROLLABILITY.map((c) => (
                <button
                  key={c.id}
                  className={`tag ${branch.controllability === c.id ? "quality" : ""}`}
                  aria-pressed={branch.controllability === c.id}
                  onClick={() => updateBranch(branch.id, { controllability: c.id })}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </details>

        <p className="prompt">What should happen with this line?</p>

        <button
          className="branch-chip"
          onClick={() => startMerge([branch.id])}
          disabled={branch.status === "merged"}
        >
          <div>
            <strong>Fold it back into your line</strong>
            <p className="hint" style={{ margin: 0 }}>
              Keep what matters, release the rest, and let this line end at a merge point.
            </p>
          </div>
        </button>

        <button
          className="branch-chip"
          onClick={() => setView({ kind: "waiting-setup", branchId: branch.id })}
        >
          <div>
            <strong>Place in deliberate waiting</strong>
            <p className="hint" style={{ margin: 0 }}>
              Reality is unresolved. Set boundaries and a review condition, then keep living.
            </p>
          </div>
        </button>

        <button
          className="branch-chip"
          onClick={() => handOffBranch(branch.id)}
          disabled={branch.status === "converted-to-project"}
        >
          <div>
            <strong>This is real work now</strong>
            <p className="hint" style={{ margin: 0 }}>
              It leaves your head and moves to where your tasks live. The line ends here.
            </p>
          </div>
        </button>

        <button
          className="branch-chip"
          onClick={() => updateBranch(branch.id, { status: "needs-support" })}
        >
          <div>
            <strong>This may need support</strong>
            <p className="hint" style={{ margin: 0 }}>
              Some lines are carried best with another person — a friend, a group, or a
              professional.
            </p>
          </div>
        </button>

        {branch.status === "needs-support" && (
          <p className="calm-note">
            Marked as needing support. Bringing this to someone you trust is a form of action, not
            a failure of the line.
          </p>
        )}
      </div>
    </>
  );
}
