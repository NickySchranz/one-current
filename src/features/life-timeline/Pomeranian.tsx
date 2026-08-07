/**
 * A pomeranian pup for the Pompom theme: each open thread ends in one sitting
 * at Now, looking straight at you. Classic orange-brown coat with a little
 * white blaze on the forehead, white chest, white paws and a white tail tip;
 * only its collar wears the thread's colour, so every pup stays recognizably
 * its thread.
 *
 * The pup carries the thread's mood. Quiet: a happy blep, blushing cheeks,
 * a wagging tail and, every few seconds, a little hop of joy — each pup on
 * its own clock, so a happy pack pops one at a time. Middling: alert, mouth
 * just open. Loud (4–5): a proper
 * pomeranian tantrum — ears pinned back, angry brows, jaw open mid-bark with
 * tiny teeth, and bark marks snapping at both sides. Any honest decision
 * calms it back into a plain circle.
 *
 * Drawn sitting front-on, roughly 16×15 units before scaling. The fluff is
 * built from scalloped rings so the coat reads as fur, not a circle.
 */

import { useRef } from "react";

const FUR = "#dd8f4a";
const FUR_DEEP = "#c1712f";
const WHITE = "#fdf8ef";
const EAR_INNER = "#e8a3b0";
const EYE_DARK = "#2b2118";
const NOSE = "#241d18";
const MOUTH_DARK = "#4a2b25";
const TONGUE = "#ec8b86";
const TONGUE_LINE = "#d16a66";
const BROW = "#4a352a";
const BARK_MARK = "#b3572f";

/** A scalloped circle: soft tufts bulging outward — the pup's fur. */
function fluffRing(
  cx: number,
  cy: number,
  r: number,
  amp: number,
  tufts: number,
  phase = 0,
): string {
  const pt = (angle: number, radius: number) =>
    `${(cx + Math.cos(angle) * radius).toFixed(2)} ${(cy + Math.sin(angle) * radius).toFixed(2)}`;
  let d = `M ${pt(phase, r)}`;
  for (let i = 1; i <= tufts; i++) {
    const a = phase + (i / tufts) * Math.PI * 2;
    const mid = phase + ((i - 0.5) / tufts) * Math.PI * 2;
    d += ` Q ${pt(mid, r + amp * 2)} ${pt(a, r)}`;
  }
  return d + " Z";
}

const TAIL = fluffRing(4.7, -1.1, 2.1, 0.5, 8, 0.4);
const TAIL_TIP = fluffRing(5.7, -2.2, 1.05, 0.32, 6, 0.9);
const BODY = fluffRing(0, 2.7, 3.9, 0.55, 10, 0.15);
const CHEST = fluffRing(0, 3.1, 2.3, 0.4, 8, 0.5);
const RUFF = fluffRing(0, -3.2, 4.3, 0.65, 11, 0.2);
const HEAD = fluffRing(0, -3.2, 3.55, 0.5, 9, 0.55);

// white blaze: a soft little stripe from the topknot down to between the eyes
const BLAZE =
  "M -0.55 -6.7 Q 0 -7.05 0.55 -6.7 C 0.65 -5.8 0.5 -4.7 0.38 -4.05" +
  " Q 0 -3.7 -0.38 -4.05 C -0.5 -4.7 -0.65 -5.8 -0.55 -6.7 Z";

// ears: outer triangles with a pink inner, hinged where they meet the ruff
const EAR_L = "M -1.9 -5.5 L -3.3 -8.3 L -4.5 -5.8 Z";
const EAR_L_IN = "M -2.5 -5.9 L -3.3 -7.5 L -3.9 -6.0 Z";
const EAR_R = "M 1.9 -5.5 L 3.3 -8.3 L 4.5 -5.8 Z";
const EAR_R_IN = "M 2.5 -5.9 L 3.3 -7.5 L 3.9 -6.0 Z";

const NOSE_PATH =
  "M -0.55 -2.55 Q 0 -2.9 0.55 -2.55 Q 0.62 -2.15 0 -1.8 Q -0.62 -2.15 -0.55 -2.55 Z";

const SMILE =
  "M 0 -1.8 L 0 -1.5 M 0 -1.5 Q -0.5 -0.9 -1.05 -1.5 M 0 -1.5 Q 0.5 -0.9 1.05 -1.5";

// the collar: a curved band across the chest, wearing the thread's colour
const COLLAR = "M -2.9 0.9 Q 0 2.3 2.9 0.9 L 2.75 1.75 Q 0 3.1 -2.75 1.75 Z";

// bark marks: two nested arcs snapping outward on each side of the head
const BARK_L1 = "M -5.1 -4.4 Q -6.0 -3.2 -5.1 -2.0";
const BARK_L2 = "M -6.1 -5.0 Q -7.4 -3.2 -6.1 -1.4";
const BARK_R1 = "M 5.1 -4.4 Q 6.0 -3.2 5.1 -2.0";
const BARK_R2 = "M 6.1 -5.0 Q 7.4 -3.2 6.1 -1.4";

type Props = {
  x: number;
  y: number;
  scale?: number;
  /** The thread's line colour: the pup's collar. */
  color: string;
  /** Effective loudness 1–5: happy blep → alert → full barking tantrum. */
  loudness?: number;
  /** Comfort setting: the pup holds still — no wag, no yap. */
  reducedMotion?: boolean;
  onClick?: (e: React.MouseEvent) => void;
};

export function Pomeranian({
  x,
  y,
  scale = 1,
  color,
  loudness = 3,
  reducedMotion = false,
  onClick,
}: Props) {
  const g = Math.max(1, Math.min(5, loudness));
  const happy = g < 2.5;
  const barking = g >= 4;
  const earPin = Math.max(0, g - 2) * 7; // ears fold outward as it gets louder
  const eyeRy = barking ? 0.75 : 0.95;
  const mood = !reducedMotion && barking ? " is-barking" : !reducedMotion && happy ? " is-happy" : "";
  // a stable random phase per pup: happy hops land one at a time, not in chorus
  const hopDelay = useRef(`${(-Math.random() * 5.2).toFixed(2)}s`);

  return (
    <g
      className={`branch-endpoint pom-pup${mood}`}
      transform={`translate(${x - 4}, ${y - 2}) scale(${(scale * 0.85).toFixed(3)})`}
      onClick={onClick}
    >
      {/* generous invisible hit area — ears, tail and bark marks are thin */}
      <circle cx={0} cy={-0.5} r={9.5} fill="transparent" stroke="none" />

      <g className="pom-whole" style={{ animationDelay: hopDelay.current }}>

      {/* tail: a plume over the back, white at the tip; it wags when happy */}
      <g className="pom-tail" pointerEvents="none">
        <path d={TAIL} fill={FUR_DEEP} />
        <path d={TAIL_TIP} fill={WHITE} opacity={0.92} />
      </g>

      {/* seated fluff-ball body with a white chest */}
      <path d={BODY} fill={FUR} pointerEvents="none" />
      <path d={CHEST} fill={WHITE} opacity={0.88} pointerEvents="none" />

      {/* little white front paws with toe marks */}
      <g pointerEvents="none">
        <ellipse cx={-1.7} cy={6.15} rx={1.15} ry={0.85} fill={WHITE} />
        <ellipse cx={1.7} cy={6.15} rx={1.15} ry={0.85} fill={WHITE} />
        <path
          d="M -1.95 5.6 L -1.95 6.6 M -1.35 5.65 L -1.35 6.65 M 1.35 5.65 L 1.35 6.65 M 1.95 5.6 L 1.95 6.6"
          stroke={FUR_DEEP}
          strokeWidth={0.18}
          strokeLinecap="round"
          opacity={0.4}
          fill="none"
        />
      </g>

      {/* the collar keeps the thread's colour, with a little tag */}
      <g pointerEvents="none">
        <path d={COLLAR} fill={color} />
        <circle cx={0} cy={2.5} r={0.52} fill="#eec96d" stroke="#a8843a" strokeWidth={0.14} />
      </g>

      {/* the head: yaps forward when barking */}
      <g className="pom-head" pointerEvents="none">
        {/* ears pin back the louder the thread gets */}
        <g transform={`rotate(${-earPin} -3.2 -5.7)`}>
          <path d={EAR_L} fill={FUR_DEEP} />
          <path d={EAR_L_IN} fill={EAR_INNER} opacity={0.85} />
        </g>
        <g transform={`rotate(${earPin} 3.2 -5.7)`}>
          <path d={EAR_R} fill={FUR_DEEP} />
          <path d={EAR_R_IN} fill={EAR_INNER} opacity={0.85} />
        </g>

        {/* two fluff layers so the coat reads as fur */}
        <path d={RUFF} fill={FUR_DEEP} />
        <path d={HEAD} fill={FUR} />

        {/* the little white blaze on the forehead */}
        <path d={BLAZE} fill={WHITE} opacity={0.92} />

        {/* white muzzle */}
        <ellipse cx={0} cy={-1.9} rx={1.85} ry={1.5} fill={WHITE} opacity={0.9} />

        {/* button eyes, each with a double sparkle; they narrow when barking */}
        <ellipse cx={-1.75} cy={-3.3} rx={0.95} ry={eyeRy} fill={EYE_DARK} />
        <ellipse cx={1.75} cy={-3.3} rx={0.95} ry={eyeRy} fill={EYE_DARK} />
        <circle cx={-2.05} cy={-3.6} r={0.3} fill="#fff" opacity={0.95} />
        <circle cx={1.45} cy={-3.6} r={0.3} fill="#fff" opacity={0.95} />
        <circle cx={-1.5} cy={-3.05} r={0.14} fill="#fff" opacity={0.7} />
        <circle cx={2} cy={-3.05} r={0.14} fill="#fff" opacity={0.7} />

        {/* angry brows arrive with the bark */}
        {g >= 3.5 && (
          <g
            stroke={BROW}
            strokeWidth={0.45}
            strokeLinecap="round"
            opacity={Math.min(1, (g - 3.5) / 1.2 + 0.4)}
          >
            <path d="M -2.6 -4.75 L -0.95 -4.15" fill="none" />
            <path d="M 2.6 -4.75 L 0.95 -4.15" fill="none" />
          </g>
        )}

        <path d={NOSE_PATH} fill={NOSE} />

        {/* the mouth carries the mood: blep, alert, or mid-bark */}
        {happy ? (
          <g>
            <path d={SMILE} fill="none" stroke={NOSE} strokeWidth={0.26} opacity={0.65} />
            <ellipse cx={0} cy={-0.78} rx={0.5} ry={0.62} fill={TONGUE} />
            <path d="M 0 -1.1 L 0 -0.45" stroke={TONGUE_LINE} strokeWidth={0.16} opacity={0.7} />
            <ellipse cx={-2.7} cy={-2.2} rx={0.75} ry={0.45} fill={TONGUE} opacity={0.35} />
            <ellipse cx={2.7} cy={-2.2} rx={0.75} ry={0.45} fill={TONGUE} opacity={0.35} />
          </g>
        ) : barking ? (
          <g>
            <ellipse cx={0} cy={-1.05} rx={1.05} ry={0.95} fill={MOUTH_DARK} />
            <path d="M -0.55 -1.85 L -0.3 -1.35 L -0.05 -1.85 Z" fill="#fff" opacity={0.95} />
            <path d="M 0.05 -1.85 L 0.3 -1.35 L 0.55 -1.85 Z" fill="#fff" opacity={0.95} />
            <ellipse cx={0} cy={-0.5} rx={0.58} ry={0.45} fill={TONGUE} />
          </g>
        ) : (
          <g>
            <ellipse cx={0} cy={-1.1} rx={0.62} ry={0.5} fill={MOUTH_DARK} />
            <ellipse cx={0} cy={-0.85} rx={0.36} ry={0.26} fill={TONGUE} />
          </g>
        )}
      </g>

      {/* bark marks snap at both sides while the pup is loud */}
      {barking && (
        <g
          className="pom-bark"
          stroke={BARK_MARK}
          strokeWidth={0.5}
          strokeLinecap="round"
          fill="none"
          opacity={0.85}
          pointerEvents="none"
        >
          <path d={BARK_L1} />
          <path d={BARK_L2} opacity={0.65} />
          <path d={BARK_R1} />
          <path d={BARK_R2} opacity={0.65} />
        </g>
      )}

      </g>
    </g>
  );
}
