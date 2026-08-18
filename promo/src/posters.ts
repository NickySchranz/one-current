import type { PosterDef } from "./PosterComp";

/* Poster/social graphic definitions. Formats: 45 = IG feed 1080x1350,
   story = 1080x1920, sq = 1080x1080, print = A3 ratio (render --scale 2.83
   for 300dpi). Stills come from one-current-app/scripts/promo-stills.mjs. */

const F = {
  "45": { w: 1080, h: 1350 },
  story: { w: 1080, h: 1920 },
  sq: { w: 1080, h: 1080 },
  print: { w: 1240, h: 1754 },
} as const;

type Concept = Omit<PosterDef, "id" | "w" | "h"> & { key: string; formats: (keyof typeof F)[] };

const concepts: Concept[] = [
  {
    key: "p01-hero",
    formats: ["45", "story", "sq", "print"],
    mood: "river",
    layout: "device",
    still: "still-hero.png",
    headline: "Your mind is one current.",
    sub: "A quiet map of everything pulling at you.",
  },
  {
    key: "p02-louder",
    formats: ["45", "story"],
    mood: "night",
    layout: "device",
    still: "still-loud.png",
    headline: "Ignored threads get louder.",
    sub: "Every undecided day adds a little weight.",
  },
  {
    key: "p03-integrate",
    formats: ["45", "story"],
    mood: "river",
    layout: "device",
    still: "still-reclaim.png",
    headline: "Get yourself back.",
    sub: "Resolved threads fold back into your line — and what they held comes home.",
  },
  {
    key: "p04-themes",
    formats: ["45", "story"],
    mood: "dusk",
    layout: "grid",
    stills: [
      "still-theme-demonfire.png",
      "still-theme-koipond.png",
      "still-theme-carnival.png",
      "still-theme-catnap.png",
      "still-theme-abyss.png",
      "still-theme-gravemist.png",
    ],
    kicker: "One Current Pro",
    headline: "Every open thread becomes a creature.",
  },
  {
    key: "p05-pip",
    formats: ["45", "story"],
    mood: "warm",
    layout: "device",
    still: "still-pip.png",
    kicker: "Meet Pip",
    headline: "A companion on your timeline.",
    sub: "He keeps watch over your threads.",
  },
  {
    key: "p06-privacy",
    formats: ["45", "story", "sq"],
    mood: "river",
    layout: "quote",
    kicker: "One Current",
    headline: "Nothing is sent anywhere.",
    sub: "Your threads live on your device. No feed. No tracking. Just your current.",
  },
  {
    key: "p07-split",
    formats: ["sq", "story"],
    mood: "river",
    layout: "quote",
    headline: "“That is the split — not you.”",
    sub: "One Current shows how much of you moves with your main line — and the one decision that would gather you most.",
  },
  {
    key: "p08-action",
    formats: ["sq", "story"],
    mood: "warm",
    layout: "quote",
    headline: "“An action counts. So does deciding that nothing can be done.”",
    sub: "Every thread needs a decision, not a solution.",
  },
  {
    key: "p09-practice",
    formats: ["45", "story"],
    mood: "river",
    layout: "split",
    deviceKind: "browser",
    still: "still-practice.png",
    kicker: "For therapists",
    headline: "The real picture, on one timeline.",
    bullets: [
      "A shared window, drawn like the client lived it",
      "Only what the client chose to share",
      "Session notes stay on your device",
    ],
  },
  {
    key: "p10-pro",
    formats: ["45", "story"],
    mood: "dusk",
    layout: "split",
    deviceKind: "phone",
    still: "still-share.png",
    kicker: "One Current Pro",
    headline: "Carry as many threads as your days do.",
    badge: "€6/month",
    bullets: [
      "Unlimited open threads",
      "Share with your psychologist",
      "Seven living creature themes",
    ],
  },
];

export const posters: PosterDef[] = concepts.flatMap((c) =>
  c.formats.map((f) => {
    const { key, formats, ...rest } = c;
    return { id: `${key}-${f}`, ...F[f], ...rest };
  }),
);
