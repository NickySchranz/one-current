import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../brand";
import { inkFor, subInkFor } from "./Background";
import { StoreBadgesRow } from "./StoreBadges";
import type { Mood } from "../brand";

/* The logo mark is the metaphor itself: a main line, one branch leaving it,
   and its return into Now. Draws itself in, then the Now dot lands. */
const LogoMark: React.FC<{ ink: string; size?: number }> = ({ ink, size = 340 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const draw = interpolate(frame, [0, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const dot = spring({ frame: frame - 38, fps, config: { damping: 12, stiffness: 180 } });
  const MAIN = 300;
  const BRANCH = 260;
  return (
    <svg width={size} height={size * 0.42} viewBox="0 0 340 143">
      <path
        d="M 10 96 H 330"
        stroke={ink}
        strokeWidth={9}
        strokeLinecap="round"
        strokeDasharray={MAIN}
        strokeDashoffset={MAIN * (1 - draw)}
        fill="none"
      />
      <path
        d="M 60 96 C 110 96 100 36 160 36 C 220 36 210 96 260 96"
        stroke={brand.accent}
        strokeWidth={9}
        strokeLinecap="round"
        strokeDasharray={BRANCH}
        strokeDashoffset={BRANCH * (1 - draw)}
        fill="none"
      />
      <circle cx={260} cy={96} r={16 * Math.max(0, dot)} fill={brand.accent} />
    </svg>
  );
};

export const EndCard: React.FC<{
  mood: Mood;
  pro?: boolean;
  line?: string;
}> = ({ mood, pro, line }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ink = inkFor(mood);
  const subInk = subInkFor(mood);
  const dark = mood === "dusk" || mood === "night";
  const enter = spring({ frame, fps, config: { damping: 200, stiffness: 80 } });
  const late = (d: number) =>
    interpolate(frame, [d, d + 12], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        fontFamily: brand.fontStack,
        opacity: enter,
      }}
    >
      <LogoMark ink={ink} />
      <div style={{ fontSize: 88, fontWeight: 700, color: ink, marginTop: 20 }}>
        One Current
      </div>
      <div
        style={{
          fontSize: 40,
          color: subInk,
          marginTop: 26,
          maxWidth: 840,
          textAlign: "center",
          lineHeight: 1.45,
          opacity: late(14),
        }}
      >
        {line ?? "Free to start. Your threads stay on your device."}
      </div>
      {pro ? (
        <div
          style={{
            marginTop: 40,
            padding: "16px 38px",
            borderRadius: 999,
            background: dark ? "rgba(159,208,189,0.16)" : brand.accentSoft,
            color: dark ? "#9fd0bd" : brand.accent,
            fontSize: 36,
            fontWeight: 700,
            opacity: late(22),
          }}
        >
          Part of Pro · €6/month
        </div>
      ) : null}
      <div style={{ marginTop: 44 }}>
        <StoreBadgesRow height={64} appearAt={26} justify="center" />
      </div>
    </AbsoluteFill>
  );
};
