import type { PsychologicalBranch } from "@/domain/branches/types";
import { isOpen, isWaiting, isClosed, mostActivated } from "@/domain/branches/logic";
import type { TimeWindow } from "../zoom/time-scale";

function monthYear(iso: string): string {
  return new Date(iso.length > 10 ? iso : iso + "T00:00:00").toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

/**
 * Complete non-visual equivalent of the branching timeline.
 * Example: "Main life timeline from January 2025 to the present. Three active branches
 * reach today. Relationship separation began in February 2026 and has pull level five."
 */
export function describeTimeline(
  branches: PsychologicalBranch[],
  window: TimeWindow,
): string {
  const open = branches.filter((b) => isOpen(b) && !isWaiting(b));
  const waiting = branches.filter(isWaiting);
  const merged = branches.filter(isClosed);

  const parts: string[] = [
    `Main life timeline from ${monthYear(window.start)} to the present.`,
  ];

  parts.push(
    open.length === 0
      ? "No active branches reach today."
      : `${numberWord(open.length)} active ${open.length === 1 ? "branch reaches" : "branches reach"} today.`,
  );

  for (const b of open) {
    parts.push(
      `${b.title} began ${b.forkLabel ? b.forkLabel : "in " + monthYear(b.forkDate)} and has pull level ${numberWord(b.pull).toLowerCase()}.`,
    );
  }

  const top = mostActivated(branches);
  if (top && open.length > 1) {
    parts.push(`${top.title} is currently the most activated branch.`);
  }
  if (waiting.length > 0) {
    parts.push(
      `${numberWord(waiting.length)} ${waiting.length === 1 ? "branch is" : "branches are"} in deliberate waiting.`,
    );
  }
  if (merged.length > 0) {
    parts.push(
      `${numberWord(merged.length)} ${merged.length === 1 ? "branch has" : "branches have"} been merged and remain part of your history.`,
    );
  }
  return parts.join(" ");
}

export function describeBranch(branch: PsychologicalBranch): string {
  const parts: string[] = [
    `${branch.title}. ${statusText(branch)}.`,
    `Began ${branch.forkLabel ?? "in " + monthYear(branch.forkDate)}.`,
    `Pull level ${numberWord(branch.pull).toLowerCase()}.`,
  ];
  if (branch.commits.length > 0) {
    parts.push(`${numberWord(branch.commits.length)} ${branch.commits.length === 1 ? "moment" : "moments"} recorded.`);
  }
  if (branch.storedQualities.length > 0) {
    parts.push(`Carries ${branch.storedQualities.join(", ")}.`);
  }
  return parts.join(" ");
}

function statusText(branch: PsychologicalBranch): string {
  switch (branch.status) {
    case "active": return "Active branch reaching today";
    case "activated": return "Currently activated branch";
    case "explored": return "Explored branch, still active";
    case "ready-to-merge": return "Ready to merge into Now";
    case "merge-conflict": return "In conflict with another branch";
    case "waiting-with-boundaries": return "Waiting with boundaries";
    case "converted-to-project": return "Handed off to real work";
    case "partly-integrated": return "Partly integrated";
    case "merged": return "Merged into your life";
    case "archived": return "Archived";
    case "needs-support": return "May need outside support";
  }
}

const WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
export function numberWord(n: number): string {
  return n >= 0 && n < WORDS.length ? WORDS[n] : String(n);
}
