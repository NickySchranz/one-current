import React from "react";
import { brand } from "../brand";

/* Static flowing mark: main line, one branch, and its return into Now.
   (EndCard has its own animated draw-in variant.) */
export const LogoMark: React.FC<{ ink: string; size?: number }> = ({ ink, size = 340 }) => (
  <svg width={size} height={size * 0.42} viewBox="0 0 340 143">
    <path d="M 10 96 H 330" stroke={ink} strokeWidth={9} strokeLinecap="round" fill="none" />
    <path
      d="M 60 96 C 110 96 100 36 160 36 C 220 36 210 96 260 96"
      stroke={brand.accent}
      strokeWidth={9}
      strokeLinecap="round"
      fill="none"
    />
    <circle cx={260} cy={96} r={16} fill={brand.accent} />
  </svg>
);
