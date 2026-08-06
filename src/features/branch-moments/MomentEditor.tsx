import { useState } from "react";
import type { MomentType } from "@/domain/moments/types";
import { useAppStore } from "@/stores/app-store";
import { useT } from "@/i18n/i18n";

const MOMENT_TYPES: { id: MomentType; label: string }[] = [
  { id: "event", label: "Something happened" },
  { id: "belief", label: "A belief formed" },
  { id: "decision", label: "A decision" },
  { id: "action", label: "An action taken" },
  { id: "setback", label: "A setback" },
  { id: "insight", label: "An insight" },
  { id: "intensification", label: "It grew stronger" },
  { id: "relief", label: "A period of relief" },
];

type Props = { branchId: string; onDone?: () => void };

/** Quick moment capture: what happened, when, what it changed. */
export function MomentEditor({ branchId, onDone }: Props) {
  const t = useT();
  const addMoment = useAppStore((s) => s.addMoment);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [type, setType] = useState<MomentType>("event");
  const [belief, setBelief] = useState("");
  const [effect, setEffect] = useState<"stronger" | "lighter" | "different" | undefined>();
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!title.trim() || busy) return;
    setBusy(true);
    await addMoment({
      branchId,
      title,
      date,
      type,
      beliefAdded: belief.trim() || undefined,
      effect,
    });
    setTitle("");
    setBelief("");
    setEffect(undefined);
    setBusy(false);
    onDone?.();
  }

  return (
    <div className="card sunken">
      <h3>{t("Add a moment")}</h3>
      <div className="field">
        <label htmlFor="moment-title">{t("What happened here?")}</label>
        <input
          id="moment-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("A conversation, setback, decision, reassurance…")}
        />
      </div>
      <div className="field">
        <label htmlFor="moment-date">{t("When?")}</label>
        <input
          id="moment-date"
          type="date"
          value={date}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <div className="field">
        <label>{t("What kind of moment?")}</label>
        <div className="tag-row" role="group">
          {MOMENT_TYPES.map((mt) => (
            <button
              key={mt.id}
              className={`tag ${type === mt.id ? "quality" : ""}`}
              aria-pressed={type === mt.id}
              onClick={() => setType(mt.id)}
            >
              {t(mt.label)}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label htmlFor="moment-belief">
          {t("What did you begin believing after this? (optional)")}
        </label>
        <input
          id="moment-belief"
          value={belief}
          onChange={(e) => setBelief(e.target.value)}
        />
      </div>
      <div className="field">
        <label>{t("Did this make the thread stronger, lighter, or simply different?")}</label>
        <div className="tag-row" role="group">
          {(["stronger", "lighter", "different"] as const).map((eff) => (
            <button
              key={eff}
              className={`tag ${effect === eff ? "quality" : ""}`}
              aria-pressed={effect === eff}
              onClick={() => setEffect(effect === eff ? undefined : eff)}
            >
              {t(eff)}
            </button>
          ))}
        </div>
      </div>
      <button className="btn btn-primary" disabled={!title.trim() || busy} onClick={save}>
        {t("Add moment")}
      </button>
    </div>
  );
}
