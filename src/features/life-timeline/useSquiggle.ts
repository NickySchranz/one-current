import { useEffect, type RefObject } from "react";

// Loudness made visible: a sine wave travels along the line from the fork
// toward Now, so the stroke slithers like a snake while both ends stay
// anchored. Louder = wider, faster, tighter wavelength. The scale is the
// thread's loudness (1–5): a quiet thread (1) lies perfectly still.
const AMP = [0, 0, 1.8, 2.6, 3.4, 4.2]; // px, half-width of the wave
const SPEED = [0, 0, 0.8, 1.3, 2.1, 3.2]; // wave cycles per second
const LAMBDA = [56, 56, 56, 48, 40, 34]; // px of line per wave cycle (stays long while the wave fades in)
const TAPER = 18; // px over which the wave fades to zero at both ends
const STEP = 6; // sampling resolution along the path

/** Linear blend between neighbouring table entries for fractional levels. */
function lerpTable(table: number[], level: number): number {
  const clamped = Math.max(0, Math.min(table.length - 1, level));
  const lo = Math.floor(clamped);
  const hi = Math.min(table.length - 1, lo + 1);
  return table[lo] + (table[hi] - table[lo]) * (clamped - lo);
}

/**
 * While active, resamples the source path (the invisible hit path, which
 * always carries the true geometry) and rewrites the target paths' `d` each
 * frame with a travelling sine offset. Runs outside React — no re-renders.
 */
export function useSquiggle(
  active: boolean,
  level: number,
  basePath: string,
  source: RefObject<SVGPathElement | null>,
  targets: ReadonlyArray<RefObject<SVGPathElement | null>>,
  extraDeps: ReadonlyArray<unknown> = [],
) {
  useEffect(() => {
    const src = source.current;
    const paths = targets.map((r) => r.current).filter((p): p is SVGPathElement => p !== null);
    if (!active || !src || paths.length === 0) return;
    // jsdom has no path geometry API; there the line simply stays still.
    if (typeof src.getTotalLength !== "function") return;

    const total = src.getTotalLength();
    const count = Math.max(2, Math.ceil(total / STEP) + 1);
    const pts: { x: number; y: number; s: number; nx: number; ny: number }[] = [];
    for (let i = 0; i < count; i++) {
      const s = (i / (count - 1)) * total;
      const p = src.getPointAtLength(s);
      pts.push({ x: p.x, y: p.y, s, nx: 0, ny: 0 });
    }
    // Unit normals from neighbouring samples: the wave swings perpendicular
    // to wherever the line is headed, so curves slither too.
    for (let i = 0; i < count; i++) {
      const a = pts[Math.max(0, i - 1)];
      const b = pts[Math.min(count - 1, i + 1)];
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      pts[i].nx = -(b.y - a.y) / len;
      pts[i].ny = (b.x - a.x) / len;
    }

    // Levels can be fractional (the slider moves in fine steps): blend
    // smoothly between the neighbouring table entries.
    const amp = lerpTable(AMP, level);
    const k = (2 * Math.PI) / lerpTable(LAMBDA, level);
    const omega = 2 * Math.PI * lerpTable(SPEED, level);
    let raf = 0;
    const start = performance.now();
    const frame = (now: number) => {
      const t = (now - start) / 1000;
      let d = "";
      for (const p of pts) {
        const taper = Math.min(1, p.s / TAPER, (total - p.s) / TAPER);
        const off = amp * taper * Math.sin(k * p.s - omega * t);
        d += `${d ? "L" : "M"}${(p.x + p.nx * off).toFixed(2)} ${(p.y + p.ny * off).toFixed(2)}`;
      }
      for (const el of paths) el.setAttribute("d", d);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      // Restore the *current* geometry, not this closure's: a decision can
      // move the lane and stop the slither in the same render, and cleanup
      // runs after React has already committed the new `d`. The hit path is
      // never rewritten, so it always carries the truth.
      const d = src.getAttribute("d") ?? basePath;
      for (const el of paths) el.setAttribute("d", d);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, level, basePath, ...extraDeps]);
}
