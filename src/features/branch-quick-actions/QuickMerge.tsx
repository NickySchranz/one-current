import { useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { useT } from "@/i18n/i18n";

type Props = { branchId: string };

type OutcomeId = "resolved" | "own-task" | "moved-past";

const OUTCOMES: { id: OutcomeId; label: string; hint: string }[] = [
  { id: "resolved", label: "It is resolved", hint: "It can end here and come back with you." },
  {
    id: "own-task",
    label: "It has become its own task",
    hint: "It leaves your head and lives where your tasks live.",
  },
  {
    id: "moved-past",
    label: "I have moved past it",
    hint: "It ends here. Nothing needs to come with you.",
  },
];

/** Bringing back is an ending: resolved, handed off as real work, or moved past. */
export function QuickMerge({ branchId }: Props) {
  const branch = useAppStore((s) => s.branches.find((b) => b.id === branchId));
  const startMerge = useAppStore((s) => s.startMerge);
  const completeMerge = useAppStore((s) => s.completeMerge);
  const addMoment = useAppStore((s) => s.addMoment);
  const handOffBranch = useAppStore((s) => s.handOffBranch);
  const setOperation = useAppStore((s) => s.setOperation);
  const t = useT();

  const [converting, setConverting] = useState(false);
  const [workName, setWorkName] = useState(branch?.title ?? "");
  const [workHome, setWorkHome] = useState("");
  const [firstTask, setFirstTask] = useState("");
  const [busy, setBusy] = useState(false);

  if (!branch) return null;

  async function choose(id: OutcomeId) {
    if (!branch || busy) return;
    setBusy(true);
    try {
      if (id === "resolved") {
        await startMerge([branchId]);
      } else if (id === "own-task") {
        setConverting(true);
      } else {
        // Moved past it: the line rejoins Now carrying nothing.
        await completeMerge({
          branches: [branch],
          preserveRelease: { stillValid: [], outdated: [], outsideControl: [], reclaimable: [] },
          conflicts: [],
          resolution: t("Moved past it"),
          released: branch.occupies ?? [],
          resultStatus: "merged",
        });
      }
    } finally {
      setBusy(false);
    }
  }

  async function convert() {
    if (!workName.trim() || busy) return;
    setBusy(true);
    try {
      await addMoment({
        branchId,
        date: new Date().toISOString().slice(0, 10),
        title: t("Became real work: {name}", { name: workName.trim() }),
        type: "decision",
        description: [
          workHome.trim() && t("Lives in: {place}", { place: workHome.trim() }),
          firstTask.trim() && t("First task: {task}", { task: firstTask.trim() }),
        ]
          .filter(Boolean)
          .join(" · "),
      });
      await handOffBranch(branchId);
    } finally {
      setBusy(false);
    }
  }

  if (converting) {
    return (
      <div className="panel">
        <p className="touch-sheet-title">
          <strong>{branch.title}</strong>
        </p>
        <p className="prompt">{t("It becomes real work and leaves your head.")}</p>
        <div className="field">
          <label htmlFor="qm-work-name">{t("What is the work called?")}</label>
          <input id="qm-work-name" value={workName} onChange={(e) => setWorkName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="qm-work-home">{t("Where will it live from now on?")}</label>
          <input
            id="qm-work-home"
            value={workHome}
            onChange={(e) => setWorkHome(e.target.value)}
            placeholder={t("e.g. my task list, the team board")}
          />
        </div>
        <div className="field">
          <label htmlFor="qm-first-task">{t("What is the first concrete task?")}</label>
          <input id="qm-first-task" value={firstTask} onChange={(e) => setFirstTask(e.target.value)} />
        </div>
        <div className="stage-nav">
          <button className="btn btn-quiet" onClick={() => setConverting(false)}>
            {t("Back")}
          </button>
          <button className="btn btn-primary" disabled={!workName.trim() || busy} onClick={convert}>
            {t("Hand it off")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <p className="touch-sheet-title">
        <strong>{branch.title}</strong>
      </p>
      <p className="prompt">{t("What is true about this thread now?")}</p>
      <div className="quick-menu">
        {OUTCOMES.map((o) => (
          <button key={o.id} className="quick-menu-item" onClick={() => void choose(o.id)}>
            <strong>{t(o.label)}</strong>
            <span className="hint">{t(o.hint)}</span>
          </button>
        ))}
      </div>
      <button
        className="btn btn-quiet understand-link"
        onClick={() => setOperation({ kind: "quick-touch", branchId })}
      >
        {t("Back")}
      </button>
    </div>
  );
}
