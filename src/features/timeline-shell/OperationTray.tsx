import { useEffect, useRef } from "react";
import { useAppStore, type TimelineOperation } from "@/stores/app-store";
import type { PsychologicalBranch } from "@/domain/branches/types";
import { BranchTouchView } from "@/features/branch-touch/BranchTouchView";
import { BranchView } from "@/features/branch-inspection/BranchView";
import { CreateBranch } from "@/features/branch-creation/CreateBranch";
import { RecurrenceCheck } from "@/features/branch-creation/RecurrenceCheck";
import { MergeWizard } from "@/features/branch-merge/MergeWizard";
import { WaitingSetup } from "@/features/waiting-branches/WaitingSetup";

function trayLabel(op: TimelineOperation): string {
  switch (op.kind) {
    case "creating-branch":
      return "New branch";
    case "checking-recurrence":
      return "This has returned before";
    case "inspecting-branch":
      return "This branch";
    case "merging-branch":
      return "Merge into Now";
    case "creating-waiting-container":
      return "Deliberate waiting";
    default:
      return "";
  }
}

/** Spoken summary of what is happening on the timeline right now. */
function operationSummary(op: TimelineOperation, branches: PsychologicalBranch[]): string {
  const title = (id: string) => branches.find((b) => b.id === id)?.title ?? "a branch";
  switch (op.kind) {
    case "idle":
      return "";
    case "creating-branch":
      return "Starting a new branch over the timeline.";
    case "checking-recurrence":
      return "This branch has returned before. Choosing how to continue.";
    case "inspecting-branch":
      return `${op.depth === "deep" ? "Looking deeper into" : "Touching"} the branch “${title(
        op.branchId,
      )}”. The timeline stays behind this panel.`;
    case "merging-branch":
      return op.branchIds.length === 1
        ? `Merging “${title(op.branchIds[0])}” into Now.`
        : `Merging ${op.branchIds.length} branches into Now together.`;
    case "creating-waiting-container":
      return `Placing “${title(op.branchId)}” in deliberate waiting.`;
    case "integrating":
      return op.branchIds.length === 0
        ? "Integrate Now: select the branch endpoints that can enter the present together."
        : `Integrate Now: ${op.branchIds.length} selected.`;
  }
}

/**
 * The anchored panel where the current timeline operation happens. The
 * timeline stays visible behind it: you act on a line while seeing the whole.
 */
export function OperationTray() {
  const operation = useAppStore((s) => s.operation);
  const setOperation = useAppStore((s) => s.setOperation);
  const branches = useAppStore((s) => s.branches);
  const trayRef = useRef<HTMLDivElement>(null);

  // Escape sets the operation down; the timeline is still right there.
  useEffect(() => {
    if (operation.kind === "idle") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOperation({ kind: "idle" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [operation.kind, setOperation]);

  // Keyboard users land inside the panel when an operation begins.
  useEffect(() => {
    if (operation.kind === "idle" || operation.kind === "integrating") return;
    trayRef.current?.focus();
  }, [operation.kind]);

  const summary = operationSummary(operation, branches);

  // Idle: nothing to show. Integrating happens directly on the timeline —
  // no tray, but Escape (above) still sets the operation down.
  if (operation.kind === "idle" || operation.kind === "integrating") {
    return (
      <p className="visually-hidden" role="status">
        {summary}
      </p>
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
        aria-label={trayLabel(operation)}
      >
        {operation.kind === "creating-branch" && <CreateBranch />}
        {operation.kind === "checking-recurrence" && (
          <RecurrenceCheck
            matchedBranchId={operation.matchedBranchId}
            pending={operation.pending}
          />
        )}
        {operation.kind === "inspecting-branch" && operation.depth === "touch" && (
          <BranchTouchView key={operation.branchId} branchId={operation.branchId} sheet />
        )}
        {operation.kind === "inspecting-branch" && operation.depth === "deep" && (
          <BranchView key={operation.branchId} branchId={operation.branchId} />
        )}
        {operation.kind === "merging-branch" && (
          <MergeWizard branchIds={operation.branchIds} />
        )}
        {operation.kind === "creating-waiting-container" && (
          <WaitingSetup branchId={operation.branchId} />
        )}
      </div>
    </>
  );
}
