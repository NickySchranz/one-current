import type { PsychologicalBranch } from "@/domain/branches/types";
import { assignLanes, laneExtents, type LaneAssignment } from "../branch-lines/lanes";
import { buildBranchGeometry, type BranchGeometry, type TimelineMetrics } from "../branch-lines/paths";
import { dateToXRaw, defaultWindow, type TimeWindow } from "../zoom/time-scale";

export type TimelineLayout = {
  window: TimeWindow;
  metrics: TimelineMetrics;
  assignments: LaneAssignment[];
  geometries: BranchGeometry[];
  /** Total height needed to contain the main line and all lanes. */
  height: number;
  /** Where the current moment falls in the window; anything right of it is projection. */
  nowX: number;
  mainY: number;
  /** Full drawable width. */
  fullWidth: number;
};

export type LayoutOptions = {
  width: number;
  /**
   * Available vertical space. When provided, the main line and lanes are
   * distributed to fill it; otherwise a content-sized height is computed.
   */
  height?: number;
  window?: TimeWindow;
  /** Compact metrics stack lanes closer together on small screens. */
  compact?: boolean;
  /** Vertical zoom: scales the space between lanes (1 = default). */
  yZoom?: number;
  now?: Date;
};

const MIN_LANE_GAP = 34;
const MAX_LANE_GAP = 110;
const TOP_PAD = 36; // room for labels above the top lane and the Now label
const BOTTOM_PAD = 40; // room for the axis labels

/** Pure composition of the whole timeline scene: lanes, geometry, heights. */
export function buildTimelineLayout(
  branches: PsychologicalBranch[],
  options: LayoutOptions,
): TimelineLayout {
  const now = options.now ?? new Date();
  const window =
    options.window ?? defaultWindow(branches.map((b) => b.forkDate), now);

  // Now sits wherever the current moment falls in the window. The window may
  // extend a little past today; that band is the projection, and it pans and
  // zooms with the rest of time instead of being pinned to the right edge.
  const width = options.width;
  const nowX = Math.max(0, Math.min(width, dateToXRaw(now.toISOString(), window, width)));

  const assignments = assignLanes(branches, now);
  // Lanes alternate below and above so the main line stays in the middle.
  const { above, below } = laneExtents(assignments);
  const total = above + below;

  let laneGap = options.compact ? 40 : 52;
  let height: number;

  if (options.height && options.height > 0) {
    // Fill the available space: lanes spread out to occupy it.
    height = options.height;
    laneGap = Math.min(
      MAX_LANE_GAP,
      Math.max(MIN_LANE_GAP, Math.floor((height - TOP_PAD - BOTTOM_PAD) / Math.max(total, 2))),
    );
  } else {
    height = Math.max(TOP_PAD + total * laneGap + BOTTOM_PAD, options.compact ? 200 : 260);
  }

  // Vertical zoom: squeeze many lanes into view, or spread a few apart.
  const yZoom = options.yZoom ?? 1;
  if (yZoom !== 1) {
    laneGap = Math.min(160, Math.max(14, Math.round(laneGap * yZoom)));
  }

  // Center the whole band of lanes; with no branches the main line sits mid-stage.
  const spare = Math.max(0, height - TOP_PAD - BOTTOM_PAD - total * laneGap);
  const mainY = Math.round(TOP_PAD + above * laneGap + spare / 2);

  const metrics: TimelineMetrics = {
    width,
    nowX,
    mainY,
    laneGap,
    curveLength: options.compact ? 40 : 64,
  };

  const byId = new Map(assignments.map((a) => [a.branchId, a]));
  const geometries = branches
    .map((b) => {
      const a = byId.get(b.id);
      return a ? buildBranchGeometry(b, a, window, metrics) : undefined;
    })
    .filter((g): g is BranchGeometry => !!g);

  return {
    window,
    metrics,
    assignments,
    geometries,
    height,
    nowX,
    mainY,
    fullWidth: width,
  };
}
