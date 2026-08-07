import { describe, it, expect, vi } from "vitest";
import {
  createBranch,
  resolveForkDate,
  isOpen,
  isClosed,
  branchEndDate,
  reduceLoudnessAfterMerge,
  mostActivated,
  effectiveLoudness,
  easeLoudness,
} from "@/domain/branches/logic";
import { createMoment, addMomentToBranch, beliefsFormed } from "@/domain/moments/logic";
import { buildBranchDiff, mergeableContent } from "@/domain/branches/diff";
import { detectConflicts, resolveConflict, unresolvedConflicts, defaultDemand } from "@/domain/conflicts/logic";
import { createMerge, applyMergeToBranch, UnresolvedConflictError } from "@/domain/merges/logic";
import { composeIntegratedAction } from "@/domain/actions/logic";
import { createWaitingContainer, applyWaitingToBranch, isReviewDue } from "@/domain/waiting/logic";
import { detectRecurrence, recordRecurrence, recommendForRecurrence } from "@/domain/branches/recurrence";
import { energySplit, heldFeelings, integrationSummary, suggestLockedFeelings } from "@/domain/feelings/logic";
import type { PsychologicalBranch } from "@/domain/branches/types";

const NOW = new Date("2026-08-04T12:00:00Z");

function mkBranch(over: Partial<PsychologicalBranch> = {}): PsychologicalBranch {
  return {
    ...createBranch(
      { title: "test branch", kindChoiceId: "something-happened", period: { kind: "today" } },
      NOW,
    ),
    ...over,
  };
}

describe("branch creation", () => {
  it("creates an active branch forking today", () => {
    const b = createBranch(
      { title: "  Career uncertainty ", kindChoiceId: "feared-future", period: { kind: "today" }, loudness: 4 },
      NOW,
    );
    expect(b.title).toBe("Career uncertainty");
    expect(b.status).toBe("active");
    expect(b.type).toBe("projection");
    expect(b.orientation).toBe("future");
    expect(b.loudness).toBe(4);
    expect(b.forkDate).toBe("2026-08-04");
    expect(isOpen(b)).toBe(true);
  });

  it("places the fork at the correct period", () => {
    expect(resolveForkDate({ kind: "yesterday" }, NOW).forkDate).toBe("2026-08-03");
    expect(resolveForkDate({ kind: "approximate-date", date: "2025-02-10" }, NOW).forkDate).toBe("2025-02-10");
    const period = resolveForkDate(
      { kind: "life-period", label: "after the move", approximateDate: "2023-06-15" },
      NOW,
    );
    expect(period.forkDate).toBe("2023-06-15");
    expect(period.forkLabel).toBe("after the move");
    const unsure = resolveForkDate({ kind: "unsure" }, NOW);
    expect(unsure.forkDate < "2026-08-04").toBe(true);
    expect(unsure.forkLabel).toBe("some time ago");
  });

  it("open branches always reach Now", () => {
    const b = mkBranch({ forkDate: "2026-01-01" });
    expect(branchEndDate(b, NOW)).toBe("2026-08-04");
  });
});

describe("moments", () => {
  it("adds moments in chronological order", () => {
    let b = mkBranch();
    b = addMomentToBranch(b, createMoment({ branchId: b.id, date: "2026-07-01", title: "Later", type: "event" }));
    b = addMomentToBranch(b, createMoment({ branchId: b.id, date: "2026-06-01", title: "Earlier", type: "setback" }));
    expect(b.commits.map((m) => m.title)).toEqual(["Earlier", "Later"]);
  });

  it("collects beliefs formed along the branch", () => {
    let b = mkBranch({ originalBelief: "I cannot relax until this is resolved." });
    b = addMomentToBranch(
      b,
      createMoment({ branchId: b.id, date: "2026-07-01", title: "Talk", type: "belief", beliefAdded: "It is survivable." }),
    );
    expect(beliefsFormed(b)).toEqual(["I cannot relax until this is resolved.", "It is survivable."]);
  });
});

describe("psychological diff", () => {
  it("compares fork reality with present reality", () => {
    let b = mkBranch({ originalBelief: "I have fallen behind.", currentBelief: "I moved at a human pace." });
    b = addMomentToBranch(
      b,
      createMoment({ branchId: b.id, date: "2026-07-10", title: "Finished the course", type: "action" }),
    );
    b = addMomentToBranch(
      b,
      createMoment({ branchId: b.id, date: "2026-07-20", title: "Saw it differently", type: "insight" }),
    );
    const diff = buildBranchDiff(b);
    expect(diff.fork.believed).toEqual(["I have fallen behind."]);
    expect(diff.now.currentlyTrue).toEqual(["I moved at a human pace."]);
    expect(diff.now.actionTaken).toContain("Finished the course");
    expect(diff.now.learned).toContain("Saw it differently");
  });

  it("carries only what is valid and reclaimable into a merge", () => {
    const { carried, released } = mergeableContent({
      stillValid: ["I need connection."],
      outdated: ["My life cannot begin yet."],
      outsideControl: ["their answer"],
      reclaimable: ["confidence"],
    });
    expect(carried).toEqual(["I need connection.", "confidence"]);
    expect(released).toEqual(["My life cannot begin yet.", "their answer"]);
  });
});

describe("merge conflicts", () => {
  it("detects effort-vs-recovery between work and body branches", () => {
    const career = mkBranch({ id: "b-career", title: "Career", type: "project", orientation: "project" });
    const body = mkBranch({ id: "b-body", title: "Exhaustion", type: "body", orientation: "body" });
    const conflicts = detectConflicts([career, body]);
    expect(conflicts.some((c) => c.type === "effort-vs-recovery")).toBe(true);
  });

  it("detects nothing for a lone branch", () => {
    expect(detectConflicts([mkBranch()])).toEqual([]);
  });

  it("resolution clears the unresolved list", () => {
    const career = mkBranch({ id: "b1", type: "project", orientation: "project" });
    const body = mkBranch({ id: "b2", type: "body", orientation: "body" });
    let conflicts = detectConflicts([career, body]);
    expect(unresolvedConflicts(conflicts).length).toBeGreaterThan(0);
    conflicts = conflicts.map((c) =>
      resolveConflict(c, "Moderate work after rest.", ["work matters", "body is real"], ["all-nighter"]),
    );
    expect(unresolvedConflicts(conflicts)).toEqual([]);
  });

  it("every branch has a default demand", () => {
    expect(defaultDemand(mkBranch({ type: "waiting", orientation: "outside-control" }))).toMatch(/not yours/i);
  });
});

describe("merging", () => {
  const pr = {
    stillValid: ["The work needs direction."],
    outdated: ["I must solve everything tonight."],
    outsideControl: ["the market"],
    reclaimable: ["direction"],
  };

  it("merges one branch: it ends at a merge point and keeps history", () => {
    const b = mkBranch({ loudness: 5 });
    const merge = createMerge(
      { branches: [b], preserveRelease: pr, conflicts: [], resolution: "done", released: ["checking"], resultStatus: "merged" },
      NOW,
    );
    const after = applyMergeToBranch(b, merge, NOW);
    expect(after.status).toBe("merged");
    expect(isClosed(after)).toBe(true);
    expect(after.mergeDate).toBe("2026-08-04");
    expect(after.mergeIds).toContain(merge.id);
    expect(after.storedQualities).toContain("direction");
    expect(after.loudness).toBe(1);
  });

  it("refuses to complete with unresolved conflicts", () => {
    const career = mkBranch({ id: "c1", type: "project", orientation: "project" });
    const body = mkBranch({ id: "c2", type: "body", orientation: "body" });
    const conflicts = detectConflicts([career, body]);
    expect(() =>
      createMerge(
        { branches: [career, body], preserveRelease: pr, conflicts, resolution: "", released: [], resultStatus: "merged" },
        NOW,
      ),
    ).toThrow(UnresolvedConflictError);
  });

  it("merges several branches into one action", () => {
    const career = mkBranch({ id: "m1", title: "Career", type: "project", orientation: "project" });
    const body = mkBranch({ id: "m2", title: "Body", type: "body", orientation: "body" });
    const conflicts = detectConflicts([career, body]).map((c) =>
      resolveConflict(c, "Moderate effort after food.", [], []),
    );
    const action = composeIntegratedAction(
      {
        branches: [career, body],
        title: "One grounded evening",
        instruction: "Eat, move moderately for twenty minutes, then define tomorrow's one work action.",
        durationMinutes: 60,
        minimumVersion: "Eat and write one sentence.",
        qualitiesCarried: ["direction", "vitality"],
        completionDefinition: "The work action is written down.",
      },
      NOW,
    );
    expect(action.branchesIntegrated).toHaveLength(2);
    expect(action.branchesIntegrated.map((r) => r.branchId)).toEqual(["m1", "m2"]);
    const merge = createMerge(
      { branches: [career, body], preserveRelease: pr, conflicts, resolution: "ok", released: [], action, resultStatus: "merged" },
      NOW,
    );
    expect(merge.branchIds).toEqual(["m1", "m2"]);
    expect(merge.action?.title).toBe("One grounded evening");
  });

  it("partly-merged branches stay open with reduced loudness", () => {
    const b = mkBranch({ loudness: 4 });
    const merge = createMerge(
      { branches: [b], preserveRelease: pr, conflicts: [], resolution: "some", released: [], resultStatus: "partly-merged" },
      NOW,
    );
    const after = applyMergeToBranch(b, merge, NOW);
    expect(after.status).toBe("partly-integrated");
    expect(isOpen(after)).toBe(true);
    expect(after.loudness).toBe(3);
  });

  it("reduces loudness after merge without going below one", () => {
    expect(reduceLoudnessAfterMerge(5, "merged")).toBe(1);
    expect(reduceLoudnessAfterMerge(1, "waiting")).toBe(1);
    expect(reduceLoudnessAfterMerge(4, "waiting")).toBe(2);
  });
});

describe("deliberate waiting", () => {
  it("creates a waiting container and calms the branch", () => {
    const b = mkBranch({ loudness: 5, title: "Permit application" });
    const container = createWaitingContainer(
      {
        branchId: b.id,
        awaiting: "Decision on the permit",
        actionTaken: "Submitted required documents",
        outsideControl: ["processing time"],
        reviewDate: "2026-08-07",
        reopenConditions: ["new request arrives"],
        continueMeanwhile: ["work", "training"],
        reclaimedNow: ["direction", "stability"],
      },
      NOW,
    );
    const after = applyWaitingToBranch(b, container);
    expect(after.status).toBe("waiting-with-boundaries");
    expect(after.loudness).toBeLessThanOrEqual(2);
    expect(after.waitingContainerId).toBe(container.id);
    expect(after.storedQualities).toContain("stability");
    expect(isReviewDue(container, NOW)).toBe(false);
    expect(isReviewDue(container, new Date("2026-08-08T09:00:00Z"))).toBe(true);
  });
});

describe("handing off to real work", () => {
  it("a handed-off line is closed and holds no feelings", () => {
    const b = mkBranch({
      status: "converted-to-project",
      mergeDate: "2026-08-04",
      occupies: ["calm", "joy"],
    });
    expect(isClosed(b)).toBe(true);
    expect(isOpen(b)).toBe(false);
    expect(heldFeelings(b, NOW)).toEqual([]);
  });
});

describe("recurrence", () => {
  it("detects a returning branch by similarity to merged history", () => {
    const merged = mkBranch({ title: "Fear of losing the apartment", status: "merged", mergeDate: "2026-05-01" });
    const active = mkBranch({ id: "x", title: "Unrelated active thing" });
    expect(detectRecurrence("losing the apartment again", [merged, active])?.id).toBe(merged.id);
    expect(detectRecurrence("completely different topic", [merged, active])).toBeUndefined();
  });

  it("does not match against still-open branches", () => {
    const open = mkBranch({ title: "Fear of losing the apartment" });
    expect(detectRecurrence("losing the apartment", [open])).toBeUndefined();
  });

  it("recurrence increments without erasing the previous merge", () => {
    const merged = mkBranch({ status: "merged", mergeDate: "2026-05-01", mergeIds: ["mg_1"] });
    const after = recordRecurrence(merged, NOW);
    expect(after.recurrenceCount).toBe(1);
    expect(after.status).toBe("merged");
    expect(after.mergeIds).toEqual(["mg_1"]);
  });

  it("recommends sensible paths for each reason", () => {
    expect(recommendForRecurrence("new-event")).toBe("new-branch");
    expect(recommendForRecurrence("new-information")).toBe("reopen");
    expect(recommendForRecurrence("old-belief-returned")).toBe("add-moment");
    expect(recommendForRecurrence("new-emotional-layer")).toBe("recommend-support");
  });
});

describe("activation", () => {
  it("finds the most activated branch", () => {
    const calm = mkBranch({ id: "a", loudness: 2 });
    const loud = mkBranch({ id: "b", loudness: 5, status: "activated" });
    const waiting = mkBranch({ id: "c", loudness: 5, status: "waiting-with-boundaries" });
    expect(mostActivated([calm, loud, waiting])?.id).toBe("b");
  });
});

describe("feelings a line holds", () => {
  it("holds nothing once merged or decided today", () => {
    const open = mkBranch({ occupies: ["calm", "sleep"] });
    expect(heldFeelings(open, NOW)).toEqual(["calm", "sleep"]);
    const decided = mkBranch({ occupies: ["calm"], lastDecisionOn: "2026-08-04" });
    expect(heldFeelings(decided, NOW)).toEqual([]);
    const merged = mkBranch({ occupies: ["calm"], status: "merged", mergeDate: "2026-07-01" });
    expect(heldFeelings(merged, NOW)).toEqual([]);
  });

  it("summarises how feelings are scattered and what returned today", () => {
    const holding = mkBranch({ id: "h", occupies: ["sleep", "focus"] });
    const decided = mkBranch({ id: "d", occupies: ["calm"], lastDecisionOn: "2026-08-04" });
    const quiet = mkBranch({ id: "q" });
    const s = integrationSummary([holding, decided, quiet], NOW);
    expect(s.held).toHaveLength(1);
    expect(s.held[0].branch.id).toBe("h");
    expect(s.returnedToday).toEqual(["calm"]);
    expect(s.withYou).not.toContain("sleep");
    expect(s.withYou).toContain("calm");
  });

  it("a feeling still held elsewhere does not count as returned", () => {
    const decided = mkBranch({ id: "d", occupies: ["calm"], lastDecisionOn: "2026-08-04" });
    const stillHolding = mkBranch({ id: "h", occupies: ["calm"] });
    const s = integrationSummary([decided, stillHolding], NOW);
    expect(s.returnedToday).toEqual([]);
    expect(s.withYou).not.toContain("calm");
  });

  it("suggests which feelings each anxiety locks away", () => {
    expect(suggestLockedFeelings(["worry"])).toEqual(["calm", "sleep"]);
    // Union across anxieties, deduplicated, in vocabulary order.
    const both = suggestLockedFeelings(["worry", "overwhelm"]);
    expect(both).toEqual(["calm", "focus", "sleep"]);
    expect(suggestLockedFeelings([])).toEqual([]);
    expect(suggestLockedFeelings(["not-an-anxiety"])).toEqual([]);
  });
});

describe("energy split across lines", () => {
  it("gives everything to the main line when nothing is open", () => {
    const merged = mkBranch({ status: "merged", mergeDate: "2026-07-01" });
    const s = energySplit([merged], NOW);
    expect(s.mainShare).toBe(1);
    expect(s.parts).toEqual([]);
  });

  it("stronger loudness takes a bigger share; shares sum to one", () => {
    const heavy = mkBranch({ id: "heavy", loudness: 5, lastDecisionOn: "2026-08-03" });
    const light = mkBranch({ id: "light", loudness: 1, lastDecisionOn: "2026-08-03" });
    const s = energySplit([heavy, light], NOW);
    expect(s.parts[0].branch.id).toBe("heavy");
    expect(s.parts[0].share).toBeGreaterThan(s.parts[1].share);
    const total = s.mainShare + s.parts.reduce((sum, p) => sum + p.share, 0);
    expect(total).toBeCloseTo(1);
  });

  it("deciding today shrinks a line's share of your energy", () => {
    const undecided = mkBranch({ id: "u", loudness: 4, lastDecisionOn: "2026-08-03" });
    const before = energySplit([undecided], NOW);
    const decided = mkBranch({ id: "u", loudness: 4, lastDecisionOn: "2026-08-04" });
    const after = energySplit([decided], NOW);
    expect(after.parts[0].share).toBeLessThan(before.parts[0].share);
    expect(after.mainShare).toBeGreaterThan(before.mainShare);
  });
});

describe("loudness of a line", () => {
  it("holds its base through the first undecided day, then grows one step per day", () => {
    const b = mkBranch({ loudness: 2, lastDecisionOn: "2026-08-04" });
    expect(effectiveLoudness(b, NOW)).toBe(2); // decided today
    expect(effectiveLoudness(b, new Date("2026-08-05T12:00:00Z"))).toBe(2); // one day of grace
    expect(effectiveLoudness(b, new Date("2026-08-06T12:00:00Z"))).toBe(3);
    expect(effectiveLoudness(b, new Date("2026-08-07T12:00:00Z"))).toBe(4);
    expect(effectiveLoudness(b, new Date("2026-08-20T12:00:00Z"))).toBe(5); // never past 5
  });

  it("integrated lines and calm waiting hold at the base — no drift", () => {
    const merged = mkBranch({
      loudness: 4,
      status: "merged",
      mergeDate: "2026-08-01",
      lastDecisionOn: "2026-07-01",
    });
    expect(effectiveLoudness(merged, NOW)).toBe(4);
    const waiting = mkBranch({
      loudness: 2,
      status: "waiting-with-boundaries",
      lastDecisionOn: "2026-07-01",
    });
    expect(effectiveLoudness(waiting, NOW)).toBe(2);
  });

  it("a decision eases the level one step, never below one", () => {
    expect(easeLoudness(3)).toBe(2);
    expect(easeLoudness(2)).toBe(1);
    expect(easeLoudness(1)).toBe(1); // quiet is the floor
  });
});

describe("the app clock", () => {
  it("runs faster than real time when a rate is set, without jumping at changes", async () => {
    const { appNow, setRate, setSkewMs } = await import("@/domain/time/clock");
    vi.useFakeTimers();
    try {
      setSkewMs(0);
      setRate(3600); // an hour per second
      const start = appNow().getTime();
      vi.advanceTimersByTime(1000);
      expect(appNow().getTime() - start).toBe(3600 * 1000);
      // Slowing back down folds the elapsed time in — the clock never jumps.
      setRate(1);
      expect(appNow().getTime() - start).toBe(3600 * 1000);
      vi.advanceTimersByTime(1000);
      expect(appNow().getTime() - start).toBe(3600 * 1000 + 1000);
    } finally {
      vi.useRealTimers();
      setSkewMs(0);
    }
  });
});
