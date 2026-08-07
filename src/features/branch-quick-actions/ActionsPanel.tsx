import { useAppStore } from "@/stores/app-store";
import type { PsychologicalBranch } from "@/domain/branches/types";
import { isClosed } from "@/domain/branches/logic";
import { decidedToday } from "@/domain/feelings/logic";
import { appNow } from "@/domain/time/clock";
import { useT } from "@/i18n/i18n";

/**
 * The day, thread by thread. Open threads without a decision today ask for
 * one — a little urgently, because they are still pulling. Below them, every
 * decision already taken, worded as the achievement it is: planned steps,
 * steps done, threads set down. Integrated threads have left this list with
 * everything they carried.
 */
export function ActionsPanel() {
  const actions = useAppStore((s) => s.actions);
  const branches = useAppStore((s) => s.branches);
  const markActionDone = useAppStore((s) => s.markActionDone);
  const setOperation = useAppStore((s) => s.setOperation);
  const t = useT();

  const today = appNow().toISOString().slice(0, 10);
  const open = branches.filter((b) => !isClosed(b));
  const ownerOf = (actionId: string) => {
    const a = actions.find((x) => x.id === actionId);
    const id = a?.branchesIntegrated[0]?.branchId;
    return id ? open.find((b) => b.id === id) : undefined;
  };

  // Planned steps still ahead of you. Steps of integrated threads left with them.
  const pending = actions.filter((a) => {
    if (a.completedAt) return false;
    const ownerId = a.branchesIntegrated[0]?.branchId;
    return !ownerId || !!ownerOf(a.id);
  });
  // Steps already done today: part of the day's record.
  const doneToday = actions.filter((a) => a.completedAt?.slice(0, 10) === today);

  const hasPending = (b: PsychologicalBranch) =>
    pending.some((a) => a.branchesIntegrated[0]?.branchId === b.id);

  // Threads still asking for a decision today.
  const undecided = open.filter((b) => !decidedToday(b, appNow()) && !hasPending(b));

  // Threads whose decision today was not a planned step.
  const settled = open.filter((b) => !hasPending(b) && !undecided.includes(b));
  const settledLabel = (b: PsychologicalBranch): string => {
    if (b.leftOn === today) return t("You chose rest — nothing can be done for now.");
    return t("You decided what this needs today.");
  };

  const empty =
    undecided.length === 0 && pending.length === 0 && doneToday.length === 0 && settled.length === 0;

  return (
    <div className="panel">
      <p className="prompt">{t("Your threads today")}</p>

      {empty && (
        <p className="hint">
          {t("Nothing is open right now. Your whole current is moving as one.")}
        </p>
      )}

      {undecided.length > 0 && (
        <>
          <p className="hint actions-section">{t("Still undecided today")}</p>
          <ul className="actions-list">
            {undecided.map((b) => (
              <li key={b.id} className="actions-row undecided">
                <button
                  className="actions-row-main"
                  onClick={() => setOperation({ kind: "quick-touch", branchId: b.id })}
                >
                  <strong>{b.title}</strong>
                  <span className="hint">
                    {t("Decide what it needs — even that nothing can be done.")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {(pending.length > 0 || doneToday.length > 0 || settled.length > 0) && (
        <>
          <p className="hint actions-section">{t("Decided today")}</p>
          <ul className="actions-list">
            {pending.map((a) => {
              const owner = ownerOf(a.id);
              return (
                <li key={a.id} className="actions-row decided">
                  <button
                    className="actions-row-main"
                    disabled={!owner}
                    onClick={() =>
                      owner && setOperation({ kind: "quick-touch", branchId: owner.id })
                    }
                  >
                    <strong>{a.title}</strong>
                    <span className="hint">
                      {owner
                        ? t("A step you chose for “{title}”.", { title: owner.title })
                        : t("A step you chose.")}
                    </span>
                  </button>
                  <button className="btn" onClick={() => void markActionDone(a.id)}>
                    {t("Done")}
                  </button>
                </li>
              );
            })}
            {settled.map((b) => (
              <li key={b.id} className="actions-row decided">
                <button
                  className="actions-row-main"
                  onClick={() => setOperation({ kind: "quick-touch", branchId: b.id })}
                >
                  <strong>{b.title}</strong>
                  <span className="hint">{settledLabel(b)}</span>
                </button>
              </li>
            ))}
            {doneToday.map((a) => (
              <li key={a.id} className="actions-row decided done">
                <span className="actions-row-main">
                  <strong>✓ {a.title}</strong>
                  <span className="hint">{t("done today")}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
