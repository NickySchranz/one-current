import React from "react";
import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../brand";
import type { Mood } from "../brand";

export type Cue = {
  at: number; // frame (relative to the clip segment) the line appears
  text: string;
  hold?: number; // frames to stay; default = until next cue or segment end
};

/* One caption line at a time in a pill near the bottom, springing up on
   entry. Sized for phone-scale legibility (reels are watched at ~5cm wide). */
export const Captions: React.FC<{
  mood: Mood;
  cues: Cue[];
  segmentDuration: number;
}> = ({ mood, cues, segmentDuration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dark = mood === "dusk" || mood === "night";

  return (
    <>
      {cues.map((cue, i) => {
        const end = cue.hold
          ? cue.at + cue.hold
          : (cues[i + 1]?.at ?? segmentDuration) - 4;
        if (frame < cue.at || frame > end) return null;
        const s = spring({
          frame: frame - cue.at,
          fps,
          config: { damping: 200, stiffness: 130 },
        });
        const out = interpolate(frame, [end - 6, end], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 96,
              display: "flex",
              justifyContent: "center",
              opacity: Math.min(s, out),
              transform: `translateY(${(1 - s) * 30}px)`,
              fontFamily: brand.fontStack,
            }}
          >
            <div
              style={{
                maxWidth: 900,
                padding: "26px 44px",
                borderRadius: 28,
                background: dark ? "rgba(16,24,20,0.86)" : "rgba(250,248,242,0.94)",
                color: dark ? "#f2f0e9" : brand.ink,
                fontSize: 44,
                fontWeight: 600,
                lineHeight: 1.32,
                textAlign: "center",
                boxShadow: "0 14px 40px rgba(0,0,0,0.22)",
                border: `2px solid ${dark ? "rgba(159,208,189,0.35)" : brand.accentSoft}`,
              }}
            >
              {cue.text}
            </div>
          </div>
        );
      })}
    </>
  );
};
