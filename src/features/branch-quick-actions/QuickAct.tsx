import { useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { useT } from "@/i18n/i18n";

type Props = { branchId: string };

const STEP_SUGGESTIONS = [
  "Say it out loud to someone",
  "Write down what you know for five minutes",
  "Do the first two minutes of it",
  "Ask the one question you keep avoiding",
];

const WHEN_OPTIONS = ["Now", "In ten minutes", "Later today", "Choose a time"];

/** One small honest step, placed on the main line today. */
export function QuickAct({ branchId }: Props) {
  const branch = useAppStore((s) => s.branches.find((b) => b.id === branchId));
  const createTodayAction = useAppStore((s) => s.createTodayAction);
  const setOperation = useAppStore((s) => s.setOperation);
  const t = useT();

  const [step, setStep] = useState("");
  const [when, setWhen] = useState("Now");
  const [time, setTime] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (!branch) return null;

  async function save() {
    if (!step.trim() || busy) return;
    setBusy(true);
    try {
      const suffix =
        when === "Choose a time" && time
          ? ` (${t("at {time}", { time })})`
          : when !== "Now"
            ? ` (${t(when).toLowerCase()})`
            : "";
      await createTodayAction(branchId, `${step.trim()}${suffix}`);
      setDone(true);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="panel">
        <p className="calm-note">{t("Action added to your main line.")}</p>
        <button className="btn btn-primary" onClick={() => setOperation({ kind: "idle" })}>
          {t("Return to timeline")}
        </button>
      </div>
    );
  }

  return (
    <div className="panel">
      <p className="touch-sheet-title">
        <strong>{branch.title}</strong>
      </p>
      <p className="prompt">{t("What is the smallest honest step?")}</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div className="field">
          <input
            autoFocus
            value={step}
            onChange={(e) => setStep(e.target.value)}
            placeholder={t("One small step")}
            aria-label={t("The smallest honest step")}
          />
        </div>
        <div className="tag-row" role="group" aria-label={t("Step suggestions")}>
          {STEP_SUGGESTIONS.map((s) => (
            <button key={s} type="button" className="tag" onClick={() => setStep(t(s))}>
              {t(s)}
            </button>
          ))}
        </div>
        <div className="field">
          <label>{t("When will you begin?")}</label>
          <div className="tag-row" role="group" aria-label={t("When to begin")}>
            {WHEN_OPTIONS.map((w) => (
              <button
                key={w}
                type="button"
                className="tag"
                aria-pressed={when === w}
                onClick={() => setWhen(w)}
              >
                {t(w)}
              </button>
            ))}
          </div>
          {when === "Choose a time" && (
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              aria-label={t("Time to begin")}
            />
          )}
        </div>
        <div className="stage-nav">
          <button
            type="button"
            className="btn btn-quiet"
            onClick={() => setOperation({ kind: "quick-touch", branchId })}
          >
            {t("Back")}
          </button>
          <button type="submit" className="btn btn-primary" disabled={!step.trim() || busy}>
            {t("Place it on today")}
          </button>
        </div>
      </form>
    </div>
  );
}
