#!/usr/bin/env node
// Assembles dist-landing/ — the static landing site for https://onecurrentapp.com,
// deployed to Cloudflare Pages. Ships ONLY the static pages under public/about/
// plus the root legal pages and icons. The Vite app in src/ is a stale pre-port
// shell and must never reach this domain; neither may any manifest.webmanifest
// (nothing on the landing is installable — the installable app lives at
// https://app.onecurrentapp.com).
//
// Layout produced:
//   /index.html, /index.es.html   — about/index*.html promoted to the root,
//                                   with about/-relative paths rewritten
//   /about/…                      — the full about/ tree (deep links exist)
//   /icons/…                      — favicons and touch icons
//   /privacy.html, /privacy.es.html, /terms.html
//   /_redirects                   — legacy GitHub Pages paths

import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const pub = join(root, "public");
const out = join(root, "dist-landing");

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

// 1. The whole about/ tree, verbatim — its pages already use about/-relative
//    asset paths and ../ for the root (icons, privacy, terms).
cpSync(join(pub, "about"), join(out, "about"), { recursive: true });

// 2. Icons and the root legal pages.
cpSync(join(pub, "icons"), join(out, "icons"), { recursive: true });
for (const f of ["privacy.html", "privacy.es.html", "terms.html"]) {
  cpSync(join(pub, f), join(out, f));
}

// 3. Promote the landing page (both languages) to the site root, rewriting the
//    paths that were relative to about/:
//      ../x            -> x                (icons, privacy.html, terms.html)
//      img/…           -> about/img/…      (and any other about/ asset dir)
//      research.html … -> about/research.html …
//    index.html <-> index.es.html links stay as they are: both copies live at
//    the root, so the EN/ES toggle keeps working.
const assetDirs = ["img", "video", "social", "study"];
const aboutPages = ["research.html", "research.es.html", "design-study.html", "media.html", "campaigns.js"];
function promote(name) {
  let html = readFileSync(join(pub, "about", name), "utf8");
  html = html.replaceAll('href="../', 'href="');
  for (const d of assetDirs) {
    html = html.replaceAll(`src="${d}/`, `src="about/${d}/`);
    html = html.replaceAll(`content="${d}/`, `content="about/${d}/`);
    html = html.replaceAll(`poster="${d}/`, `poster="about/${d}/`);
  }
  for (const p of aboutPages) {
    html = html.replaceAll(`href="${p}`, `href="about/${p}`);
    html = html.replaceAll(`src="${p}`, `src="about/${p}`);
  }
  writeFileSync(join(out, name), html);
}
promote("index.html");
promote("index.es.html");

// 4. Redirects for legacy GitHub Pages URLs (nickyschranz.github.io/one-current/…
//    carried the /one-current/ prefix; on this domain the same paths live at /).
writeFileSync(
  join(out, "_redirects"),
  ["/one-current / 301", "/one-current/* /:splat 301", ""].join("\n"),
);

// 5. Safety checks: nothing installable, nothing still pointing at the old host.
const problems = [];
function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) {
      walk(p);
      continue;
    }
    if (entry === "manifest.webmanifest") problems.push(`manifest shipped: ${p}`);
    if (/\.(html|js|css|webmanifest|json|txt)$/.test(entry)) {
      const text = readFileSync(p, "utf8");
      if (text.includes('rel="manifest"')) problems.push(`manifest link tag in ${p}`);
      if (text.includes("nickyschranz.github.io")) problems.push(`stale github.io URL in ${p}`);
    }
  }
}
walk(out);
if (problems.length) {
  console.error("build-landing: refusing to ship:\n  " + problems.join("\n  "));
  process.exit(1);
}

console.log(`build-landing: dist-landing assembled at ${out}`);
