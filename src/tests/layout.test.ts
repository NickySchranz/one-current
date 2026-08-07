import { describe, it, expect } from "vitest";
import { createBranch } from "@/domain/branches/logic";
import type { PsychologicalBranch } from "@/domain/branches/types";
import { assignLanes, laneCount } from "@/visualization/branch-lines/lanes";
import { loudnessToThickness, statusToLineStyle, branchColor } from "@/visualization/branch-lines/style";
import { buildBranchGeometry } from "@/visualization/branch-lines/paths";
import { buildTimelineLayout } from "@/visualization/main-line/layout";
import { dateToX, defaultWindow, generateTicks, zoomWindow, panWindow } from "@/visualization/zoom/time-scale";
import { describeTimeline, describeBranch } from "@/visualization/a11y/describe";

const DAY = 24 * 60 * 60 * 1000;

const NOW = new Date("2026-08-04T12:00:00Z");

function mk(over: Partial<PsychologicalBranch>): PsychologicalBranch {
  return {
    ...createBranch({ title: "b", kindChoiceId: "something-happened", period: { kind: "today" } }, NOW),
    ...over,
  };
}

describe("time scale", () => {
  it("maps dates monotonically to x", () => {
    const w = { start: "2026-01-01", end: "2026-08-04" };
    const x1 = dateToX("2026-02-01", w, 1000);
    const x2 = dateToX("2026-06-01", w, 1000);
    expect(x1).toBeLessThan(x2);
    expect(dateToX("2026-01-01", w, 1000)).toBe(0);
    expect(dateToX("2026-08-04", w, 1000)).toBe(1000);
    expect(dateToX("2020-01-01", w, 1000)).toBe(0); // clamped
  });

  it("default window contains the earliest fork with margin and puts Now at the half-way point", () => {
    const w = defaultWindow(["2025-03-01", "2026-01-01"], NOW);
    expect(w.start < "2025-03-01").toBe(true);
    // The end extends past today: Now sits at the middle of the span.
    expect(w.end > "2026-08-04").toBe(true);
    const span = Date.parse(w.end) - Date.parse(w.start);
    const future = Date.parse(w.end) - Date.parse("2026-08-04");
    expect(Math.abs(future - span / 2)).toBeLessThanOrEqual(DAY);
  });

  it("generates ticks appropriate to the zoom level", () => {
    const years = generateTicks({ start: "2023-01-15", end: "2026-08-04" }, NOW);
    expect(years.map((t) => t.label)).toEqual(["2024", "2025", "2026"]);
    const days = generateTicks({ start: "2026-07-30", end: "2026-08-04" }, NOW);
    expect(days.some((t) => t.label === "Today")).toBe(true);
  });

  it("the right edge extends at most a half-span past today", () => {
    const w = { start: "2026-06-01", end: "2026-08-04" };
    const today = Date.parse("2026-08-04");
    const zoomed = zoomWindow(w, 2, 1, "2026-08-04");
    const zoomedSpan = Date.parse(zoomed.end) - Date.parse(zoomed.start);
    expect(Date.parse(zoomed.end)).toBeLessThanOrEqual(today + zoomedSpan / 2);
    const span = Date.parse(w.end) - Date.parse(w.start);
    // Panning forward stops at the furthest extension...
    const panned = panWindow(w, 0.5, "2026-08-04");
    expect(Date.parse(panned.end)).toBe(today + span / 2);
    // ...and panning back moves the future out of the window entirely.
    const back = panWindow(w, -0.5, "2026-08-04");
    expect(Date.parse(back.end) < today).toBe(true);
  });
});

describe("lane assignment", () => {
  it("gives every open branch its own lane (they all reach Now)", () => {
    const branches = [
      mk({ id: "a", forkDate: "2026-01-01" }),
      mk({ id: "b", forkDate: "2026-03-01" }),
      mk({ id: "c", forkDate: "2026-03-01" }),
    ];
    const lanes = assignLanes(branches, NOW);
    const laneNumbers = lanes.map((l) => l.lane);
    expect(new Set(laneNumbers).size).toBe(3);
  });

  it("reuses a lane after a merged branch ends", () => {
    const branches = [
      mk({ id: "a", forkDate: "2025-01-01", status: "merged", mergeDate: "2025-06-01" }),
      mk({ id: "b", forkDate: "2025-08-01" }),
    ];
    const lanes = assignLanes(branches, NOW);
    expect(laneCount(lanes)).toBe(1);
  });

  it("alternates lanes below and above the main line", () => {
    const branches = [
      mk({ id: "a", forkDate: "2026-01-01" }),
      mk({ id: "b", forkDate: "2026-03-01" }),
      mk({ id: "c", forkDate: "2026-04-01" }),
    ];
    const lanes = assignLanes(branches, NOW).map((l) => l.lane);
    expect(lanes.some((l) => l > 0)).toBe(true);
    expect(lanes.some((l) => l < 0)).toBe(true);
  });

  it("does not reuse a lane while its occupant is still running", () => {
    const branches = [
      mk({ id: "a", forkDate: "2025-01-01", status: "merged", mergeDate: "2026-06-01" }),
      mk({ id: "b", forkDate: "2026-03-01" }),
    ];
    const lanes = assignLanes(branches, NOW);
    expect(laneCount(lanes)).toBe(2);
  });
});

describe("line style", () => {
  it("maps loudness to thickness monotonically", () => {
    expect(loudnessToThickness(1)).toBeLessThan(loudnessToThickness(3));
    expect(loudnessToThickness(3)).toBeLessThan(loudnessToThickness(5));
  });

  it("status maps to distinct, non-colour indicators", () => {
    expect(statusToLineStyle("active").animated).toBe(true);
    // legacy status renders as a normal open line
    expect(statusToLineStyle("waiting-with-boundaries").dashArray).toBeFalsy();
    expect(statusToLineStyle("waiting-with-boundaries").animated).toBe(true);
    expect(statusToLineStyle("merged").curvesToMain).toBe(true);
    expect(statusToLineStyle("merged").opacity).toBeLessThan(statusToLineStyle("active").opacity);
    expect(statusToLineStyle("activated").emphasized).toBe(true);
  });

  it("branch colour is stable and adapts to dark-ground themes", () => {
    const a = branchColor({ id: "x", type: "body" }, "riverbed");
    expect(branchColor({ id: "x", type: "body" }, "riverbed")).toBe(a);
    expect(branchColor({ id: "x", type: "body" }, "duskwood")).not.toBe(a);
  });
});

describe("branch geometry", () => {
  const window = { start: "2025-01-01", end: "2026-08-04" };
  const metrics = { width: 1000, mainY: 56, laneGap: 52, curveLength: 64 };

  const decidedToday = new Date().toISOString().slice(0, 10);

  it("open branches run from the fork to Now at the right edge", () => {
    const b = mk({ id: "g1", forkDate: "2025-06-01", loudness: 1, lastDecisionOn: decidedToday });
    const g = buildBranchGeometry(b, { branchId: "g1", lane: 1, startDate: "2025-06-01", endDate: "2026-08-04" }, window, metrics);
    expect(g.forkX).toBeGreaterThan(0);
    expect(g.endX).toBe(1000);
    expect(g.endsOnMain).toBe(false);
    expect(g.reachesNow).toBe(true);
    expect(g.laneY).toBe(56 + 52);
  });

  it("undecided loudness pushes the line further from the main line", () => {
    const calm = mk({ id: "g4", forkDate: "2025-06-01", loudness: 1, lastDecisionOn: decidedToday });
    const heavy = mk({ id: "g5", forkDate: "2025-06-01", loudness: 5 });
    const lane = { branchId: "x", lane: 1, startDate: "2025-06-01", endDate: "2026-08-04" };
    const gCalm = buildBranchGeometry(calm, { ...lane, branchId: "g4" }, window, metrics);
    const gHeavy = buildBranchGeometry(heavy, { ...lane, branchId: "g5" }, window, metrics);
    expect(gHeavy.laneY).toBeGreaterThan(gCalm.laneY);
  });

  it("merged branches end on the main line at the merge date", () => {
    const b = mk({ id: "g2", forkDate: "2025-03-01", status: "merged", mergeDate: "2026-01-01" });
    const g = buildBranchGeometry(b, { branchId: "g2", lane: 1, startDate: "2025-03-01", endDate: "2026-01-01" }, window, metrics);
    expect(g.endsOnMain).toBe(true);
    expect(g.endY).toBe(metrics.mainY);
    expect(g.endX).toBeLessThan(1000);
  });

  it("places moments along the branch run", () => {
    const b = mk({
      id: "g3",
      forkDate: "2025-06-01",
      commits: [
        { id: "m1", branchId: "g3", date: "2026-01-01", title: "moment", type: "event" },
      ],
    });
    const g = buildBranchGeometry(b, { branchId: "g3", lane: 2, startDate: "2025-06-01", endDate: "2026-08-04" }, window, metrics);
    expect(g.momentPoints).toHaveLength(1);
    expect(g.momentPoints[0].y).toBe(g.laneY);
    expect(g.momentPoints[0].x).toBeGreaterThan(g.forkX);
    expect(g.momentPoints[0].x).toBeLessThan(g.endX);
  });
});

describe("timeline layout", () => {
  it("computes a full collision-free scene", () => {
    const branches = [
      mk({ id: "t1", forkDate: "2025-02-01" }),
      mk({ id: "t2", forkDate: "2025-09-01" }),
      mk({ id: "t3", forkDate: "2026-04-01", status: "merged", mergeDate: "2026-07-01" }),
    ];
    const layout = buildTimelineLayout(branches, { width: 900, now: NOW });
    expect(layout.geometries).toHaveLength(3);
    const laneYs = layout.geometries.filter((g) => !g.endsOnMain).map((g) => g.laneY);
    expect(new Set(laneYs).size).toBe(laneYs.length);
    expect(layout.height).toBeGreaterThan(layout.mainY);
    // Now sits around the middle: the half beyond it is the clean future.
    expect(layout.fullWidth).toBe(900);
    expect(layout.nowX).toBeLessThan(layout.fullWidth * 0.6);
    expect(layout.nowX).toBeGreaterThan(layout.fullWidth * 0.4);
    // Open branches end at Now, not at the right edge.
    const open = layout.geometries.find((g) => g.reachesNow);
    expect(open?.endX).toBe(layout.nowX);
  });

  it("with many threads the canvas grows past the stage instead of cramming lanes", () => {
    const branches = Array.from({ length: 14 }, (_, i) =>
      mk({ id: `m${i}`, forkDate: "2026-05-01" }),
    );
    const layout = buildTimelineLayout(branches, { width: 900, height: 400, now: NOW });
    expect(layout.metrics.laneGap).toBeGreaterThanOrEqual(34);
    expect(layout.height).toBeGreaterThan(400);
  });

  it("compact mode stacks lanes closer for small screens", () => {
    const branches = [mk({ id: "c1" }), mk({ id: "c2" })];
    const normal = buildTimelineLayout(branches, { width: 900, now: NOW });
    const compact = buildTimelineLayout(branches, { width: 360, compact: true, now: NOW });
    expect(compact.metrics.laneGap).toBeLessThan(normal.metrics.laneGap);
  });
});

describe("screen reader descriptions", () => {
  it("summarises the timeline in plain speech", () => {
    const branches = [
      mk({ id: "s1", title: "Relationship separation", forkDate: "2026-02-10", loudness: 5 }),
      mk({ id: "s2", title: "Career uncertainty", forkDate: "2026-06-05", loudness: 3 }),
      mk({ id: "s3", title: "Lost fitness", forkDate: "2026-05-02", loudness: 4 }),
    ];
    const text = describeTimeline(branches, { start: "2025-01-01", end: "2026-08-04" });
    expect(text).toContain("Main life timeline from January 2025 to the present.");
    expect(text).toContain("Three active threads reach today.");
    expect(text).toContain("Relationship separation began in February 2026 and has loudness level five.");
    expect(text).toContain("Career uncertainty began in June 2026 and has loudness level three.");
  });

  it("counts legacy waiting branches as active and mentions merged ones", () => {
    const branches = [
      mk({ id: "w1", title: "Permit", status: "waiting-with-boundaries" }),
      mk({ id: "m1", title: "Old grief", status: "merged", mergeDate: "2026-01-01" }),
    ];
    const text = describeTimeline(branches, { start: "2025-01-01", end: "2026-08-04" });
    expect(text).toContain("One active thread reaches today.");
    expect(text).toContain("One thread has been integrated");
  });

  it("describes a single branch without technical language", () => {
    const text = describeBranch(mk({ title: "Lost fitness", loudness: 4, forkDate: "2026-05-02" }));
    expect(text).toContain("Lost fitness");
    expect(text).toContain("Loudness level four");
    expect(text).not.toMatch(/HEAD|rebase|commit hash/i);
  });

  it("speaks a fractional loudness (fine slider steps) as the nearest whole word", () => {
    const text = describeBranch(mk({ title: "Lost fitness", loudness: 3.4, forkDate: "2026-05-02" }));
    expect(text).toContain("Loudness level three");
    expect(
      describeTimeline([mk({ id: "f1", title: "Rent", loudness: 4.6, forkDate: "2026-06-05" })], {
        start: "2025-01-01",
        end: "2026-08-04",
      }),
    ).toContain("loudness level five");
  });
});
