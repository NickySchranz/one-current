import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { useT } from "@/i18n/i18n";
import { effectivePull, isClosed } from "@/domain/branches/logic";
import { decidedToday } from "@/domain/feelings/logic";
import type { Pull } from "@/domain/branches/types";
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
  const updateBranch = useAppStore((s) => s.updateBranch);
  const [eased, setEased] = useState(false);
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
            "Nothing can be done about it right now — and you have said so. Its pull eases; the line simply stays until something changes.",
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

  return (
    <div className="panel" ref={rootRef}>
      <p className="touch-sheet-title">
        <strong>{branch.title}</strong>
      </p>
      {/* first, the one dial: how loud is it — the same thing as its pull.
          Setting it is a touch, not a decision — it never quiets the day
          counter. Once a decision has been taken today, the line rests and
          the dial steps away until tomorrow (or until the thread reopens). */}
      {!decidedToday(branch, appNow()) && (
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
            value={branch.pull}
            aria-valuetext={
              branch.pull === 1
                ? t("Quiet")
                : t("Loudness {level} of 5", { level: Math.round(branch.pull) })
            }
            onChange={(e) =>
              void updateBranch(branchId, { pull: Number(e.target.value) as Pull })
            }
          />
          {effectivePull(branch, appNow()) > branch.pull && (
            <span className="hint">{t("Undecided days have made it louder.")}</span>
          )}
        </div>
      )}
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
    </div>
  );
}
