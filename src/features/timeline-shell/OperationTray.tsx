import { useEffect, useRef } from "react";
import {
  operationDepth,
  useAppStore,
  type TimelineOperation,
} from "@/stores/app-store";
import type { PsychologicalBranch } from "@/domain/branches/types";
import { CreateBranch } from "@/features/branch-creation/CreateBranch";
import { RecurrenceCheck } from "@/features/branch-creation/RecurrenceCheck";
import { QuickBranchMenu } from "@/features/branch-quick-actions/QuickBranchMenu";
import { QuickAct } from "@/features/branch-quick-actions/QuickAct";
import { QuickWait } from "@/features/branch-quick-actions/QuickWait";
import { QuickMerge } from "@/features/branch-quick-actions/QuickMerge";
import { QuickNote } from "@/features/branch-quick-actions/QuickNote";
import { SupportPanel } from "@/features/branch-quick-actions/SupportPanel";
import { BranchView } from "@/features/branch-inspection/BranchView";
import { MergeWizard } from "@/features/branch-merge/MergeWizard";
import { useT } from "@/i18n/i18n";

/** Translator shape: English source string in, translated sentence out. */
type Translate = (s: string, vars?: Record<string, string | number>) => string;

/** English fallback: no lookup, but placeholders still get filled in. */
const fallbackT: Translate = (s, vars) => {
  let out = s;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      out = out.replaceAll(`{${k}}`, String(v));
    }
  }
  return out;
};

function trayLabel(op: TimelineOperation): string {
  switch (op.kind) {
    case "creating-branch":
      return "New thread";
    case "checking-recurrence":
      return "This has returned before";
    case "quick-touch":
      return "This thread";
    case "quick-act":
      return "One small step";
    case "quick-wait":
      return "Deliberate waiting";
    case "quick-merge":
      return "What is true now";
    case "quick-note":
      return "A note";
    case "understanding":
      return "Understand this thread";
    case "confirming-merge":
      return "Bring back into Now";
    case "seeking-support":
      return "More support";
    default:
      return "";
  }
}

/** Spoken summary of what is happening on the timeline right now. */
function operationSummary(
  op: TimelineOperation,
  branches: PsychologicalBranch[],
  t: Translate = fallbackT,
): string {
  const title = (id: string) => branches.find((b) => b.id === id)?.title ?? t("a thread");
  switch (op.kind) {
    case "idle":
      return "";
    case "creating-branch":
      return t("Starting a new thread. The timeline stays beside this panel.");
    case "checking-recurrence":
      return t("This thread has returned before. Choosing how to continue.");
    case "quick-touch":
      return t("Deciding what the thread “{title}” needs now. The timeline stays interactive.", {
        title: title(op.branchId),
      });
    case "quick-act":
      return t("Choosing one small step for “{title}”.", { title: title(op.branchId) });
    case "quick-wait":
      return t("Placing “{title}” in deliberate waiting.", { title: title(op.branchId) });
    case "quick-merge":
      return t("Deciding what is true about “{title}” now.", { title: title(op.branchId) });
    case "quick-note":
      return t("Adding a note to “{title}”.", { title: title(op.branchId) });
    case "understanding":
      return t("Looking deeper into the thread “{title}”. The timeline waits behind this panel.", {
        title: title(op.branchId),
      });
    case "confirming-merge":
      return op.branchIds.length === 1
        ? t("Bringing “{title}” back into Now.", { title: title(op.branchIds[0]) })
        : t("Bringing {n} threads back into Now together.", { n: op.branchIds.length });
    case "seeking-support":
      return t("Considering more support around “{title}”.", { title: title(op.branchId) });
  }
}

function operationBody(op: TimelineOperation) {
  switch (op.kind) {
    case "creating-branch":
      return <CreateBranch />;
    case "checking-recurrence":
      return <RecurrenceCheck matchedBranchId={op.matchedBranchId} pending={op.pending} />;
    case "quick-touch":
      return <QuickBranchMenu key={op.branchId} branchId={op.branchId} />;
    case "quick-act":
      return <QuickAct key={op.branchId} branchId={op.branchId} />;
    case "quick-wait":
      return <QuickWait key={op.branchId} branchId={op.branchId} />;
    case "quick-merge":
      return <QuickMerge key={op.branchId} branchId={op.branchId} />;
    case "quick-note":
      return <QuickNote key={op.branchId} branchId={op.branchId} />;
    case "understanding":
      return <BranchView key={op.branchId} branchId={op.branchId} />;
    case "confirming-merge":
      return <MergeWizard branchIds={op.branchIds} />;
    case "seeking-support":
      return <SupportPanel key={op.branchId} branchId={op.branchId} />;
    default:
      return null;
  }
}

/**
 * The panel where the current operation happens, in two weights. Quick: a
 * light tray beside the timeline — no backdrop, the timeline stays interactive
 * and selecting another endpoint switches context. Focused: a dialog over it,
 * only for deeper looking, final confirmations, and support.
 */
export function OperationTray() {
  const operation = useAppStore((s) => s.operation);
  const setOperation = useAppStore((s) => s.setOperation);
  const branches = useAppStore((s) => s.branches);
  const trayRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);
  const depth = operationDepth(operation);
  const t = useT();

  // Escape sets the operation down; the timeline is still right there.
  // While typing, Escape only leaves the field — it never discards the tray.
  useEffect(() => {
    if (operation.kind === "idle") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))) {
        t.blur();
        return;
      }
      setOperation({ kind: "idle" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [operation.kind, setOperation]);

  // A tap anywhere outside the quick tray sets it down. A drag is a pan, not
  // a dismissal; and taps on branch endpoints still switch context, because
  // their click handler runs after this and opens the next tray.
  useEffect(() => {
    if (depth !== "quick") return;
    let start: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => {
      start =
        trayRef.current && trayRef.current.contains(e.target as Node)
          ? null
          : { x: e.clientX, y: e.clientY };
    };
    const onUp = (e: PointerEvent) => {
      if (!start) return;
      const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y);
      start = null;
      if (moved > 8) return;
      setOperation({ kind: "idle" });
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, [depth, setOperation]);

  // Keyboard users land inside the panel when an operation begins. A pointer
  // user keeps their focus where it was, so the timeline stays theirs.
  useEffect(() => {
    if (depth === "none") return;
    const active = document.activeElement;
    const cameFromKeyboard =
      active instanceof SVGElement || active === document.body || active === null;
    if (depth === "focused" || cameFromKeyboard) trayRef.current?.focus();
  }, [depth, operation]);

  const summary = operationSummary(operation, branches, t);

  // Idle: nothing to show.
  if (depth === "none") {
    return (
      <p className="visually-hidden" role="status">
        {summary}
      </p>
    );
  }

  if (depth === "quick") {
    return (
      <>
        <p className="visually-hidden" role="status">
          {summary}
        </p>
        <div
          ref={trayRef}
          tabIndex={-1}
          className="quick-tray"
          role="complementary"
          aria-label={t(trayLabel(operation))}
        >
          <div
            className="quick-tray-grip"
            aria-hidden="true"
            onTouchStart={(e) => {
              touchStartY.current = e.touches[0]?.clientY ?? null;
            }}
            onTouchEnd={(e) => {
              const start = touchStartY.current;
              touchStartY.current = null;
              const end = e.changedTouches[0]?.clientY;
              if (start != null && end != null && end - start > 40) {
                setOperation({ kind: "idle" });
              }
            }}
          />
          {operationBody(operation)}
        </div>
      </>
    );
  }

  return (
    <>
      <p className="visually-hidden" role="status">
        {summary}
      </p>
      <div
        className="sheet-backdrop"
        aria-hidden="true"
        onClick={() => setOperation({ kind: "idle" })}
      />
      <div
        ref={trayRef}
        tabIndex={-1}
        className="touch-sheet operation-tray"
        role="dialog"
        aria-modal="true"
        aria-label={t(trayLabel(operation))}
      >
        {operationBody(operation)}
      </div>
    </>
  );
}
