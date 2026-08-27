import { resolveDef } from "./beats.js";

/* The promo videos. Footage and beat logs come from
   one-current-app/scripts/promo-footage.mjs (webm + beats.json in
   public/footage/, folded into src/beats.generated.json by sync-beats.mjs).

   Cue positions are written as BEAT NAMES, not frame numbers — "born+40"
   means "40 frames after the thread was born", wherever that landed in this
   recording. Re-capture and the captions follow the footage instead of
   drifting off it. `npx tsx scripts/check-beats.mjs` proves every reference
   resolves before anything is rendered. */
const raw = [
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
        from: "start",
        to: "end",
        cues: [
          { at: "timeline+8", text: "Everything pulling at you, beside one steady line." },
          { at: "fab+20", text: "Something new lands on your mind?" },
          { at: "naming+30", text: "Name it — that alone quiets it a little." },
          { at: "since+20", text: "Say how far back it goes." },
          { at: "holds+30", text: "And what it has been holding for you." },
          { at: "loudness+30", text: "Then how loud it feels, honestly." },
          { at: "born+30", text: "It joins your line as a thread you can see." },
          { at: "menu+10", text: "From then on, one question: what does it need today?" },
          { at: "act+40", text: "The thread waits above while you answer." },
          { at: "place+60", text: "One small step, placed on today. The line quiets." },
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
        from: "start",
        to: "end",
        cues: [
          { at: "patrol+12", text: "Pip lives in your today." },
          { at: "patrol+130", text: "He visits the threads that still owe you an answer…" },
          { at: "offers+10", text: "…and offers, instead of nagging." },
          { at: "reflect+40", text: "Take him up on it, and the thread opens." },
          { at: "close+40", text: "Then he goes back to his rounds." },
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
      headline: "Unanswered threads get louder.",
      sub: "Work your threads — then watch the days turn.",
    },
    clips: [
      {
        src: "03-louder-a.webm",
        from: "start",
        to: "end",
        cues: [
          { at: "flowing+8", text: "Time is flowing — an hour every second." },
          { at: "act+30", text: "This one needs a small step. Place it on today." },
          { at: "integrate+30", text: "This one is finished — integrate it into Now." },
          { at: "integrate+250", text: "What it held comes home to you." },
          { at: "rest+30", text: "This one? Nothing today — and saying so is a real answer." },
          { at: "lower+40", text: "Press and hold any thread to reach just its dial." },
          { at: "lower+150", text: "Quiet it honestly, and something shakes loose." },
          { at: "worked+10", text: "Every thread, answered." },
        ],
      },
      {
        src: "03-louder-b.webm",
        from: "start",
        to: "end",
        cues: [
          { at: "days+12", text: "Then the days roll on — and it all restarts." },
          { at: "days+150", text: "Unanswered threads grow louder. Tomorrow, you answer again." },
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
        from: "start",
        to: "end",
        cues: [
          { at: "timeline+8", text: "Some threads are finished — they just never ended." },
          { at: "integrate+20", text: "When one is resolved, integrate it into Now." },
          { at: "resolved+30", text: "Name what is true about it today." },
          { at: "wizard+20", text: "You choose what comes back with you." },
          { at: "reclaim+30", text: "Nothing valuable is lost." },
          { at: "reclaim+110", text: "What it was holding flies home." },
          { at: "after+20", text: "The line curves back. You are more whole." },
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
      sub: "Seven living themes. Answer them, and they settle.",
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
        from: "start",
        to: "end",
        cues: [
          { at: "timeline+8", text: "History keeps each day the way you lived it." },
          { at: "open-history+60", text: "Steps you decided on. Threads that came home." },
          { at: "prev-day+40", text: "Page back through the days you have already answered." },
          { at: "integrated+30", text: "Everything you integrated, gathered in one place." },
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
      headline: "Nothing leaves unless you send it.",
      sub: "Your threads live on your device.",
    },
    clips: [
      {
        src: "07-privacy.webm",
        from: "start",
        to: "end",
        cues: [
          { at: "privacy+8", text: "Everything you write is stored on this device." },
          { at: "privacy+70", text: "Backup and sharing are yours to start — neither happens on its own." },
          { at: "export+30", text: "Take a full export with you, any time." },
          { at: "back-to-now+30", text: "No feed. No ads. No tracking." },
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
        from: "start",
        to: "end",
        cues: [
          { at: "gauge+20", text: "Tap the gauge: how much of you moves with your main line?" },
          { at: "gauge+90", text: "“That is the split — not you.”" },
          { at: "gauge+200", text: "It names the one decision that would gather you most." },
          { at: "decide+40", text: "An action counts. So does letting it rest." },
          { at: "gauge-after+40", text: "Answer one thing, and come back together." },
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
        from: "start",
        to: "end",
        cues: [
          { at: "picker+8", text: "Words are hard in a session. The picture helps." },
          { at: "pick+10", text: "Pick exactly which threads to share — nothing else leaves." },
          { at: "window+10", text: "Pick the time window." },
          { at: "upload+6", text: "One tap…" },
          { at: "code+14", text: "…one code. It works once and expires in 14 days." },
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
        from: "start",
        to: "end",
        cues: [
          { at: "client+6", text: "Your client hands you an 8-character code…" },
          { at: "redeem+20", text: "…and their shared window arrives. One-time use, 14 days." },
        ],
      },
      {
        src: "10-practice.webm",
        from: "start",
        to: "end",
        cues: [
          { at: "view-share+10", text: "Every share answers the first question at a glance." },
          { at: "timeline+30", text: "The timeline draws their weeks the way their own app drew them." },
          { at: "focus+20", text: "Focus one thread — the rest steps back." },
          { at: "daybyday+20", text: "Every recorded day, in miniature." },
          { at: "history+30", text: "All their shares merge into one continuous history." },
        ],
      },
    ],
    endLine: "Session notes stay on your device — never in any share.",
  },
  {
    id: "11-bonk",
    mood: "dusk",
    device: "phone",
    intro: {
      kicker: "One Current",
      headline: "Answering your threads is the game.",
      sub: "Pip soothes them. The meter only ever fills.",
    },
    clips: [
      {
        // arming, the bonk, and the token that shakes loose
        src: "11-bonk.webm",
        from: "start",
        to: "charging+40",
        cues: [
          { at: "armed+10", text: "Tap a thread and Pip runs to it." },
          { at: "bonk+10", text: "Ask him to soothe it — its loudness eases for today." },
          { at: "token+10", text: "Quiet one honestly and a token shakes loose…" },
          { at: "token+70", text: "…and flies home to the meter." },
        ],
      },
      {
        // the meter full, and the sweep
        src: "11-bonk.webm",
        from: "super-60",
        to: "end",
        cues: [
          { at: "super-20", text: "Real answers fill it. Nothing empties it." },
          { at: "super+40", text: "SUPER BONK — every thread, all at once." },
          { at: "quiet+30", text: "No streak to lose. Nothing punishes a bad day." },
        ],
      },
    ],
  },
];

export const videos = raw.map(resolveDef);
