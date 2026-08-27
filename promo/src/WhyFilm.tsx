import React from "react";
import { resolveFrame as at } from "./beats.js";
import { AbsoluteFill, Sequence } from "remotion";
import { Background } from "./components/Background";
import { EndCard } from "./components/EndCard";
import { FadeIn, PhoneClip, Statement } from "./Flagship";
import type { Mood } from "./brand";

/* "Why it works" — the thinking behind One Current, in the product's own
   words (landing #why section): see it → name it → feel it honestly →
   decide, don't solve → integrate, don't suppress → answer again tomorrow. */

type Seg = { from: number; dur: number; mood: Mood; node: React.ReactNode };

export const WhyFilm: React.FC = () => {
  const segs: Seg[] = [
    {
      from: 0,
      dur: 100,
      mood: "river",
      node: <Statement mood="river" kicker="Why One Current works" headline="Stop carrying everything at once." />,
    },
    {
      from: 100,
      dur: 140,
      mood: "night",
      node: (
        <Statement
          mood="night"
          headline="An open loop you can see is lighter than one you carry blind."
        />
      ),
    },
    {
      from: 240,
      dur: 210,
      mood: "river",
      node: (
        <PhoneClip
          src="01-hero.webm"
          from={at("01-hero.webm", "fab")}
          rate={1.25}
          segmentDuration={210}
          cues={[
            { at: 10, text: "So: name it. One line, a few words." },
            { at: 120, text: "It leaves your head — and lands on your line." },
          ]}
        />
      ),
    },
    {
      from: 450,
      dur: 160,
      mood: "river",
      node: (
        <PhoneClip
          src="01-hero.webm"
          from={at("01-hero.webm", "loudness-40")}
          segmentDuration={160}
          zoom={{ x: 0.5, y: 0.78, scale: 1.5, at: 26, dur: 22, hold: 70 }}
          cues={[{ at: 12, text: "Say how loud it feels. Honestly. Seeing it is half the relief." }]}
        />
      ),
    },
    {
      from: 610,
      dur: 190,
      mood: "dusk",
      node: (
        <PhoneClip
          src="03-louder-a.webm"
          from={at("03-louder-a.webm", "act")}
          rate={1.25}
          segmentDuration={190}
          cues={[
            { at: 10, text: "Then decide — don't solve." },
            { at: 100, text: "A small step counts. So does letting it rest." },
          ]}
        />
      ),
    },
    {
      from: 800,
      dur: 190,
      mood: "river",
      node: (
        <PhoneClip
          src="04-merge.webm"
          from={at("04-merge.webm", "reclaim")}
          segmentDuration={190}
          zoom={{ x: 0.5, y: 0.45, scale: 1.1, at: 40, dur: 60, hold: 200 }}
          cues={[
            { at: 12, text: "When it completes: nothing is crossed out." },
            { at: 105, text: "You choose what comes back with you." },
          ]}
        />
      ),
    },
    {
      from: 990,
      dur: 140,
      mood: "night",
      node: (
        <PhoneClip
          src="03-louder-b.webm"
          from={at("03-louder-b.webm", "days")}
          rate={1.8}
          segmentDuration={140}
          cues={[{ at: 14, text: "Tomorrow you answer again. A minute, not an evening." }]}
        />
      ),
    },
    {
      from: 1130,
      dur: 110,
      mood: "warm",
      node: <Statement mood="warm" headline="Too heavy? Reaching for support is a normal answer." />,
    },
    {
      from: 1240,
      dur: 90,
      mood: "river",
      node: (
        <Statement
          mood="river"
          kicker="One Current"
          headline="A place outside your head for what you keep carrying inside it."
        />
      ),
    },
    {
      from: 1330,
      dur: 140,
      mood: "river",
      node: <EndCard mood="river" pro line="Free to start. Your threads stay on your device." />,
    },
  ];

  return (
    <AbsoluteFill style={{ background: "#0e1119" }}>
      {segs.map((s, i) => (
        <Sequence key={i} from={s.from} durationInFrames={s.dur}>
          <FadeIn dur={i === 0 ? 12 : 7}>
            <Background mood={s.mood} />
            {s.node}
          </FadeIn>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
