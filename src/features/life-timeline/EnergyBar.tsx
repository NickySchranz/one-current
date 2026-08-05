import { useMemo } from "react";
import { useAppStore } from "@/stores/app-store";
import { energySplit } from "@/domain/feelings/logic";
import { branchColor } from "@/visualization/branch-lines/style";
import type { PsychologicalBranch } from "@/domain/branches/types";

type Props = {
  branches: PsychologicalBranch[];
};

/**
 * Where your energy is today: one segmented strip. The wide accent segment is
 * you, on your line; each colored sliver is a branch still holding a share.
 * Deciding something about a line visibly shrinks its sliver for the day.
 */
export function EnergyBar({ branches }: Props) {
  const setView = useAppStore((s) => s.setView);
  const theme = useAppStore((s) => s.theme);

  const split = useMemo(() => energySplit(branches), [branches]);
  const pct = (v: number) => `${Math.round(v * 100)}%`;

  if (split.parts.length === 0) {
    return (
      <div className="energy-bar" aria-label="Where your energy is">
        <div className="energy-track">
          <div className="energy-seg energy-main" style={{ width: "100%" }} />
        </div>
        <span className="hint">All of your energy is on your one line.</span>
      </div>
    );
  }

  return (
    <div className="energy-bar" aria-label="Where your energy is">
      <div className="energy-track">
        <div
          className="energy-seg energy-main"
          style={{ width: pct(split.mainShare) }}
          title={`With you on your line · ${pct(split.mainShare)}`}
        />
        {split.parts.map(({ branch, share }) => (
          <button
            key={branch.id}
            className="energy-seg"
            style={{ width: pct(share), background: branchColor(branch, theme) }}
            title={`${branch.title} · ${pct(share)}`}
            aria-label={`${branch.title} holds ${pct(share)} of your energy. Select to decide something about it.`}
            onClick={() => setView({ kind: "touch", branchId: branch.id })}
          />
        ))}
      </div>
      <span className="hint">
        {pct(split.mainShare)} of your energy is with you · the rest sits on{" "}
        {split.parts.length === 1 ? "one line" : `${split.parts.length} lines`}
      </span>
    </div>
  );
}
