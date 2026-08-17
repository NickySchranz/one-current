/* Render every registered composition to public/about/video/ as MP4 plus a
   JPEG poster taken from inside the video. Run from promo/:  npm run render-all
   Optionally pass composition ids to render a subset. */
import { execFileSync } from "node:child_process";
import { mkdirSync, statSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const promoDir = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(promoDir, "..", "public", "about", "video");
mkdirSync(outDir, { recursive: true });

const env = {
  ...process.env,
  LD_LIBRARY_PATH: `${process.env.HOME}/.cache/one-current-chromium-libs/usr/lib/x86_64-linux-gnu`,
};
const run = (args) =>
  execFileSync("npx", args, { cwd: promoDir, env, stdio: ["ignore", "pipe", "inherit"] })
    .toString();

const only = process.argv.slice(2);
// videos.ts is plain data with type-only imports, so strip-types can load it
const { videos } = await import(
  join(promoDir, "src", "videos.ts")
);
const duration = (def) =>
  (def.introFrames ?? 66) +
  def.clips.reduce((n, c) => n + (c.to - c.from), 0) +
  (def.outroFrames ?? 100);

for (const def of videos) {
  if (only.length && !only.includes(def.id)) continue;
  const frames = duration(def);
  const mp4 = join(outDir, `${def.id}.mp4`);
  const jpg = join(outDir, `${def.id}.jpg`);
  console.log(`render ${def.id} (${(frames / 30).toFixed(1)}s)…`);
  run(["remotion", "render", def.id, mp4]);
  const poster = Math.round(frames * 0.42);
  run(["remotion", "still", def.id, jpg, `--frame=${poster}`, "--jpeg-quality=82"]);
  const mb = (n) => (statSync(n).size / 1e6).toFixed(2) + "MB";
  console.log(`  ${def.id}: ${mb(mp4)} + poster ${mb(jpg)}`);
}

const total = readdirSync(outDir)
  .map((f) => statSync(join(outDir, f)).size)
  .reduce((a, b) => a + b, 0);
console.log(`total public/about/video: ${(total / 1e6).toFixed(1)}MB${total > 60e6 ? "  ⚠ over 60MB budget" : ""}`);
