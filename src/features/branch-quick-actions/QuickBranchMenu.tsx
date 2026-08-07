import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { useT } from "@/i18n/i18n";
import { effectiveLoudness, isClosed } from "@/domain/branches/logic";
import { decidedToday } from "@/domain/feelings/logic";
import type { Loudness } from "@/domain/branches/types";
import { appNow } from "@/domain/time/clock";

type Props = { branchId: string };

const ACTIONS: {
  key: string;
  kind: "quick-act" | "quick-merge" | "quick-note";
  label: string;
  hint: string;
}[] = [
  { key: "a", kind: "quick-act", label: "Act", hint: "Take one small step." },
  {
    key: "m",
    kind: "quick-merge",
    label: "Integrate",
    hint: "Fold what it gave you back into your one line.",
  },
  { key: "t", kind: "quick-note", label: "Note", hint: "Add what just happened." },
];

function isEditableTarget(e: KeyboardEvent): boolean {
  const t = e.target;
  return (
    t instanceof HTMLElement &&
    (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))
  );
}

/** One question at the endpoint: what does this thread need from you now? */
export function QuickBranchMenu({ branchId }: Props) {
  const branch = useAppStore((s) => s.branches.find((b) => b.id === branchId));
  const setOperation = useAppStore((s) => s.setOperation);
  const reopenBranch = useAppStore((s) => s.reopenBranch);
  const easeBranch = useAppStore((s) => s.easeBranch);
  const dialLoudness = useAppStore((s) => s.dialLoudness);
  const [eased, setEased] = useState(false);
  // The sheet opens as a peek: the thread's name and its loudness dial only.
  // Pulling it up (or tapping the question) reveals the decisions.
  const [expanded, setExpanded] = useState(false);
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const t = useT();

  // Leaving the line for today: its label and actions step off the timeline
  // until tomorrow — a decision, mutually exclusive with a planned action.
  const leaveForToday = () =>
    void easeBranch(branchId, { leftOn: appNow().toISOString().slice(0, 10) }).then(() =>
      setEased(true),
    );

  // A / M / T / C / U choose directly while the menu is up — never while typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isEditableTarget(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      const action = ACTIONS.find((a) => a.key === k);
      if (action) {
        e.preventDefault();
        setOperation({ kind: action.kind, branchId });
      } else if (k === "c") {
        e.preventDefault();
        leaveForToday();
      } else if (k === "u") {
        e.preventDefault();
        setOperation({ kind: "understanding", branchId });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [branchId, setOperation, easeBranch]);

  if (!branch) return null;

  if (eased) {
    return (
      <div className="panel">
        <p className="touch-sheet-title">
          <strong>{branch.title}</strong>
        </p>
        <p className="calm-note">
          {t(
            "Nothing can be done about it right now — and you have said so. Its loudness eases; the line simply stays until something changes.",
          )}
        </p>
        <button className="btn btn-primary" onClick={() => setOperation({ kind: "idle" })}>
          {t("Return to timeline")}
        </button>
      </div>
    );
  }

  if (isClosed(branch)) {
    return (
      <div className="panel">
        <p className="touch-sheet-title">
          <strong>{branch.title}</strong>
        </p>
        <p className="calm-note">
          {t("This thread is complete for now. If it returns, you can meet the new version of it.")}
        </p>
        <div className="stage-nav">
          <button
            className="btn btn-quiet"
            onClick={() => setOperation({ kind: "understanding", branchId })}
          >
            {t("Understand this thread")}
          </button>
          <button
            className="btn"
            onClick={async () => {
              await reopenBranch(branchId);
            }}
          >
            {t("It is back on my mind")}
          </button>
        </div>
      </div>
    );
  }

  // Once today's decision is taken the dial rests, so there is nothing to
  // peek at — the sheet opens straight onto the decisions.
  const decided = decidedToday(branch, appNow());
  const showAll = expanded || decided;
  // The dial shows the loudness as felt today, drift included. Moving it
  // re-anchors the drift, so pulling it down always genuinely quiets the line.
  const felt = effectiveLoudness(branch, appNow());

  return (
    <div
      className="panel"
      ref={rootRef}
      // A vertical swipe on the sheet moves between peek and full: up reveals
      // the decisions, down tucks them away again. Sideways stays the slider's.
      onTouchStart={(e) => {
        const t0 = e.touches[0];
        touchRef.current = t0 ? { x: t0.clientX, y: t0.clientY } : null;
      }}
      onTouchEnd={(e) => {
        const start = touchRef.current;
        touchRef.current = null;
        const t0 = e.changedTouches[0];
        if (!start || !t0) return;
        const dx = t0.clientX - start.x;
        const dy = t0.clientY - start.y;
        if (Math.abs(dy) <= Math.abs(dx)) return;
        if (dy < -40) setExpanded(true);
        else if (dy > 40 && expanded) setExpanded(false);
      }}
    >
      <p className="touch-sheet-title">
        <strong>{branch.title}</strong>
      </p>
      {/* first, the one dial: how loud is it — the same thing as its loudness.
          Setting it is a touch, not a decision — it never quiets the day
          counter. Once a decision has been taken today, the line rests and
          the dial steps away until tomorrow (or until the thread reopens). */}
      {!decided && (
        <div className="loudness-field">
          <label className="hint" htmlFor="quick-loudness">
            {t("How loud is this thread right now?")}
          </label>
          <input
            id="quick-loudness"
            className="loudness-slider"
            type="range"
            min={1}
            max={5}
            step={0.1}
            value={felt}
            aria-valuetext={
              felt === 1 ? t("Quiet") : t("Loudness {level} of 5", { level: Math.round(felt) })
            }
            onChange={(e) => void dialLoudness(branchId, Number(e.target.value) as Loudness)}
          />
          {felt > branch.loudness && (
            <span className="hint">{t("Undecided days have made it louder.")}</span>
          )}
        </div>
      )}
      {!showAll ? (
        // The peek: the question itself is the handle — tap it (or pull the
        // sheet up) and the decisions unfold.
        <button className="peek-more" onClick={() => setExpanded(true)}>
          {t("What does this thread need from you now?")}
          <span className="peek-chevron" aria-hidden="true">
            ▴
          </span>
        </button>
      ) : (
        <>
          <p className="prompt">{t("What does this thread need from you now?")}</p>
          <div className="quick-menu">
            {ACTIONS.map((a) => (
              <button
                key={a.kind}
                className="quick-menu-item"
                onClick={() => setOperation({ kind: a.kind, branchId })}
              >
                <strong>{t(a.label)}</strong>
                <span className="hint">{t(a.hint)}</span>
              </button>
            ))}
            <button className="quick-menu-item" onClick={leaveForToday}>
              <strong>{t("Can't do anything about it now")}</strong>
              <span className="hint">
                {t("Set it down. It stays on the line without pulling at you.")}
              </span>
            </button>
          </div>
          <button
            className="btn btn-quiet understand-link"
            onClick={() => setOperation({ kind: "understanding", branchId })}
          >
            {t("Understand this thread")}
          </button>
          <button
            className="btn btn-quiet understand-link"
            onClick={() => setOperation({ kind: "seeking-support", branchId })}
          >
            {t("Too heavy to carry alone")}
          </button>
        </>
      )}
    </div>
  );
}
