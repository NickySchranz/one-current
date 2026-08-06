import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/stores/app-store";
import type { PsychologicalBranch } from "@/domain/branches/types";
import { effectivePull } from "@/domain/branches/logic";
import { decidedToday, energySplit } from "@/domain/feelings/logic";
import { useT } from "@/i18n/i18n";

type Props = {
  /** Open, non-waiting lines currently on the timeline. */
  activeLines: PsychologicalBranch[];
};

/**
 * The wholeness chip: braid strands fan out per undecided thread and come home
 * as decisions are taken. Tapping it opens a small panel that says how the day
 * may feel and suggests where one decision would help most.
 */
export function WholenessIndicator({ activeLines }: Props) {
  const t = useT();
  const branches = useAppStore((s) => s.branches);
  const setOperation = useAppStore((s) => s.setOperation);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);

  // How much of you moves with your main line right now — the wholeness score.
  // Every decision (an action or "nothing can be done") raises it.
  const wholeness = energySplit(branches).mainShare;
  const undecided = activeLines
    .filter((b) => !decidedToday(b))
    .sort((a, b) => effectivePull(b) - effectivePull(a));

  const word =
    wholeness >= 0.85
      ? t("whole")
      : wholeness >= 0.65
        ? t("gathered")
        : wholeness >= 0.45
          ? t("pulled apart")
          : t("scattered");
  const tone = wholeness >= 0.65 ? "good" : wholeness >= 0.45 ? "mid" : "low";
  const forecast =
    wholeness >= 0.85
      ? t("Nothing is pulling you apart. Expect a steady, present day — protect it.")
      : wholeness >= 0.65
        ? t("You may feel an occasional tug today, but the day should hold steady.")
        : wholeness >= 0.45
          ? t(
              "You might feel restless today, or find it hard to settle into one thing. That is the split — not you.",
            )
          : t(
              "Today can feel foggy and tiring, like living several days at once. One small decision starts bringing you back.",
            );

  const summary =
    t("You are {word} — about {pct} percent of you moves with your main line.", {
      word,
      pct: Math.round(wholeness * 100),
    }) +
    (activeLines.length > 0
      ? " " +
        t("{undecided} of {active} open threads still undecided today.", {
          undecided: undecided.length,
          active: activeLines.length,
        })
      : "");

  return (
    <div className="wholeness" ref={rootRef}>
      <button
        className={`fragmentation-indicator ${tone}`}
        aria-expanded={open}
        aria-label={summary}
        title={summary}
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="56" height="20" viewBox="0 0 56 20" aria-hidden="true">
          <path className="frag-base" d="M 2 10 L 20 10" />
          {activeLines.length === 0 && <path className="frag-base" d="M 20 10 L 54 10" />}
          {activeLines.slice(0, 6).map((b, i) => {
            const isUndecided = !decidedToday(b);
            const side = i % 2 === 0 ? 1 : -1;
            const fan = isUndecided ? side * (3 + i * 2.2) : side * 1.2;
            const y = Math.max(2, Math.min(18, 10 + fan));
            return (
              <path
                key={b.id}
                className={`frag-strand${isUndecided ? "" : " settled"}`}
                d={`M 20 10 C 30 10, 38 ${y}, 54 ${y}`}
              />
            );
          })}
        </svg>
        <span className="frag-meta" aria-hidden="true">
          <span className="frag-word">{word}</span>
          <span className="frag-track">
            <span className="frag-fill" style={{ width: `${Math.round(wholeness * 100)}%` }} />
          </span>
        </span>
      </button>

      {open && (
        <div className="wholeness-panel" role="region" aria-label={t("How you are doing")}>
          <p className="hint" style={{ margin: 0 }}>
            <strong className={`frag-word-inline ${tone}`}>
              {t("You are {word}.", { word })}
            </strong>
            <br />
            {forecast}
          </p>

          {undecided.length > 0 ? (
            <>
              <p className="hint" style={{ margin: 0 }}>
                {t("One decision would gather you most here:")}
              </p>
              {undecided.slice(0, 3).map((b, i) => (
                <button
                  key={b.id}
                  className="wholeness-suggestion"
                  onClick={() => {
                    setOpen(false);
                    setOperation({ kind: "quick-touch", branchId: b.id });
                  }}
                >
                  <strong>{b.title}</strong>
                  <span className="hint">
                    {i === 0 ? t("pulling hardest right now") : t("still undecided today")}
                  </span>
                </button>
              ))}
              <p className="hint" style={{ margin: 0 }}>
                {t("An action counts. So does deciding that nothing can be done.")}
              </p>
            </>
          ) : (
            <p className="hint" style={{ margin: 0 }}>
              {activeLines.length > 0
                ? t("Every open thread has its decision for today. Nothing more is asked of you.")
                : t("Nothing is open right now. Your whole current is moving as one.")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
