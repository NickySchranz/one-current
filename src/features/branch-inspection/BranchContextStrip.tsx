import type { PsychologicalBranch } from "@/domain/branches/types";
import { effectivePull, isClosed } from "@/domain/branches/logic";
import { statusToLineStyle, pullToThickness } from "@/visualization/branch-lines/style";
import { useT } from "@/i18n/i18n";

type Props = { branch: PsychologicalBranch; color: string };

/**
 * A slim always-visible strip preserving the connection to the main line and Now
 * while a branch is inspected.
 */
export function BranchContextStrip({ branch, color }: Props) {
  const t = useT();
  const style = statusToLineStyle(branch.status);
  const merged = isClosed(branch);
  const w = 640;
  const mainY = 16;
  const laneY = 40;
  const forkX = 70;
  const endX = merged ? w - 140 : w - 40;

  const monthYear = new Date(branch.forkDate + "T00:00:00").toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });

  return (
    <div className="panel-context" aria-hidden="true">
      <svg
        viewBox={`0 0 ${w} 56`}
        style={{ width: "100%", maxWidth: 760, display: "block", margin: "0 auto", height: 56 }}
        preserveAspectRatio="xMidYMid meet"
      >
        <path d={`M 0 ${mainY} L ${w} ${mainY}`} className="main-line" strokeWidth={2.5} />
        <path
          d={
            `M ${forkX} ${mainY} C ${forkX + 24} ${mainY}, ${forkX + 18} ${laneY}, ${forkX + 42} ${laneY}` +
            ` L ${endX - (merged ? 42 : 0)} ${laneY}` +
            (merged
              ? ` C ${endX - 18} ${laneY}, ${endX - 24} ${mainY}, ${endX} ${mainY}`
              : "")
          }
          fill="none"
          stroke={color}
          strokeWidth={pullToThickness(effectivePull(branch))}
          strokeDasharray={style.dashArray}
          opacity={style.opacity}
          strokeLinecap="round"
        />
        <circle cx={forkX} cy={mainY} r={4} fill="var(--bg)" stroke={color} strokeWidth={2} />
        <text x={forkX} y={mainY - 6} fontSize={11} fill="var(--ink-soft)" textAnchor="middle">
          {branch.forkLabel ?? monthYear}
        </text>
        <circle cx={w - 12} cy={mainY} r={6} fill="var(--accent)" />
        <text x={w - 12} y={mainY - 8} fontSize={11.5} fontWeight={650} fill="var(--ink)" textAnchor="end">
          {t("Now")}
        </text>
        {!merged && <circle cx={endX} cy={laneY} r={4.5} fill={color} opacity={style.opacity} />}
      </svg>
    </div>
  );
}
