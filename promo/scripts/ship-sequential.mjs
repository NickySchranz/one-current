/* Render each video and publish it the moment it is encoded, rather than
   holding everything back until the whole set is done. Per video:
   render MP4 → still a poster frame → commit both → push.
   The films (00-flagship, 00-why-it-works) are compositions too, so they are
   rendered here alongside the shorts.
   Usage:  node promo/scripts/ship-sequential.mjs [id …] */
import { execFileSync } from "node:child_process";
import { statSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const promoDir = dirname(dirname(fileURLToPath(import.meta.url)));
const repoDir = join(promoDir, "..");
const outDir = join(repoDir, "public", "about", "video");
mkdirSync(outDir, { recursive: true });

const env = {
  ...process.env,
  LD_LIBRARY_PATH: `${process.env.HOME}/.cache/one-current-chromium-libs/usr/lib/x86_64-linux-gnu`,
};
const remotion = (args) =>
  execFileSync("npx", args, { cwd: promoDir, env, stdio: ["ignore", "pipe", "inherit"] });
const git = (args) => execFileSync("git", args, { cwd: repoDir, stdio: "inherit" });

const { videos } = await import(join(promoDir, "src", "videos.ts"));
const duration = (def) =>
  (def.introFrames ?? 66) +
  def.clips.reduce((n, c) => n + (c.to - c.from), 0) +
  (def.outroFrames ?? 100);

// the two films are their own compositions, with fixed lengths
const FILMS = [
  { id: "00-flagship", frames: 1800 },
  { id: "00-why-it-works", frames: 1470 },
];
const all = [...FILMS, ...videos.map((d) => ({ id: d.id, frames: duration(d) }))];

const only = process.argv.slice(2);
const mb = (n) => (statSync(n).size / 1e6).toFixed(2) + "MB";

for (const { id, frames } of all) {
  if (only.length && !only.includes(id)) continue;
  const mp4 = join(outDir, `${id}.mp4`);
  const jpg = join(outDir, `${id}.jpg`);
  console.log(`\n=== ${id} (${(frames / 30).toFixed(1)}s) ===`);
  try {
    remotion(["remotion", "render", id, mp4]);
    remotion(["remotion", "still", id, jpg, `--frame=${Math.round(frames * 0.42)}`, "--jpeg-quality=82"]);
    console.log(`  encoded: ${mb(mp4)} + poster ${mb(jpg)}`);
  } catch (e) {
    console.error(`  ${id} FAILED to render — leaving the published copy alone`);
    process.exitCode = 1;
    continue;
  }
  // publish this one straight away; the next render starts after the push
  git(["add", `public/about/video/${id}.mp4`, `public/about/video/${id}.jpg`]);
  git(["commit", "-q", "-m", `Re-cut ${id} against the current app`]);
  git(["push", "-q", "origin", "main"]);
  console.log(`  published ${id}`);
}
console.log("\nsequential ship done");
