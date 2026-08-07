/**
 * A Chinese dragon head (lóng) for the Demonfire theme: each open thread ends
 * in one, facing Now — the demon you are facing. Dignified, not gruesome: a
 * long upturned muzzle, an open jaw with one fang, a brow over a calm eye,
 * antlers sweeping back with a tine, a streaming mane, a sage's beard and the
 * iconic whiskers. Drawn nose-at-origin, facing +x, about 19×12 units before
 * scaling.
 */

// head silhouette: nose knob → upper lip → open mouth → curled chin → jaw →
// cheek → back of head → skull → brow bump → forehead dip → up the muzzle
const HEAD =
  "M 0.8 -1.8" +
  " C 1.7 -1.2 1.5 -0.2 0.5 0.0" +
  " C -0.9 0.3 -2.1 0.3 -3.4 0.6" +
  " L -0.6 2.4" +
  " C -0.3 3.1 -0.7 3.6 -1.5 3.5" +
  " C -2.8 3.4 -4.5 3.2 -6.0 3.0" +
  " C -7.8 2.9 -9.0 2.4 -9.5 1.3" +
  " C -10.1 0.3 -10.0 -1.0 -9.4 -1.9" +
  " C -8.8 -2.8 -7.6 -3.2 -6.4 -3.0" +
  " C -5.6 -3.2 -4.9 -3.0 -4.3 -2.6" +
  " C -3.6 -3.2 -2.7 -3.1 -2.2 -2.5" +
  " C -1.6 -2.3 -1.0 -2.2 -0.4 -2.1" +
  " C 0.0 -2.0 0.5 -2.0 0.8 -1.8" +
  " Z";

// one small fang hanging from the upper lip into the open mouth
const FANG = "M -2.7 0.5 L -2.3 1.4 L -1.8 0.4 Z";

// antlers sweeping back over the skull, the front one branching into a tine
const ANTLERS =
  "M -4.0 -2.8 C -5.0 -4.4 -6.6 -5.2 -9.0 -5.6" +
  " M -6.4 -4.9 C -6.5 -5.9 -7.1 -6.7 -8.3 -7.3" +
  " M -6.2 -3.0 C -7.4 -4.1 -9.0 -4.6 -10.8 -4.7";

// three mane strands streaming back from the head
const MANE =
  "M -8.4 -2.5 C -10.2 -3.1 -10.8 -2.3 -12.8 -2.9" +
  " M -9.2 -1.3 C -11.4 -1.7 -11.8 -0.7 -14.0 -1.1" +
  " M -9.6 0.7 C -11.6 0.7 -12.2 1.7 -14.2 1.7";

// a sage's beard swept back under the chin
const BEARD = "M -2.4 3.3 C -3.0 4.3 -4.2 4.7 -5.8 4.6";

// whiskers flowing forward from the nose — the lóng's signature
const WHISKERS =
  "M 0.9 -0.5 C 2.8 -0.4 3.9 -0.8 4.9 -2.0" +
  " M 0.5 0.1 C 2.5 0.5 3.7 0.4 5.1 -0.4";

type Props = {
  x: number;
  y: number;
  scale?: number;
  color: string;
  onClick?: (e: React.MouseEvent) => void;
};

export function DragonHead({ x, y, scale = 1, color, onClick }: Props) {
  return (
    <g
      className="branch-endpoint dragon-head"
      transform={`translate(${x}, ${y}) scale(${scale})`}
      onClick={onClick}
    >
      {/* generous invisible hit area — antlers and whiskers are thin */}
      <circle cx={-4.5} cy={0} r={9} fill="transparent" stroke="none" />
      <path d={HEAD} fill={color} stroke="none" />
      <path d={FANG} fill={color} stroke="none" pointerEvents="none" />
      <path
        d={ANTLERS}
        fill="none"
        stroke={color}
        strokeWidth={0.85}
        strokeLinecap="round"
        pointerEvents="none"
      />
      <path
        d={MANE}
        fill="none"
        stroke={color}
        strokeWidth={0.75}
        strokeLinecap="round"
        opacity={0.9}
        pointerEvents="none"
      />
      <path
        d={BEARD}
        fill="none"
        stroke={color}
        strokeWidth={0.65}
        strokeLinecap="round"
        opacity={0.9}
        pointerEvents="none"
      />
      <path
        d={WHISKERS}
        fill="none"
        stroke={color}
        strokeWidth={0.5}
        strokeLinecap="round"
        opacity={0.9}
        pointerEvents="none"
      />
      {/* one calm eye under the brow, and a nostril on the nose knob */}
      <circle cx={-2.9} cy={-1.3} r={0.8} fill="var(--bg)" />
      <circle cx={-2.65} cy={-1.3} r={0.33} fill={color} />
      <circle cx={0.55} cy={-1.0} r={0.25} fill="var(--bg)" />
    </g>
  );
}
