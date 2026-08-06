import { useMemo, useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { DIFF_CHANGE_OPTIONS, RECLAIMABLE_QUALITIES, type DiffChangeId } from "@/domain/branches/diff";
import type { Controllability, PsychologicalBranch } from "@/domain/branches/types";
import { ANXIETIES, suggestLockedFeelings } from "@/domain/feelings/logic";
import { describeBranch } from "@/visualization/a11y/describe";
import { useT } from "@/i18n/i18n";
import { TagListEditor } from "@/ui/TagListEditor";
import { FeelingPicker } from "@/features/branch-touch/FeelingPicker";
import { MomentList } from "../branch-moments/MomentList";
import { MomentEditor } from "../branch-moments/MomentEditor";

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

type Props = { branchId: string };

/** One calm view of the whole line — story, what's still yours, and what happens next. */
export function BranchView({ branchId }: Props) {
  const t = useT();
  const branches = useAppStore((s) => s.branches);
  const updateBranch = useAppStore((s) => s.updateBranch);
  const createTodayAction = useAppStore((s) => s.createTodayAction);
  const branch = useMemo(
    () => branches.find((b) => b.id === branchId),
    [branches, branchId],
  );

  const [happened, setHappened] = useState(branch?.description ?? "");
  const [belief, setBelief] = useState(branch?.originalBelief ?? "");
  const [currentBelief, setCurrentBelief] = useState(branch?.currentBelief ?? "");
  const [addingMoment, setAddingMoment] = useState(false);
  const [step, setStep] = useState("");
  const [stepMade, setStepMade] = useState(false);
  // The less-available feelings follow what it stirs until adjusted by hand.
  const [occupiesCustom, setOccupiesCustom] = useState(false);

  if (!branch) {
    return (
      <div className="panel">
        <p>{t("This thread no longer exists.")}</p>
      </div>
    );
  }

  const forkWhen =
    branch.forkLabel ??
    new Date(branch.forkDate + "T00:00:00").toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });
  const today = new Date().toLocaleDateString(undefined, { month: "long", day: "numeric" });

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

  function toggleAnxiety(a: string) {
    if (!branch) return;
    const current = branch.anxieties ?? [];
    const next = current.includes(a) ? current.filter((x) => x !== a) : [...current, a];
    const patch: Partial<PsychologicalBranch> = { anxieties: next };
    if (!occupiesCustom) patch.occupies = suggestLockedFeelings(next);
    void updateBranch(branch.id, patch);
  }

  function toggleOccupies(f: string) {
    if (!branch) return;
    setOccupiesCustom(true);
    const current = branch.occupies ?? [];
    const next = current.includes(f) ? current.filter((x) => x !== f) : [...current, f];
    void updateBranch(branch.id, { occupies: next });
  }

  return (
    <>
      <div className="panel">
        <h1>{branch.title}</h1>
        <p className="hint">
          {t(
            "This thread split off {when} and reaches Now. Take what is still yours; leave the rest where it happened. Nothing here is required.",
            { when: forkWhen },
          )}
        </p>
        <p className="visually-hidden">{describeBranch(branch, t)}</p>

        <div className="field">
          <TagListEditor
            label={t("What from this still belongs to you now?")}
            values={pr.reclaimable}
            onChange={(v) => savePr({ reclaimable: v })}
            suggestions={RECLAIMABLE_QUALITIES}
            variant="quality"
          />
        </div>

        <details className="optional-details">
          <summary>{t("Compare where it began with Now (optional)")}</summary>
          <p className="hint">
            {t("Two points on the same thread: where it began, and where you actually are.")}
          </p>
          <div className="compare-grid">
            <div className="compare-card" aria-label={t("Where it began")}>
              <p className="compare-anchor">{t("Where it began · {date}", { date: forkWhen })}</p>
              <div className="field">
                <textarea
                  value={happened}
                  onChange={(e) => setHappened(e.target.value)}
                  onBlur={saveStory}
                  placeholder={t("What was happening when this thread began")}
                  aria-label={t("What happened when this thread began")}
                />
              </div>
              <div className="field">
                <textarea
                  value={belief}
                  onChange={(e) => setBelief(e.target.value)}
                  onBlur={saveStory}
                  placeholder={t("What did you begin believing at the time?")}
                  aria-label={t("What did you begin believing at the time?")}
                />
              </div>
              <div className="tag-row" role="group" aria-label={t("Example conclusions")}>
                {EXAMPLE_BELIEFS.map((b) => (
                  <button key={b} className="tag" onClick={() => setBelief(b)}>
                    {t(b)}
                  </button>
                ))}
              </div>
            </div>
            <div className="compare-card" aria-label={t("At Now")}>
              <p className="compare-anchor">{t("At Now · {date}", { date: today })}</p>
              <div className="field">
                <label htmlFor="current-belief">
                  {t("What feels true today, in your own words?")}
                </label>
                <textarea
                  id="current-belief"
                  value={currentBelief}
                  onChange={(e) => setCurrentBelief(e.target.value)}
                  onBlur={saveStory}
                  placeholder={
                    branch.originalBelief
                      ? t("Then: “{belief}”", { belief: branch.originalBelief })
                      : undefined
                  }
                />
              </div>
            </div>
          </div>
          <p className="hint">{t("If any of these have changed since it began, mark them.")}</p>
          <div className="tag-row" role="group" aria-label={t("What has changed")}>
            {DIFF_CHANGE_OPTIONS.map((o) => (
              <button
                key={o.id}
                className="chip"
                aria-pressed={diffSelected.has(o.id)}
                onClick={() => toggleDiff(o.id)}
              >
                {t(o.label)}
              </button>
            ))}
          </div>
        </details>

        <details className="optional-details">
          <summary>{t("What it stirs, and what feels less available (optional)")}</summary>
          <p className="hint">
            {t("Tap what's true. Naming it is how the thread starts loosening.")}
          </p>
          <FeelingPicker
            options={ANXIETIES}
            selected={branch.anxieties ?? []}
            onToggle={toggleAnxiety}
            label={t("What this thread makes you feel")}
          />
          {(branch.anxieties ?? []).length > 0 && (
            <>
              <p className="prompt" style={{ marginTop: "0.75rem" }}>
                {t("What feels less available while this thread is active?")}
              </p>
              <p className="hint">
                {t(
                  "You selected these; adjust freely. They return to your main line each time you decide something about the thread.",
                )}
              </p>
              <FeelingPicker
                selected={branch.occupies ?? []}
                onToggle={toggleOccupies}
                label={t("What feels less available while this thread is active")}
              />
            </>
          )}
        </details>

        <details className="optional-details">
          <summary>
            {t("Moments on this thread")}
            {branch.commits.length > 0 ? ` (${branch.commits.length})` : ""}
          </summary>
          <MomentList branch={branch} />
          {addingMoment ? (
            <MomentEditor branchId={branch.id} onDone={() => setAddingMoment(false)} />
          ) : (
            <button className="btn" onClick={() => setAddingMoment(true)}>
              {t("Add a moment")}
            </button>
          )}
        </details>

        <details className="optional-details">
          <summary>{t("Where should each part go? (optional)")}</summary>
          <p className="hint">
            {t("Everything on this thread has a destination. Nothing is deleted; it is placed.")}
          </p>
          <div className="field">
            <TagListEditor
              label={t("Carry forward — still true, comes with you")}
              values={pr.stillValid}
              onChange={(v) => savePr({ stillValid: v })}
              suggestions={VALID_EXAMPLES}
            />
          </div>
          <div className="field">
            <TagListEditor
              label={t("Leave in history — no longer fits reality")}
              values={pr.outdated}
              onChange={(v) => savePr({ outdated: v })}
              suggestions={OUTDATED_EXAMPLES}
            />
          </div>
          <div className="field">
            <TagListEditor
              label={t("Outside my control — not yours to carry")}
              values={pr.outsideControl}
              onChange={(v) => savePr({ outsideControl: v })}
              suggestions={OUTSIDE_EXAMPLES}
            />
            <div className="tag-row" role="group" aria-label={t("Controllability")}>
              {CONTROLLABILITY.map((c) => (
                <button
                  key={c.id}
                  className={`tag ${branch.controllability === c.id ? "quality" : ""}`}
                  aria-pressed={branch.controllability === c.id}
                  onClick={() => updateBranch(branch.id, { controllability: c.id })}
                >
                  {t(c.label)}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label htmlFor="pr-step">{t("Needs a real action — one honest step")}</label>
            {stepMade ? (
              <p className="calm-note">
                {t("Placed on today. It will show as your current action.")}
              </p>
            ) : (
              <div className="touch-input-row">
                <input
                  id="pr-step"
                  value={step}
                  onChange={(e) => setStep(e.target.value)}
                  placeholder={t("e.g. send the one email")}
                />
                <button
                  className="btn"
                  disabled={!step.trim()}
                  onClick={async () => {
                    await createTodayAction(branch.id, step.trim());
                    setStep("");
                    setStepMade(true);
                  }}
                >
                  {t("Make it today's action")}
                </button>
              </div>
            )}
          </div>
        </details>

        {branch.status === "needs-support" && (
          <p className="calm-note">
            {t(
              "Marked as carried with support. Bringing this to someone you trust is a form of action, not a failure of the thread.",
            )}
          </p>
        )}
      </div>
    </>
  );
}
