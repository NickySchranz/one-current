/* Render the poster/social set to public/about/social/. The print variant
   renders at --scale 2.83 (A3 @ ~300dpi). Usage:
     node promo/scripts/render-posters.mjs [ids…]   # default: all */
import { execFileSync } from "node:child_process";
import { mkdirSync, statSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const promoDir = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(promoDir, "..", "public", "about", "social");
mkdirSync(outDir, { recursive: true });

const env = {
  ...process.env,
  LD_LIBRARY_PATH: `${process.env.HOME}/.cache/one-current-chromium-libs/usr/lib/x86_64-linux-gnu`,
};
const run = (args) => execFileSync("npx", args, { cwd: promoDir, env, stdio: ["ignore", "pipe", "inherit"] });

const { posters } = await import(join(promoDir, "src", "posters.ts"));
const only = process.argv.slice(2);

for (const def of posters) {
  if (only.length && !only.includes(def.id)) continue;
  const isPrint = def.id.endsWith("-print");
  const out = join(outDir, `${def.id}.png`);
  const args = ["remotion", "still", def.id, out];
  if (isPrint) args.push("--scale=2.83");
  run(args);
  console.log(`${def.id}: ${(statSync(out).size / 1e6).toFixed(2)}MB`);
}
const total = readdirSync(outDir).reduce((a, f) => a + statSync(join(outDir, f)).size, 0);
console.log(`total public/about/social: ${(total / 1e6).toFixed(1)}MB`);
