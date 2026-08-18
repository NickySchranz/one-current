# One Current — promo studio

Ten vertical (1080×1920, 30fps, silent) promo videos for the about page,
built from real app footage.

## Pipeline

1. **Footage** — `one-current-app/scripts/promo-footage.mjs` drives the local
   `dist/` builds of both apps headlessly and records deterministic 30fps
   VP8 webm clips plus `*.beats.json` (frame-stamped beat labels) into
   `promo/public/footage/` (gitignored). It virtualizes the page clock and
   steps it one frame per screenshot, so animations are smooth and re-runs
   are reproducible. Scene 09 signs into the live API and creates a real
   share code; scene 10 redeems it (one-time use — re-run 09 before 10).
2. **Compositions** — `src/videos.ts` defines the 10 videos (intro card,
   footage clips with caption cues picked from the beats files, end card).
   Preview with `npm run studio`.
3. **Render** — `npm run render-all` renders every composition to
   `../public/about/video/<id>.mp4` plus a JPEG poster. H.264 CRF 24, muted.
4. **Publish** — commit `public/about/video/` + the `#motion` section of
   `public/about/index.html`, push `main`; GitHub Actions deploys Pages.

From the repo root, `npm run promo` runs capture + render end to end.

## Posters & social graphics

`one-current-app/scripts/promo-stills.mjs` captures hi-res app stills (phone at
3x, print-grade) into `promo/public/stills/` (gitignored). `src/posters.ts`
defines the poster set (IG 4:5 / story / square + one A3 print hero) rendered by
`node promo/scripts/render-posters.mjs [ids…]` into `public/about/social/`.
Browse everything on the unlisted gallery `about/media.html`.

The 60-second flagship cut is `src/Flagship.tsx` (composition id `00-flagship`),
rendered directly: `npx remotion render 00-flagship ../public/about/video/00-flagship.mp4`.

## Notes

- The renderer reuses the Playwright Chromium at
  `~/.cache/ms-playwright/chromium-1234` with extracted system libraries in
  `~/.cache/one-current-chromium-libs` (this box has no root; see
  `remotion.config.ts` and `render-all.mjs`).
- Remotion's license is free for individuals and companies of up to 3
  people; larger companies need a paid company license (remotion.dev/license).
