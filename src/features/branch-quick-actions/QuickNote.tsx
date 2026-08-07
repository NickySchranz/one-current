import { useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { useT } from "@/i18n/i18n";
import { appNow } from "@/domain/time/clock";

type Props = { branchId: string };

/** Add what just happened — one line, on the thread, done. */
export function QuickNote({ branchId }: Props) {
  const branch = useAppStore((s) => s.branches.find((b) => b.id === branchId));
  const addMoment = useAppStore((s) => s.addMoment);
  const setOperation = useAppStore((s) => s.setOperation);
  const t = useT();

  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (!branch) return null;

  async function save() {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      await addMoment({
        branchId,
        date: appNow().toISOString().slice(0, 10),
        title: text.trim(),
        type: "event",
      });
      setDone(true);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="panel">
        <p className="calm-note">{t("Noted on the thread.")}</p>
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
      <p className="prompt">{t("Add what just happened.")}</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div className="field">
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("What happened, in a few words")}
            aria-label={t("What just happened")}
          />
        </div>
        <div className="stage-nav">
          <button
            type="button"
            className="btn btn-quiet"
            onClick={() => setOperation({ kind: "quick-touch", branchId })}
          >
            {t("Back")}
          </button>
          <button type="submit" className="btn btn-primary" disabled={!text.trim() || busy}>
            {t("Note it")}
          </button>
        </div>
      </form>
    </div>
  );
}
