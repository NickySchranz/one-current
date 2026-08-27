/* Prove every beat reference in the compositions resolves before rendering.
   A stale reference is otherwise only discovered as a caption landing on the
   wrong moment — or a clip that renders a single frame.
   Usage:  node promo/scripts/check-beats.mjs */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const promoDir = dirname(dirname(fileURLToPath(import.meta.url)));
const { videos } = await import(join(promoDir, "src", "videos.ts"));

let bad = 0;
for (const def of videos) {
  const total =
    (def.introFrames ?? 66) +
    def.clips.reduce((n, c) => n + (c.to - c.from), 0) +
    (def.outroFrames ?? 100);
  const parts = def.clips.map((c) => {
    const span = c.to - c.from;
    const cues = c.cues ?? [];
    const late = cues.filter((q) => q.at >= span);
    if (span <= 0) bad++;
    if (late.length) bad++;
    return (
      `${c.src} ${c.from}→${c.to} (${span}f, ${cues.length} cues` +
      (late.length ? `, ${late.length} PAST THE END` : "") +
      (span <= 0 ? ", EMPTY" : "") +
      ")"
    );
  });
  console.log(`${def.id.padEnd(34)} ${String(total).padStart(5)}f ${(total / 30).toFixed(1)}s`);
  for (const p of parts) console.log(`    ${p}`);
}
console.log(bad ? `\n${bad} problem(s)` : "\nall beat references resolve, all cues land inside their clip");
process.exit(bad ? 1 : 0);
