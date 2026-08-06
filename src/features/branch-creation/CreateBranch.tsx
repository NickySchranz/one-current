import { useState } from "react";
import { useAppStore } from "@/stores/app-store";
import type { PsychologicalBranch } from "@/domain/branches/types";
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

/**
 * Fast fork: name it, say when — the line draws itself onto the timeline
 * behind this tray and is immediately real. Everything after that is optional.
 */
export function CreateBranch() {
  const requestBranch = useAppStore((s) => s.requestBranch);
  const updateBranch = useAppStore((s) => s.updateBranch);
  const setOperation = useAppStore((s) => s.setOperation);

  const [step, setStep] = useState<"name" | "when" | "active">("name");
  const [title, setTitle] = useState("");
  const [pull, setPull] = useState<Pull>(3);
  const [period, setPeriod] = useState<ForkPeriodChoice | null>(null);
  const [periodId, setPeriodId] = useState<string>("");
  const [approxDate, setApproxDate] = useState("");
  const [periodLabel, setPeriodLabel] = useState("");
  const [periodYear, setPeriodYear] = useState("");
  const [busy, setBusy] = useState(false);

  // The branch, once it exists. Enrichment below edits it in place.
  const [branch, setBranch] = useState<PsychologicalBranch | null>(null);
  const [kindId, setKindId] = useState("");
  const [anxieties, setAnxieties] = useState<string[]>([]);
  const [occupies, setOccupies] = useState<string[]>([]);
  // The less-available feelings follow what it stirs until adjusted by hand.
  const [occupiesCustom, setOccupiesCustom] = useState(false);
  const [occupiesNone, setOccupiesNone] = useState(false);

  function choosePeriod(opt: PeriodOption) {
    setPeriodId(opt.id);
    setPeriod(opt.choice);
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

  async function startLine() {
    const p = resolvedPeriod();
    if (!title.trim() || !p || busy) return;
    setBusy(true);
    try {
      // The kind is not asked up front; it can be named later, or never.
      const result = await requestBranch({
        title,
        kindChoiceId: "unnamed",
        period: p,
        pull,
      });
      // On recurrence the tray content switches to the recurrence check.
      if (result.branch) {
        setBranch(result.branch);
        setStep("active");
      }
    } finally {
      setBusy(false);
    }
  }

  function chooseKind(id: string) {
    if (!branch) return;
    setKindId(id);
    const kind = BRANCH_KIND_CHOICES.find((k) => k.id === id);
    if (kind) void updateBranch(branch.id, { type: kind.type, orientation: kind.orientation });
  }

  function toggleAnxiety(a: string) {
    if (!branch) return;
    const next = anxieties.includes(a)
      ? anxieties.filter((x) => x !== a)
      : [...anxieties, a];
    setAnxieties(next);
    const patch: Partial<PsychologicalBranch> = { anxieties: next };
    if (!occupiesCustom && !occupiesNone) {
      const suggested = suggestLockedFeelings(next);
      setOccupies(suggested);
      patch.occupies = suggested;
    }
    void updateBranch(branch.id, patch);
  }

  function toggleOccupies(f: string) {
    if (!branch) return;
    setOccupiesCustom(true);
    setOccupiesNone(false);
    const next = occupies.includes(f) ? occupies.filter((x) => x !== f) : [...occupies, f];
    setOccupies(next);
    void updateBranch(branch.id, { occupies: next });
  }

  function occupiesNothing() {
    if (!branch) return;
    setOccupiesCustom(true);
    setOccupiesNone(true);
    setOccupies([]);
    void updateBranch(branch.id, { occupies: [] });
  }

  return (
    <div className="panel">
      {step === "name" && (
        <>
          <p className="prompt">What began pulling part of your attention away from the present?</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (title.trim()) setStep("when");
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
              <button
                type="button"
                className="btn btn-quiet"
                onClick={() => setOperation({ kind: "idle" })}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={!title.trim()}>
                Continue
              </button>
            </div>
          </form>
        </>
      )}

      {step === "when" && (
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
            <button className="btn btn-quiet" onClick={() => setStep("name")}>Back</button>
            <button
              className="btn btn-primary"
              disabled={!resolvedPeriod() || busy}
              onClick={startLine}
            >
              Start this line
            </button>
          </div>
        </>
      )}

      {step === "active" && branch && (
        <>
          <p className="calm-note">
            The branch is active. Its line just drew itself behind this card — it forks from your
            past and reaches Now.
          </p>
          <p className="hint">
            You can say more about it here, or simply return. Nothing below is required.
          </p>

          <details className="optional-details">
            <summary>What kind of branch is this?</summary>
            <div className="choice-grid">
              {BRANCH_KIND_CHOICES.map((k) => (
                <button
                  key={k.id}
                  className="choice"
                  aria-pressed={kindId === k.id}
                  onClick={() => chooseKind(k.id)}
                >
                  {k.label}
                </button>
              ))}
            </div>
          </details>

          <details className="optional-details" open>
            <summary>What is it making you feel?</summary>
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
                  What feels less available while this branch is active?
                </p>
                <p className="hint">
                  These return to your main line each time you decide something about it. Adjust
                  if it feels different.
                </p>
                <FeelingPicker
                  selected={occupies}
                  onToggle={toggleOccupies}
                  label="What feels less available while this branch is active"
                />
                <div className="tag-row">
                  <button className="tag" aria-pressed={occupiesNone} onClick={occupiesNothing}>
                    Nothing, really
                  </button>
                  <button className="tag" onClick={() => setOperation({ kind: "idle" })}>
                    Not sure yet
                  </button>
                </div>
              </>
            )}
          </details>

          <div className="stage-nav">
            <span className="hint">{branch.title}</span>
            <button className="btn btn-primary" onClick={() => setOperation({ kind: "idle" })}>
              Done
            </button>
          </div>
        </>
      )}
    </div>
  );
}
