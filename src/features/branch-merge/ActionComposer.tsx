import { useState } from "react";
import type { PsychologicalBranch } from "@/domain/branches/types";
import { suggestRepresentation } from "@/domain/actions/logic";
import type { ComposeActionInput } from "@/domain/actions/logic";
import { useT } from "@/i18n/i18n";

type Props = {
  branches: PsychologicalBranch[];
  qualitiesCarried: string[];
  onChange: (input: Omit<ComposeActionInput, "branches" | "qualitiesCarried" | "mergeId"> | null) => void;
};

/** Compose one coherent movement, not a task list. Only the essentials are required. */
export function ActionComposer({ branches, qualitiesCarried, onChange }: Props) {
  const t = useT();
  const [title, setTitle] = useState("");
  const [instruction, setInstruction] = useState("");
  const [duration, setDuration] = useState(30);
  const [minimum, setMinimum] = useState("");
  const [completion, setCompletion] = useState("");
  const [startTime, setStartTime] = useState("");
  const [reps, setReps] = useState<Record<string, string>>(
    Object.fromEntries(branches.map((b) => [b.id, suggestRepresentation(b)])),
  );

  function emit(next: {
    title?: string;
    instruction?: string;
    duration?: number;
    minimum?: string;
    completion?: string;
    startTime?: string;
    reps?: Record<string, string>;
  }) {
    const nextTitle = next.title ?? title;
    const i = next.instruction ?? instruction;
    if (!nextTitle.trim() || !i.trim()) {
      onChange(null);
      return;
    }
    onChange({
      title: nextTitle,
      instruction: i,
      durationMinutes: next.duration ?? duration,
      minimumVersion: (next.minimum ?? minimum).trim() || "A few honest minutes of it",
      completionDefinition:
        (next.completion ?? completion).trim() || "When the movement has been done once",
      startTime: (next.startTime ?? startTime) || undefined,
      representations: next.reps ?? reps,
    });
  }

  return (
    <div className="card action-card">
      <h3>{t("One present action")}</h3>
      <p className="hint">
        {t(
          "One coherent movement that carries what returned. Name it and describe it — the rest is optional.",
        )}
      </p>
      <div className="field">
        <label htmlFor="act-title">{t("Name it")}</label>
        <input
          id="act-title"
          value={title}
          onChange={(e) => { setTitle(e.target.value); emit({ title: e.target.value }); }}
          placeholder={t("e.g. An evening that carries everything")}
        />
      </div>
      <div className="field">
        <label htmlFor="act-instr">{t("The movement itself")}</label>
        <textarea
          id="act-instr"
          value={instruction}
          onChange={(e) => { setInstruction(e.target.value); emit({ instruction: e.target.value }); }}
          placeholder={t(
            "e.g. Eat a proper meal, a twenty-minute workout, then define tomorrow's one meaningful work action.",
          )}
        />
      </div>

      <details className="optional-details">
        <summary>{t("Shape it further (optional)")}</summary>
        <div className="field" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label htmlFor="act-duration">{t("About how long? (minutes)")}</label>
            <input
              id="act-duration"
              type="number"
              min={5}
              max={240}
              value={duration}
              onChange={(e) => { const v = Number(e.target.value) || 30; setDuration(v); emit({ duration: v }); }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label htmlFor="act-start">{t("Start time")}</label>
            <input
              id="act-start"
              type="time"
              value={startTime}
              onChange={(e) => { setStartTime(e.target.value); emit({ startTime: e.target.value }); }}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="act-min">{t("The smallest version that still counts")}</label>
          <input
            id="act-min"
            value={minimum}
            onChange={(e) => { setMinimum(e.target.value); emit({ minimum: e.target.value }); }}
            placeholder={t("e.g. Ten minutes of movement and one written sentence")}
          />
        </div>
        <div className="field">
          <label htmlFor="act-done">{t("You will know it is complete when…")}</label>
          <input
            id="act-done"
            value={completion}
            onChange={(e) => { setCompletion(e.target.value); emit({ completion: e.target.value }); }}
          />
        </div>
        {branches.length > 1 && (
          <div className="field">
            <label>{t("How each thread is represented")}</label>
            {branches.map((b) => (
              <div key={b.id} style={{ marginBottom: "0.5rem" }}>
                <span className="hint">{b.title} →</span>
                <input
                  aria-label={t("How {title} is represented", { title: b.title })}
                  value={reps[b.id] ?? ""}
                  onChange={(e) => {
                    const next = { ...reps, [b.id]: e.target.value };
                    setReps(next);
                    emit({ reps: next });
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </details>

      {qualitiesCarried.length > 0 && (
        <div className="tag-row" aria-label={t("Qualities this action carries")}>
          {qualitiesCarried.map((q) => (
            <span key={q} className="tag quality">{q}</span>
          ))}
        </div>
      )}
    </div>
  );
}
