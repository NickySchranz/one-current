/* Render videos one at a time and deploy each to the landing page as soon as
   it's encoded: render MP4 + poster → reveal the video's card in
   public/about/index.html (CARD:<id> comment wrappers) → commit → push.
   Usage: node promo/scripts/ship.mjs [id …]   (default: every composition) */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const promoDir = dirname(dirname(fileURLToPath(import.meta.url)));
const repoDir = join(promoDir, "..");
const htmlPath = join(repoDir, "public", "about", "index.html");

const { videos } = await import(join(promoDir, "src", "videos.ts"));
const only = process.argv.slice(2);
const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, stdio: "inherit" });

for (const def of videos) {
  if (only.length && !only.includes(def.id)) continue;
  console.log(`\n=== ship ${def.id} ===`);
  run("node", ["scripts/render-all.mjs", def.id], promoDir);

  // reveal the card if it's still wrapped in comment markers
  const html = readFileSync(htmlPath, "utf8");
  const revealed = html
    .replace(new RegExp(`[ \\t]*<!-- CARD:${def.id}\\n`), "")
    .replace(new RegExp(`[ \\t]*CARD-END:${def.id} -->\\n`), "");
  if (revealed !== html) {
    writeFileSync(htmlPath, revealed);
    console.log(`revealed card ${def.id}`);
  }

  run("git", ["add", "public/about/index.html", `public/about/video/${def.id}.mp4`, `public/about/video/${def.id}.jpg`], repoDir);
  try {
    run("git", ["commit", "-q", "-m", `Promo video: ${def.id}`, "-m", "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"], repoDir);
    run("git", ["push", "-q", "origin", "main"], repoDir);
    console.log(`pushed ${def.id}`);
  } catch {
    console.log(`nothing to push for ${def.id}`);
  }
}
console.log("\nall requested videos shipped");
