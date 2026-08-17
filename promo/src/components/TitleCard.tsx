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
import type { Mood } from "../brand";

/* Full-screen opening card: kicker, big headline, optional sub line.
   Springs in, holds, fades out over its last 12 frames. */
export const TitleCard: React.FC<{
  mood: Mood;
  kicker?: string;
  headline: string;
  sub?: string;
  durationInFrames: number;
}> = ({ mood, kicker, headline, sub, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ink = inkFor(mood);
  const subInk = subInkFor(mood);

  const enter = spring({ frame, fps, config: { damping: 200, stiffness: 90 } });
  const exit = interpolate(frame, [durationInFrames - 12, durationInFrames - 2], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const words = headline.split(" ");

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        padding: "0 96px",
        opacity: exit,
        fontFamily: brand.fontStack,
      }}
    >
      {kicker ? (
        <div
          style={{
            fontSize: 34,
            letterSpacing: 7,
            textTransform: "uppercase",
            color: mood === "dusk" || mood === "night" ? "#9fd0bd" : brand.accent,
            fontWeight: 600,
            marginBottom: 42,
            opacity: enter,
          }}
        >
          {kicker}
        </div>
      ) : null}
      <div style={{ textAlign: "center", lineHeight: 1.12 }}>
        {words.map((w, i) => {
          const s = spring({
            frame: frame - i * 3,
            fps,
            config: { damping: 200, stiffness: 110 },
          });
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                fontSize: 92,
                fontWeight: 700,
                color: ink,
                marginRight: 22,
                transform: `translateY(${(1 - s) * 46}px)`,
                opacity: s,
              }}
            >
              {w}
            </span>
          );
        })}
      </div>
      {sub ? (
        <div
          style={{
            marginTop: 48,
            fontSize: 40,
            color: subInk,
            textAlign: "center",
            lineHeight: 1.45,
            maxWidth: 820,
            opacity: interpolate(frame, [16, 30], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          {sub}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
