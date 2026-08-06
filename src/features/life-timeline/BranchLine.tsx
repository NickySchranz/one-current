import { memo } from "react";
import type { PsychologicalBranch } from "@/domain/branches/types";
import type { BranchGeometry } from "@/visualization/branch-lines/paths";
import { branchColor, restingToday } from "@/visualization/branch-lines/style";
import type { ThemeId } from "@/visualization/theme";
import { decidedToday } from "@/domain/feelings/logic";
import { isClosed, isOpen } from "@/domain/branches/logic";
import { describeBranch } from "@/visualization/a11y/describe";
import { useT } from "@/i18n/i18n";

type Props = {
  branch: PsychologicalBranch;
  geometry: BranchGeometry;
  theme: ThemeId;
  focused: boolean;
  emphasizedId?: string;
  /** The branch belongs to the action currently shown in the stack. */
  highlighted?: boolean;
  /** Another branch is in focus; this one steps back. */
  dimmed?: boolean;
  /** Just created: the line draws itself from the fork toward Now. */
  born?: boolean;
  onSelect: () => void;
  onSelectMoment: (momentId: string) => void;
  onSelectMergePoint: () => void;
};

/** One branch: fork curve, run, optional merge curve, moments, label, endpoint. */
export const BranchLine = memo(function BranchLine({
  branch,
  geometry: g,
  theme,
  focused,
  emphasizedId,
  highlighted = false,
  dimmed = false,
  born = false,
  onSelect,
  onSelectMoment,
  onSelectMergePoint,
}: Props) {
  const t = useT();
  // A closed line lives in its own time frame: off the window, nothing is drawn.
  if (!g.inWindow) return null;

  const resting = restingToday(branch);
  // A decision was taken on this line today: it rests, marked with a quiet check.
  const acted = isOpen(branch) && decidedToday(branch);
  const emphasized =
    !resting &&
    !acted &&
    !dimmed &&
    (g.style.emphasized || branch.id === emphasizedId || highlighted);
  const color = branchColor(branch, theme, emphasized ? "raised" : g.style.saturation);
  const label = branch.title.length > 34 ? branch.title.slice(0, 32) + "…" : branch.title;

  return (
    <g
      role="button"
      tabIndex={-1}
      aria-label={describeBranch(branch, t)}
      data-branch-id={branch.id}
      className={dimmed ? "branch-dimmed" : undefined}
      opacity={dimmed ? 0.22 : 1}
    >
      {/* generous invisible hit area */}
      <path className="branch-hit" d={g.path} onClick={onSelect} />

      {/* soft halo behind the line of the action being viewed */}
      {highlighted && (
        <path
          className="branch-halo"
          d={g.path}
          stroke={color}
          strokeWidth={g.thickness + 9}
          opacity={0.16}
          fill="none"
          strokeLinecap="round"
          pointerEvents="none"
        />
      )}

      {/* the visible line; a newborn line draws itself from the fork toward Now */}
      <path
        className={`branch-line ${born ? "just-born" : ""}`}
        d={g.path}
        pathLength={born ? 1 : undefined}
        stroke={color}
        strokeWidth={focused || highlighted ? g.thickness + 1.25 : g.thickness}
        strokeDasharray={born ? undefined : g.style.dashArray}
        opacity={g.style.opacity}
        pointerEvents="none"
      />

      {/* subtle directional movement toward the present */}
      {!born && g.style.animated && (
        <path
          className={`branch-flow ${emphasized ? "emphasized" : ""}`}
          d={g.path}
          stroke={color}
          strokeWidth={Math.max(1.5, g.thickness - 1)}
          fill="none"
          pointerEvents="none"
        />
      )}

      {/* fork point on the main line — only when the fork moment is in view */}
      {g.forkVisible && (
        <circle className="fork-dot" cx={g.forkX} cy={g.forkY} r={4} stroke={color} />
      )}

      {/* moments along the branch */}
      {g.momentPoints.map((p) => (
        <circle
          key={p.moment.id}
          className="moment-dot"
          cx={p.x}
          cy={p.y}
          r={4.5}
          fill={color}
          onClick={(e) => {
            e.stopPropagation();
            onSelectMoment(p.moment.id);
          }}
        >
          <title>{p.moment.title}</title>
        </circle>
      ))}

      {/* endpoint: merge point on the main line, or presence at Now */}
      {g.endsOnMain ? (
        <circle
          className="merge-point"
          cx={g.endX}
          cy={g.endY}
          r={6}
          stroke={color}
          onClick={(e) => {
            e.stopPropagation();
            onSelectMergePoint();
          }}
        >
          <title>{t("Integrated: {title}", { title: branch.title })}</title>
        </circle>
      ) : (
        <>
          <circle
            className={`branch-endpoint ${emphasized ? "pulse" : ""}`}
            cx={g.endX - 3}
            cy={g.endY}
            r={acted ? 6.5 : emphasized ? 6 : 5}
            fill={color}
            opacity={acted ? 0.9 : g.style.opacity}
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
          />
        </>
      )}

      {/* a decision was taken here today: a quiet check at the line's end */}
      {acted && !g.endsOnMain && (
        <path
          className="acted-check"
          d={`M ${g.endX - 6} ${g.endY + 0.2} l 2.2 2.3 l 4 -4.8`}
          pointerEvents="none"
          aria-hidden="true"
        />
      )}

      {/* a merged line or one deliberately left for today carries no label —
          it has been answered; a left line's label returns tomorrow */}
      {g.labelVisible && !resting && !isClosed(branch) && (
        <text
          className={`branch-label ${focused ? "selected" : ""}`}
          // A line at Now reads backwards from its endpoint, so no label ever
          // spills past Now — the future stays clean.
          x={g.reachesNow ? g.endX - 12 : g.labelX}
          textAnchor={g.reachesNow ? "end" : undefined}
          y={g.labelY}
          fill={color}
          onClick={onSelect}
        >
          {label}
          {branch.recurrenceCount > 0 ? t(" · returned") : ""}
          {acted ? t(" · decided today") : ""}
        </text>
      )}
    </g>
  );
});
