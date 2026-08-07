import { useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { useT } from "@/i18n/i18n";
import type { ForkPeriodChoice, Loudness } from "@/domain/branches/types";
import { ANXIETIES, suggestLockedFeelings } from "@/domain/feelings/logic";
import { FeelingPicker } from "@/features/branch-touch/FeelingPicker";
import { appNow } from "@/domain/time/clock";

type WhenId = "today" | "this-week" | "this-month" | "earlier";
type EarlierId = "date" | "period" | "unsure";

const WHEN_OPTIONS: { id: WhenId; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "this-week", label: "This week" },
  { id: "this-month", label: "This month" },
  { id: "earlier", label: "Earlier…" },
];

const EARLIER_OPTIONS: { id: EarlierId; label: string }[] = [
  { id: "date", label: "Around a date" },
  { id: "period", label: "A life period" },
  { id: "unsure", label: "I am not sure" },
];

/**
 * One screen: name what pulls, say when, create. The line draws itself onto
 * the timeline immediately — everything deeper is a choice afterwards.
 */
export function CreateBranch() {
  const requestBranch = useAppStore((s) => s.requestBranch);
  const setOperation = useAppStore((s) => s.setOperation);
  const t = useT();

  const [title, setTitle] = useState("");
  const [loudness, setLoudness] = useState<Loudness>(3);
  const [whenId, setWhenId] = useState<WhenId>("today");
  const [earlierId, setEarlierId] = useState<EarlierId>("date");
  const [approxDate, setApproxDate] = useState("");
  const [periodLabel, setPeriodLabel] = useState("");
  const [periodYear, setPeriodYear] = useState("");
  const [anxieties, setAnxieties] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  function resolvedPeriod(): ForkPeriodChoice | null {
    if (whenId === "today") return { kind: "today" };
    if (whenId === "this-week") return { kind: "this-week" };
    if (whenId === "this-month") return { kind: "this-month" };
    if (earlierId === "date") {
      return approxDate ? { kind: "approximate-date", date: approxDate } : null;
    }
    if (earlierId === "period") {
      if (!periodLabel || !periodYear) return null;
      return { kind: "life-period", label: periodLabel, approximateDate: `${periodYear}-06-15` };
    }
    return { kind: "unsure" };
  }

  async function createNow() {
    const p = resolvedPeriod();
    if (!title.trim() || !p || busy) return;
    setBusy(true);
    try {
      // The kind is not asked up front; it can be named later, or never.
      // What the thread draws away is derived from how it makes you feel.
      const result = await requestBranch({
        title,
        kindChoiceId: "unnamed",
        period: p,
        loudness,
        anxieties: anxieties.length > 0 ? anxieties : undefined,
        occupies: anxieties.length > 0 ? suggestLockedFeelings(anxieties) : undefined,
      });
      // On recurrence the tray content switches to the recurrence check.
      // Otherwise the new line stays in focus and its quick menu opens:
      // the same actions every thread has, right away.
      if (result.branch) setOperation({ kind: "quick-touch", branchId: result.branch.id });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel">
      <p className="prompt">{t("What is pulling at you?")}</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void createNow();
        }}
      >
        <div className="field">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("Name it in a few words")}
            aria-label={t("Name the thread")}
          />
        </div>
        <div className="field loudness-field">
          <label htmlFor="create-loudness">{t("How loud is it right now?")}</label>
          <input
            id="create-loudness"
            className="loudness-slider"
            type="range"
            min={1}
            max={5}
            step={0.1}
            value={loudness}
            aria-valuetext={
              loudness === 1 ? t("Quiet") : t("Loudness {level} of 5", { level: Math.round(loudness) })
            }
            onChange={(e) => setLoudness(Number(e.target.value) as Loudness)}
          />
        </div>
        <div className="field">
          <label>{t("Since when?")}</label>
          <div className="tag-row" role="group" aria-label={t("When this began")}>
            {WHEN_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className="tag"
                aria-pressed={whenId === opt.id}
                onClick={() => setWhenId(opt.id)}
              >
                {t(opt.label)}
              </button>
            ))}
          </div>
        </div>
        {whenId === "earlier" && (
          <>
            <div className="tag-row" role="group" aria-label={t("Earlier, more precisely")}>
              {EARLIER_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className="tag"
                  aria-pressed={earlierId === opt.id}
                  onClick={() => setEarlierId(opt.id)}
                >
                  {t(opt.label)}
                </button>
              ))}
            </div>
            {earlierId === "date" && (
              <div className="field">
                <label htmlFor="approx-date">{t("Roughly when?")}</label>
                <input
                  id="approx-date"
                  type="date"
                  max={appNow().toISOString().slice(0, 10)}
                  value={approxDate}
                  onChange={(e) => setApproxDate(e.target.value)}
                />
              </div>
            )}
            {earlierId === "period" && (
              <>
                <div className="field">
                  <label htmlFor="period-label">{t("Name the period")}</label>
                  <input
                    id="period-label"
                    value={periodLabel}
                    onChange={(e) => setPeriodLabel(e.target.value)}
                    placeholder={t("e.g. after the move, my first job")}
                  />
                </div>
                <div className="field">
                  <label htmlFor="period-year">{t("Around which year?")}</label>
                  <input
                    id="period-year"
                    type="number"
                    min={1930}
                    max={appNow().getFullYear()}
                    value={periodYear}
                    onChange={(e) => setPeriodYear(e.target.value)}
                  />
                </div>
              </>
            )}
          </>
        )}
        <div className="field">
          <label>{t("What does it make you feel? (optional)")}</label>
          <FeelingPicker
            label={t("What it makes you feel")}
            options={ANXIETIES}
            selected={anxieties}
            onToggle={(f) =>
              setAnxieties((prev) =>
                prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f],
              )
            }
          />
          {anxieties.length > 0 && (
            <p className="hint" style={{ margin: 0 }}>
              {t("While it stays open, it may draw on {list}.", {
                list: suggestLockedFeelings(anxieties)
                  .map((f) => t(f))
                  .join(", "),
              })}
            </p>
          )}
        </div>
        <div className="stage-nav">
          <button
            type="button"
            className="btn btn-quiet"
            onClick={() => setOperation({ kind: "idle" })}
          >
            {t("Cancel")}
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!title.trim() || !resolvedPeriod() || busy}
          >
            {t("Start the thread")}
          </button>
        </div>
      </form>
    </div>
  );
}
