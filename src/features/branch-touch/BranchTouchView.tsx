import { useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { branchColor } from "@/visualization/branch-lines/style";
import { isClosed, isWaiting, isoDate } from "@/domain/branches/logic";
import { decidedToday } from "@/domain/feelings/logic";
import { BranchContextStrip } from "@/features/branch-inspection/BranchContextStrip";
import { FeelingPicker } from "./FeelingPicker";

type Props = {
  branchId: string;
  /** Rendered as a bottom sheet over the timeline instead of a full page. */
  sheet?: boolean;
};
type Mode = "idle" | "moment" | "act" | "merge";
type Done = "moment" | "act" | "leave" | "merge" | null;

function toggleIn(list: string[], item: string): string[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

/**
 * The everyday touch-point for a branch: note a moment, do one small thing
 * today, deliberately leave it — or fold it back for good. Taking any
 * decision makes it pull less and returns what it holds to the main line.
 */
export function BranchTouchView({ branchId, sheet = false }: Props) {
  const branches = useAppStore((s) => s.branches);
  const setView = useAppStore((s) => s.setView);
  const addMoment = useAppStore((s) => s.addMoment);
  const easeBranch = useAppStore((s) => s.easeBranch);
  const createTodayAction = useAppStore((s) => s.createTodayAction);
  const quickMerge = useAppStore((s) => s.quickMerge);
  const reopenBranch = useAppStore((s) => s.reopenBranch);
  const updateBranch = useAppStore((s) => s.updateBranch);
  const actions = useAppStore((s) => s.actions);
  const theme = useAppStore((s) => s.theme);

  const branch = branches.find((b) => b.id === branchId);

  const [mode, setMode] = useState<Mode>("idle");
  const [done, setDone] = useState<Done>(null);
  const [text, setText] = useState("");
  const [editingFeelings, setEditingFeelings] = useState(false);
  const [freed, setFreed] = useState<string[]>(branch?.occupies ?? []);

  if (!branch) {
    return (
      <div className="panel">
        <p>This branch no longer exists.</p>
      </div>
    );
  }

  const color = branchColor(branch, theme);
  const occupies = branch.occupies ?? [];
  const Heading = (sheet ? "h2" : "h1") as "h1";
  const wrapClass = sheet ? "touch-sheet-body" : "panel";
  const title = (
    <Heading className={sheet ? "touch-sheet-title" : undefined}>
      {sheet && <span className="touch-sheet-dot" style={{ background: color }} aria-hidden="true" />}
      {branch.title}
    </Heading>
  );

  // A merged line is out of your head. Nothing to decide, nothing to do.
  if (isClosed(branch)) {
    const lastMergeId = branch.mergeIds[branch.mergeIds.length - 1];
    return (
      <>
        {!sheet && <BranchContextStrip branch={branch} color={color} />}
        <div className={wrapClass}>
          {title}
          <p className="calm-note">
            {branch.status === "converted-to-project"
              ? "This became real work. It lives with your tasks now, not in your head — nothing left to decide here."
              : "This line is already folded back into your one line. You moved past it — there is nothing left to decide or do here."}
          </p>
          {occupies.length > 0 && (
            <div className="tag-row" aria-label="What it gave back">
              <span className="hint">It gave back:</span>
              {occupies.map((f) => (
                <span key={f} className="tag quality">{f}</span>
              ))}
            </div>
          )}
          <button className="branch-chip" onClick={() => reopenBranch(branchId)}>
            <div>
              <strong>It's back on my mind</strong>
              <p className="hint" style={{ margin: 0 }}>
                That happens, and it doesn't undo anything. The line opens again from today.
              </p>
            </div>
          </button>
          <div className="touch-footer">
            {lastMergeId && (
              <button
                className="btn btn-quiet"
                onClick={() => setView({ kind: "merge-review", mergeId: lastMergeId })}
              >
                See what it returned
              </button>
            )}
            <button className="btn btn-quiet" onClick={() => setView({ kind: "timeline" })}>
              Back
            </button>
          </div>
        </div>
      </>
    );
  }

  async function saveMoment() {
    if (!text.trim()) return;
    await addMoment({
      branchId,
      date: isoDate(new Date()),
      title: text.trim(),
      type: "event",
    });
    setDone("moment");
  }

  async function saveAction() {
    if (!text.trim()) return;
    await createTodayAction(branchId, text.trim());
    setDone("act");
  }

  async function leaveIt() {
    await easeBranch(branchId, {
      controllability: "outside-control",
      leftOn: isoDate(new Date()),
    });
    setDone("leave");
  }

  async function foldBack() {
    await quickMerge(branchId, freed);
    setDone("merge");
  }

  function toggleFeeling(f: string) {
    const next = toggleIn(occupies, f);
    void updateBranch(branchId, { occupies: next });
    setFreed(next);
  }

  if (done) {
    return (
      <>
        {!sheet && <BranchContextStrip branch={branch} color={color} />}
        <div className={wrapClass}>
          {title}
          <p className="calm-note">
            {done === "moment" &&
              "Noted. The moment now lives on this line instead of only in your head."}
            {done === "act" &&
              "That step is now today's action on your main line. Deciding to act makes this pull less."}
            {done === "leave" &&
              "Left on purpose. That is a real decision — this line rests, visibly lighter, for the rest of today."}
            {done === "merge" &&
              "Folded back. This line is no longer yours to carry — what it held returns to your one line."}
          </p>
          {(done === "leave" || done === "merge") && freed.length > 0 && (
            <div className="tag-row" aria-label="Returning to you">
              <span className="hint">Returning to you:</span>
              {freed.map((f) => (
                <span key={f} className="tag quality">{f}</span>
              ))}
            </div>
          )}
          <button className="btn btn-primary" onClick={() => setView({ kind: "timeline" })}>
            Back to the timeline
          </button>
        </div>
      </>
    );
  }

  // A decision was already taken today: the line is set down until tomorrow.
  // Show what was decided instead of asking again.
  const today = isoDate(new Date());
  if (decidedToday(branch)) {
    const todaysAction = actions.find(
      (a) =>
        a.createdAt.slice(0, 10) === today &&
        a.branchesIntegrated.some((x) => x.branchId === branchId),
    );
    return (
      <>
        {!sheet && <BranchContextStrip branch={branch} color={color} />}
        <div className={wrapClass}>
          {title}
          <p className="calm-note">
            You already decided about this line today. It has no more say until tomorrow.
          </p>
          {branch.leftOn === today ? (
            <div className="decided-note">
              <span className="hint">Today's decision</span>
              <strong>Left on purpose — it's out of your hands right now.</strong>
            </div>
          ) : todaysAction ? (
            <div className="decided-note">
              <span className="hint">Today's decision</span>
              <strong>{todaysAction.title}</strong>
              <p className="hint" style={{ margin: 0 }}>
                {todaysAction.completedAt
                  ? "Done. That was enough movement for today."
                  : "It waits as today's action on your main line."}
              </p>
            </div>
          ) : isWaiting(branch) ? (
            <div className="decided-note">
              <span className="hint">Today's decision</span>
              <strong>Set to wait, with boundaries.</strong>
            </div>
          ) : (
            <div className="decided-note">
              <span className="hint">Today's decision</span>
              <strong>You touched it and let it rest.</strong>
            </div>
          )}
          {occupies.length > 0 && (
            <div className="tag-row" aria-label="With you today">
              <span className="hint">With you today:</span>
              {occupies.map((f) => (
                <span key={f} className="tag quality">{f}</span>
              ))}
            </div>
          )}
          <div className="touch-footer">
            <button
              className="btn btn-quiet"
              onClick={() => setView({ kind: "branch", branchId, stage: "fork" })}
            >
              Look deeper
            </button>
            <button className="btn btn-primary" onClick={() => setView({ kind: "timeline" })}>
              Back to the timeline
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {!sheet && <BranchContextStrip branch={branch} color={color} />}
      <div className={wrapClass}>
        {title}
        <p className="calm-note">
          The aim is quiet: one line, with as much of you on it as possible. Any decision here —
          even that it has to wait — brings this line back closer and loosens its pull.
        </p>

        {(branch.anxieties?.length ?? 0) > 0 && (
          <div className="feelings-row" aria-label="What it makes you feel">
            <span className="hint">It stirs:</span>
            {branch.anxieties?.map((a) => (
              <span key={a} className="tag">{a}</span>
            ))}
          </div>
        )}

        {/* what this line is holding — tap to name it, no typing */}
        <div className="feelings-row">
          <span className="hint">
            {occupies.length > 0 ? "While open, it holds:" : "What does this line hold?"}
          </span>
          {occupies.map((f) => (
            <span key={f} className="tag quality">{f}</span>
          ))}
          <button
            className="btn btn-quiet feelings-edit"
            aria-expanded={editingFeelings}
            onClick={() => setEditingFeelings(!editingFeelings)}
          >
            {editingFeelings ? "Done" : occupies.length > 0 ? "Edit" : "Choose"}
          </button>
        </div>
        {editingFeelings && (
          <FeelingPicker
            selected={occupies}
            onToggle={toggleFeeling}
            label="Feelings this line holds"
          />
        )}

        <button
          className={`branch-chip ${mode === "moment" ? "selected" : ""}`}
          aria-expanded={mode === "moment"}
          onClick={() => {
            setMode(mode === "moment" ? "idle" : "moment");
            setText("");
          }}
        >
          <div>
            <strong>Note a moment</strong>
            <p className="hint" style={{ margin: 0 }}>
              Something happened on this line. Put it down here so it can rest.
            </p>
          </div>
        </button>
        {mode === "moment" && (
          <div className="touch-input-row">
            <label className="visually-hidden" htmlFor="touch-moment">
              What happened?
            </label>
            <input
              id="touch-moment"
              autoFocus
              placeholder="What happened?"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveMoment()}
            />
            <button className="btn" disabled={!text.trim()} onClick={saveMoment}>
              Add it
            </button>
          </div>
        )}

        <button
          className={`branch-chip ${mode === "act" ? "selected" : ""}`}
          aria-expanded={mode === "act"}
          onClick={() => {
            setMode(mode === "act" ? "idle" : "act");
            setText("");
          }}
        >
          <div>
            <strong>I can do something about it today</strong>
            <p className="hint" style={{ margin: 0 }}>
              One small step is enough to feel movement on this line.
            </p>
          </div>
        </button>
        {mode === "act" && (
          <div className="touch-input-row">
            <label className="visually-hidden" htmlFor="touch-step">
              The smallest honest step
            </label>
            <input
              id="touch-step"
              autoFocus
              placeholder="The smallest honest step…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveAction()}
            />
            <button className="btn" disabled={!text.trim()} onClick={saveAction}>
              Make it today's action
            </button>
          </div>
        )}

        <button className="branch-chip" onClick={leaveIt}>
          <div>
            <strong>It's out of my hands right now</strong>
            <p className="hint" style={{ margin: 0 }}>
              Leaving it on purpose is also a decision. It can wait without carrying you.
            </p>
          </div>
        </button>

        <button
          className={`branch-chip ${mode === "merge" ? "selected" : ""}`}
          aria-expanded={mode === "merge"}
          onClick={() => setMode(mode === "merge" ? "idle" : "merge")}
        >
          <div>
            <strong>I've moved past this</strong>
            <p className="hint" style={{ margin: 0 }}>
              Fold it back into your one line, for good. What it held returns to you.
            </p>
          </div>
        </button>
        {mode === "merge" && (
          <div className="touch-merge">
            <p className="hint" style={{ margin: 0 }}>
              What does letting this go free up? Tap what returns.
            </p>
            <FeelingPicker
              selected={freed}
              onToggle={(f) => setFreed(toggleIn(freed, f))}
              label="What merging frees up"
            />
            <button className="btn btn-primary" onClick={foldBack}>
              Fold it back into my line
            </button>
          </div>
        )}

        <div className="touch-footer">
          <button
            className="btn btn-quiet"
            onClick={() => setView({ kind: "branch", branchId, stage: "fork" })}
          >
            Look deeper into this branch
          </button>
          <button className="btn btn-quiet" onClick={() => setView({ kind: "timeline" })}>
            Back
          </button>
        </div>
      </div>
    </>
  );
}
