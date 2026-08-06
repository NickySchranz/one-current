import { useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { useT } from "@/i18n/i18n";

type Props = { branchId: string };

/** Some threads are best carried with another person. Focused and quiet. */
export function SupportPanel({ branchId }: Props) {
  const branch = useAppStore((s) => s.branches.find((b) => b.id === branchId));
  const updateBranch = useAppStore((s) => s.updateBranch);
  const setOperation = useAppStore((s) => s.setOperation);
  const [saved, setSaved] = useState(branch?.status === "needs-support");
  const t = useT();

  if (!branch) return null;

  return (
    <div className="panel">
      <h1>{branch.title}</h1>
      <p className="calm-note">
        {t(
          "Some threads are too heavy to carry alone, and that is not a failure of yours. Carrying it with another person is a real way forward — a friend, someone you trust, or a professional.",
        )}
      </p>
      <p className="hint">
        {t(
          "The thread stays on your timeline, marked as carried with support. Nothing about it is asked of you here.",
        )}
      </p>
      {!saved ? (
        <button
          className="btn btn-primary"
          onClick={async () => {
            await updateBranch(branchId, { status: "needs-support" });
            setSaved(true);
          }}
        >
          {t("Mark it as carried with support")}
        </button>
      ) : (
        <p className="calm-note" role="status">
          {t(
            "Marked. You selected support for this thread — it will hold that shape on the timeline.",
          )}
        </p>
      )}
      <div className="stage-nav">
        <button className="btn btn-quiet" onClick={() => setOperation({ kind: "idle" })}>
          {t("Return to timeline")}
        </button>
      </div>
    </div>
  );
}
