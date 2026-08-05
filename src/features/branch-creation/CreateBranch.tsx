import { useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { BRANCH_KIND_CHOICES, type ForkPeriodChoice, type Pull } from "@/domain/branches/types";
import { ANXIETIES, suggestLockedFeelings } from "@/domain/feelings/logic";
import { FeelingPicker } from "@/features/branch-touch/FeelingPicker";

type PeriodOption = { id: string; label: string; choice: ForkPeriodChoice | null };

const PERIODS: PeriodOption[] = [
  { id: "today", label: "Today", choice: { kind: "today" } },
  { id: "yesterday", label: "Yesterday", choice: { kind: "yesterday" } },
  { id: "this-week", label: "This week", choice: { kind: "this-week" } },
  { id: "this-month", label: "This month", choice: { kind: "this-month" } },
  { id: "date", label: "Around a date…", choice: null },
  { id: "period", label: "A life period…", choice: null },
  { id: "unsure", label: "I am not sure", choice: { kind: "unsure" } },
];

/** Quick branch creation: title → when → kind. Under twenty seconds. */
export function CreateBranch() {
  const requestBranch = useAppStore((s) => s.requestBranch);
  const setView = useAppStore((s) => s.setView);

  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [period, setPeriod] = useState<ForkPeriodChoice | null>(null);
  const [periodId, setPeriodId] = useState<string>("");
  const [approxDate, setApproxDate] = useState("");
  const [periodLabel, setPeriodLabel] = useState("");
  const [periodYear, setPeriodYear] = useState("");
  const [pull, setPull] = useState<Pull>(3);
  const [kindId, setKindId] = useState("");
  const [anxieties, setAnxieties] = useState<string[]>([]);
  const [locked, setLocked] = useState<string[]>([]);
  // The locked feelings follow the anxieties until the user adjusts them by hand.
  const [lockedCustom, setLockedCustom] = useState(false);
  const [busy, setBusy] = useState(false);

  function toggleAnxiety(a: string) {
    const next = anxieties.includes(a)
      ? anxieties.filter((x) => x !== a)
      : [...anxieties, a];
    setAnxieties(next);
    if (!lockedCustom) setLocked(suggestLockedFeelings(next));
  }

  function toggleLocked(f: string) {
    setLockedCustom(true);
    setLocked(locked.includes(f) ? locked.filter((x) => x !== f) : [...locked, f]);
  }

  function choosePeriod(opt: PeriodOption) {
    setPeriodId(opt.id);
    if (opt.choice) {
      setPeriod(opt.choice);
    } else {
      setPeriod(null);
    }
  }

  function resolvedPeriod(): ForkPeriodChoice | null {
    if (periodId === "date") {
      return approxDate ? { kind: "approximate-date", date: approxDate } : null;
    }
    if (periodId === "period") {
      if (!periodLabel || !periodYear) return null;
      return {
        kind: "life-period",
        label: periodLabel,
        approximateDate: `${periodYear}-06-15`,
      };
    }
    return period;
  }

  async function finish() {
    const p = resolvedPeriod();
    if (!title.trim() || !p || !kindId || anxieties.length === 0 || busy) return;
    setBusy(true);
    await requestBranch({
      title,
      kindChoiceId: kindId,
      period: p,
      pull,
      anxieties,
      occupies: locked,
    });
  }

  return (
    <div className="panel">
      {step === 0 && (
        <>
          <p className="prompt">What began pulling part of your attention away from the present?</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (title.trim()) setStep(1);
            }}
          >
            <div className="field">
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Name it in a few words"
                aria-label="Name the branch"
              />
            </div>
            <div className="field">
              <label>How strongly does it pull right now?</label>
              <div className="pull-scale" role="group" aria-label="Emotional pull from one to five">
                {([1, 2, 3, 4, 5] as Pull[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    aria-pressed={pull === p}
                    onClick={() => setPull(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="stage-nav">
              <button type="button" className="btn btn-quiet" onClick={() => setView({ kind: "timeline" })}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={!title.trim()}>
                Continue
              </button>
            </div>
          </form>
        </>
      )}

      {step === 1 && (
        <>
          <p className="prompt">When did this branch begin?</p>
          <div className="choice-grid">
            {PERIODS.map((opt) => (
              <button
                key={opt.id}
                className="choice"
                aria-pressed={periodId === opt.id}
                onClick={() => choosePeriod(opt)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {periodId === "date" && (
            <div className="field">
              <label htmlFor="approx-date">Roughly when?</label>
              <input
                id="approx-date"
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                value={approxDate}
                onChange={(e) => setApproxDate(e.target.value)}
              />
            </div>
          )}
          {periodId === "period" && (
            <>
              <div className="field">
                <label htmlFor="period-label">Name the period</label>
                <input
                  id="period-label"
                  value={periodLabel}
                  onChange={(e) => setPeriodLabel(e.target.value)}
                  placeholder="e.g. after the move, my first job"
                />
              </div>
              <div className="field">
                <label htmlFor="period-year">Around which year?</label>
                <input
                  id="period-year"
                  type="number"
                  min={1930}
                  max={new Date().getFullYear()}
                  value={periodYear}
                  onChange={(e) => setPeriodYear(e.target.value)}
                />
              </div>
            </>
          )}
          <div className="stage-nav">
            <button className="btn btn-quiet" onClick={() => setStep(0)}>Back</button>
            <button
              className="btn btn-primary"
              disabled={!resolvedPeriod()}
              onClick={() => setStep(2)}
            >
              Continue
            </button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <p className="prompt">What kind of branch is this?</p>
          <div className="choice-grid">
            {BRANCH_KIND_CHOICES.map((k) => (
              <button
                key={k.id}
                className="choice"
                aria-pressed={kindId === k.id}
                onClick={() => {
                  setKindId(k.id);
                  setStep(3);
                }}
              >
                {k.label}
              </button>
            ))}
          </div>
          <div className="stage-nav">
            <button className="btn btn-quiet" onClick={() => setStep(1)}>Back</button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <p className="prompt">What is it making you feel?</p>
          <p className="hint">Tap what's true. Naming it is how the line starts loosening.</p>
          <FeelingPicker
            options={ANXIETIES}
            selected={anxieties}
            onToggle={toggleAnxiety}
            label="What this line makes you feel"
          />
          {anxieties.length > 0 && (
            <>
              <p className="prompt" style={{ marginTop: "0.75rem" }}>
                While it stays open, it locks away:
              </p>
              <p className="hint">
                These return to your main line each time you decide something about it. Adjust if
                it feels different.
              </p>
              <FeelingPicker
                selected={locked}
                onToggle={toggleLocked}
                label="Feelings this line locks away"
              />
            </>
          )}
          <div className="stage-nav">
            <button className="btn btn-quiet" onClick={() => setStep(2)}>Back</button>
            <button
              className="btn btn-primary"
              disabled={anxieties.length === 0 || busy}
              onClick={finish}
            >
              Add this line
            </button>
          </div>
        </>
      )}
    </div>
  );
}
