import type { PromoDef } from "./PromoVideo";

/* The 10 promo videos. Footage + beats come from
   one-current-app/scripts/promo-footage.mjs (webm + beats.json in
   public/footage/). Cue frames are picked from the beats files —
   re-check them after re-capturing footage. */
export const videos: PromoDef[] = [
  {
    id: "01-one-current",
    mood: "river",
    device: "phone",
    intro: {
      kicker: "One Current",
      headline: "Your mind is one current.",
      sub: "A quiet map of everything pulling at you.",
    },
    introFrames: 72,
    clips: [
      {
        src: "01-hero.webm",
        from: 0,
        to: 676,
        cues: [
          { at: 8, text: "Everything pulling at you, beside one steady line." },
          { at: 95, text: "Something lands on your mind? Name it." },
          { at: 288, text: "It becomes a thread beside Now — not noise inside your head." },
          { at: 425, text: "Ask what it needs from you today." },
          { at: 545, text: "One small step counts." },
          { at: 632, text: "The thread quiets. You keep moving." },
        ],
      },
    ],
  },
  {
    id: "02-meet-pip",
    mood: "warm",
    device: "phone",
    intro: {
      kicker: "Meet Pip",
      headline: "A companion on your timeline.",
      sub: "He keeps watch over your threads.",
    },
    clips: [
      {
        src: "02-pip.webm",
        from: 0,
        to: 502,
        cues: [
          { at: 12, text: "Pip lives in your today." },
          { at: 130, text: "He visits the threads you haven't decided on yet…" },
          { at: 285, text: "…and runs to the one you're looking at." },
          { at: 420, text: "Swap him for a Wisp or a Wanderer any time." },
        ],
      },
    ],
  },
  {
    id: "03-threads-get-louder",
    mood: "night",
    device: "phone",
    intro: {
      kicker: "One Current",
      headline: "Ignored threads get louder.",
      sub: "Watch a week pass in seconds.",
    },
    clips: [
      {
        src: "03-louder.webm",
        from: 0,
        to: 521,
        cues: [
          { at: 10, text: "Every undecided day, a thread grows a little louder." },
          { at: 140, text: "Louder threads sit further from your line — and pull harder." },
          { at: 250, text: "It doesn't need a solution. It needs a decision." },
          { at: 340, text: "One small honest step…" },
          { at: 440, text: "…and the thread quiets down." },
        ],
      },
    ],
  },
  {
    id: "04-integrate-it",
    mood: "river",
    device: "phone",
    intro: {
      kicker: "One Current",
      headline: "Integrate it. Get yourself back.",
      sub: "Resolved threads fold back into your line.",
    },
    clips: [
      {
        src: "04-merge.webm",
        from: 0,
        to: 556,
        cues: [
          { at: 8, text: "Some threads are finished — they just never ended." },
          { at: 120, text: "When one is resolved, integrate it into Now." },
          { at: 250, text: "Name what is true about it today." },
          { at: 336, text: "Nothing valuable is lost." },
          { at: 396, text: "The energy it was holding comes home to you." },
          { at: 490, text: "The line curves back. You are more whole." },
        ],
      },
    ],
  },
  {
    id: "05-creature-themes",
    mood: "dusk",
    device: "phone",
    pro: true,
    intro: {
      kicker: "One Current Pro",
      headline: "Every open thread becomes a creature.",
      sub: "Seven living themes. Decide, and they settle.",
    },
    clips: [
      { src: "05-theme-demonfire.webm", from: 0, to: 104, cues: [{ at: 8, text: "Demonfire — every thread a small dragon." }] },
      { src: "05-theme-koipond.webm", from: 0, to: 104, cues: [{ at: 6, text: "Koi pond — feed it a decision, the water stills." }] },
      { src: "05-theme-carnival.webm", from: 0, to: 104, cues: [{ at: 6, text: "Carnival — waiting balloons swell tighter." }] },
      { src: "05-theme-catnap.webm", from: 0, to: 104, cues: [{ at: 6, text: "Catnap — answer the cat, it curls up." }] },
      { src: "05-theme-abyss.webm", from: 0, to: 104, cues: [{ at: 6, text: "Abyss — the louder it grows, the brighter its lure." }] },
      { src: "05-theme-pompom.webm", from: 0, to: 104, cues: [{ at: 6, text: "Pompom — leave the pup waiting and it barks." }] },
      { src: "05-theme-gravemist.webm", from: 0, to: 104, cues: [{ at: 6, text: "Gravemist — its wail widens until you answer." }] },
    ],
    endLine: "Five calm looks are always free.",
  },
  {
    id: "06-history",
    mood: "warm",
    device: "phone",
    intro: {
      kicker: "One Current",
      headline: "Days that read like a story.",
      sub: "Every decision, quietly recorded.",
    },
    clips: [
      {
        src: "06-history.webm",
        from: 0,
        to: 426,
        cues: [
          { at: 8, text: "History keeps each day the way you lived it." },
          { at: 150, text: "Steps you decided on. Threads that came home." },
          { at: 280, text: "Everything you integrated, in one place." },
          { at: 380, text: "Reviewing it builds self-knowledge." },
        ],
      },
    ],
  },
  {
    id: "07-private-by-design",
    mood: "river",
    device: "phone",
    intro: {
      kicker: "One Current",
      headline: "Nothing is sent anywhere.",
      sub: "Your threads live on your device.",
    },
    clips: [
      {
        src: "07-privacy.webm",
        from: 0,
        to: 271,
        cues: [
          { at: 8, text: "Everything you write stays in this browser." },
          { at: 95, text: "Take a full export with you, any time." },
          { at: 180, text: "No feed. No tracking. Just your current." },
        ],
      },
    ],
    endLine: "Private by design. Free to start.",
  },
  {
    id: "08-wholeness",
    mood: "river",
    device: "phone",
    intro: {
      kicker: "One Current",
      headline: "How much of you is here today?",
      sub: "The wholeness gauge tells you honestly.",
    },
    clips: [
      {
        src: "08-wholeness.webm",
        from: 0,
        to: 525,
        cues: [
          { at: 55, text: "Tap the gauge: how much of you moves with your main line?" },
          { at: 120, text: "“That is the split — not you.”" },
          { at: 230, text: "It shows where one decision would gather you most." },
          { at: 330, text: "An action counts. So does deciding nothing can be done." },
          { at: 440, text: "Decide something small — and come back together." },
        ],
      },
    ],
  },
  {
    id: "09-share-with-your-psychologist",
    mood: "dusk",
    device: "phone",
    pro: true,
    intro: {
      kicker: "One Current Pro",
      headline: "Bring your therapist the real picture.",
      sub: "Not your data. Your chosen slice of it.",
    },
    clips: [
      {
        src: "09-share.webm",
        from: 0,
        to: 332,
        cues: [
          { at: 8, text: "Words are hard in a session. The picture helps." },
          { at: 70, text: "Pick exactly which threads to share — nothing else leaves." },
          { at: 152, text: "Pick the time window." },
          { at: 205, text: "One tap…" },
          { at: 240, text: "…one code. It works once and expires in 14 days." },
        ],
      },
    ],
    endLine: "You choose what they see. Always.",
  },
  {
    id: "10-practice",
    mood: "river",
    device: "browser",
    intro: {
      kicker: "For therapists",
      headline: "One Current — Practice.",
      sub: "Read a client's shared window the way they lived it.",
    },
    clips: [
      {
        src: "10-redeem.webm",
        from: 0,
        to: 160,
        cues: [
          { at: 6, text: "Your client hands you an 8-character code…" },
          { at: 88, text: "…and their shared window arrives. One-time use, 14 days." },
        ],
      },
      {
        src: "10-practice.webm",
        from: 0,
        to: 720,
        cues: [
          { at: 70, text: "Every share answers the first question at a glance." },
          { at: 190, text: "The timeline draws their weeks the way their own app drew them." },
          { at: 335, text: "Focus one thread — the rest steps back." },
          { at: 430, text: "Every recorded day, in miniature." },
          { at: 580, text: "All their shares merge into one continuous history." },
        ],
      },
    ],
    endLine: "Session notes stay on your device — never in any share.",
  },
];
