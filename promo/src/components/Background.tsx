import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { brand, moods, Mood } from "../brand";

/* Soft gradient backdrop with three slow "current" lines drifting through —
   the product metaphor, kept faint enough to sit behind everything. */
export const Background: React.FC<{ mood: Mood }> = ({ mood }) => {
  const m = moods[mood];
  const frame = useCurrentFrame();
  const dark = mood === "dusk" || mood === "night";
  const lineColor = dark ? "rgba(255,255,255,0.10)" : "rgba(63,111,95,0.16)";

  const wave = (y: number, amp: number, speed: number, phase: number) => {
    const pts: string[] = [];
    for (let x = -100; x <= 1180; x += 40) {
      const yy =
        y +
        Math.sin((x / 1080) * Math.PI * 2 + frame * speed + phase) * amp +
        Math.sin((x / 1080) * Math.PI * 5 + frame * speed * 0.7) * amp * 0.35;
      pts.push(`${x},${yy.toFixed(1)}`);
    }
    return `M ${pts.join(" L ")}`;
  };

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(120% 90% at 50% 12%, ${m.from} 0%, ${m.to} 68%, ${m.to} 100%)`,
      }}
    >
      <svg
        width="1080"
        height="1920"
        viewBox="0 0 1080 1920"
        style={{ position: "absolute", inset: 0 }}
      >
        {[0, 1, 2].map((i) => (
          <path
            key={i}
            d={wave(240 + i * 690, 26 + i * 10, 0.012 + i * 0.004, i * 2.1)}
            stroke={lineColor}
            strokeWidth={i === 1 ? 5 : 3}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={i === 1 ? undefined : "1 26"}
          />
        ))}
      </svg>
      <AbsoluteFill
        style={{
          background: `radial-gradient(90% 60% at 50% 108%, ${dark ? "rgba(0,0,0,0.42)" : "rgba(63,111,95,0.10)"} 0%, transparent 70%)`,
        }}
      />
    </AbsoluteFill>
  );
};

export const inkFor = (mood: Mood) =>
  mood === "dusk" || mood === "night" ? "#f2f0e9" : brand.ink;
export const subInkFor = (mood: Mood) =>
  mood === "dusk" || mood === "night" ? "rgba(242,240,233,0.72)" : brand.inkSoft;
