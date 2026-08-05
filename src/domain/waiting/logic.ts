import { newId } from "../ids";
import type { PsychologicalBranch } from "../branches/types";
import type { WaitingContainer } from "./types";

export type CreateWaitingInput = {
  branchId: string;
  awaiting: string;
  actionTaken: string;
  outsideControl: string[];
  reviewDate: string;
  reopenConditions: string[];
  continueMeanwhile: string[];
  reclaimedNow: string[];
};

export function createWaitingContainer(
  input: CreateWaitingInput,
  now: Date = new Date(),
): WaitingContainer {
  return { id: newId("wt"), createdAt: now.toISOString(), ...input };
}

/** Apply deliberate waiting to a branch: the line stays connected to Now but stops pulling. */
export function applyWaitingToBranch(
  branch: PsychologicalBranch,
  container: WaitingContainer,
): PsychologicalBranch {
  return {
    ...branch,
    status: "waiting-with-boundaries",
    waitingContainerId: container.id,
    pull: Math.min(branch.pull, 2) as PsychologicalBranch["pull"],
    lastDecisionOn: new Date().toISOString().slice(0, 10),
    storedQualities: [...new Set([...branch.storedQualities, ...container.reclaimedNow])],
  };
}

export function isReviewDue(container: WaitingContainer, now: Date = new Date()): boolean {
  return !container.closedAt && container.reviewDate <= now.toISOString().slice(0, 10);
}

export function nextReviewText(container: WaitingContainer, now: Date = new Date()): string {
  if (isReviewDue(container, now)) {
    return `Review is due: ${container.awaiting}`;
  }
  return `Nothing further is required until ${formatReviewDate(container.reviewDate)} or until: ${container.reopenConditions.join("; ")}`;
}

export function formatReviewDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}
