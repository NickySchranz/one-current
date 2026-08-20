import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { brand } from "../brand";

/* Official-style store badges, drawn as SVG so no image assets are needed.
   Black badge, thin light border, white text — mood-independent by design. */

const RADIUS = 7;
const BORDER = "#a6a6a6";

const BadgeShell: React.FC<{
  height: number;
  aspect: number; // width / height
  children: React.ReactNode;
  viewW: number;
}> = ({ height, aspect, children, viewW }) => (
  <svg
    width={height * aspect}
    height={height}
    viewBox={`0 0 ${viewW} 40`}
    style={{ display: "block" }}
  >
    <rect x={0.5} y={0.5} width={viewW - 1} height={39} rx={RADIUS} fill="#000" stroke={BORDER} strokeWidth={1} />
    {children}
  </svg>
);

/* Apple logo silhouette (Font Awesome brand glyph, viewBox 0 0 384 512). */
const APPLE_PATH =
  "M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.7-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z";

export const AppStoreBadge: React.FC<{ height?: number }> = ({ height = 64 }) => (
  <BadgeShell height={height} aspect={3} viewW={120}>
    <g transform="translate(10 7.2) scale(0.052)">
      <path d={APPLE_PATH} fill="#fff" />
    </g>
    <text
      x={34}
      y={16.5}
      fill="#fff"
      fontSize={8.2}
      fontFamily={brand.fontStack}
      fontWeight={500}
    >
      Download on the
    </text>
    <text
      x={33.5}
      y={31.5}
      fill="#fff"
      fontSize={15.5}
      fontFamily={brand.fontStack}
      fontWeight={600}
      letterSpacing={-0.3}
    >
      App Store
    </text>
  </BadgeShell>
);

export const GooglePlayBadge: React.FC<{ height?: number }> = ({ height = 64 }) => (
  <BadgeShell height={height} aspect={3.35} viewW={134}>
    <defs>
      <linearGradient id="gp-blue" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#00a0ff" />
        <stop offset="1" stopColor="#00e3ff" />
      </linearGradient>
      <linearGradient id="gp-yellow" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#ffe000" />
        <stop offset="1" stopColor="#ffbc00" />
      </linearGradient>
      <linearGradient id="gp-red" x1="1" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ff3a44" />
        <stop offset="1" stopColor="#c31162" />
      </linearGradient>
      <linearGradient id="gp-green" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0" stopColor="#32a071" />
        <stop offset="1" stopColor="#00f076" />
      </linearGradient>
    </defs>
    {/* Play arrow, four facets */}
    <g transform="translate(9 8)">
      {/* left opening wedge */}
      <path d="M 0 0.9 C 0 0.4 0.3 0 0.8 0 L 13.4 12 L 0.8 24 C 0.3 24 0 23.6 0 23.1 Z" fill="url(#gp-blue)" />
      {/* top facet */}
      <path d="M 0.8 0 L 17 9.2 L 13.4 12 Z" fill="url(#gp-green)" transform="skewX(0)" />
      {/* bottom facet */}
      <path d="M 0.8 24 L 17 14.8 L 13.4 12 Z" fill="url(#gp-red)" />
      {/* right tip */}
      <path d="M 13.4 12 L 17 9.2 L 21.2 11 C 22.3 11.5 22.3 12.5 21.2 13 L 17 14.8 Z" fill="url(#gp-yellow)" />
    </g>
    <text
      x={38}
      y={16.5}
      fill="#fff"
      fontSize={8.2}
      fontFamily={brand.fontStack}
      fontWeight={500}
      letterSpacing={0.6}
    >
      GET IT ON
    </text>
    <text
      x={37.5}
      y={31.5}
      fill="#fff"
      fontSize={15.5}
      fontFamily={brand.fontStack}
      fontWeight={600}
      letterSpacing={-0.3}
    >
      Google Play
    </text>
  </BadgeShell>
);

/* A row with both badges. With `appearAt` set it eases in (for video outros);
   without it, it renders statically (posters render a single frame). */
export const StoreBadgesRow: React.FC<{
  height?: number;
  appearAt?: number;
  justify?: "flex-start" | "center";
}> = ({ height = 64, appearAt, justify = "flex-start" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const animated = appearAt !== undefined;
  const pop = animated
    ? spring({ frame: frame - (appearAt ?? 0), fps, config: { damping: 200, stiffness: 90 } })
    : 1;
  const opacity = animated
    ? interpolate(frame, [appearAt ?? 0, (appearAt ?? 0) + 12], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: justify,
        gap: Math.round(height * 0.28),
        opacity,
        transform: `translateY(${(1 - pop) * 22}px)`,
      }}
    >
      <AppStoreBadge height={height} />
      <GooglePlayBadge height={height} />
    </div>
  );
};
