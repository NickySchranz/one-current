import React from "react";
import { resolveFrame as at } from "./beats.js";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  OffthreadVideo,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Background, inkFor, subInkFor } from "./components/Background";
import { PhoneFrame } from "./components/DeviceFrame";
import { LogoMark } from "./components/LogoMark";
import { Captions, Cue } from "./components/Captions";
import { EndCard } from "./components/EndCard";
import { brand } from "./brand";
import type { Mood } from "./brand";

/* ------------------------------------------------ shared segment helpers */

export const FadeIn: React.FC<{ children: React.ReactNode; dur?: number }> = ({ children, dur = 8 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity: interpolate(frame, [0, dur], [0, 1], { extrapolateRight: "clamp" }) }}>
      {children}
    </AbsoluteFill>
  );
};

/* Phone with footage: springs in, optional playback rate and animated
   zoom-punch toward a point of the screen (fractions of the phone). */
export const PhoneClip: React.FC<{
  src: string;
  from: number;
  rate?: number;
  width?: number;
  cues?: Cue[];
  segmentDuration: number;
  zoom?: { x: number; y: number; scale: number; at: number; dur: number; hold?: number };
}> = ({ src, from, rate = 1, width = 742, cues = [], segmentDuration, zoom }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 200, stiffness: 90 } });
  let z = 1;
  if (zoom) {
    const backAt = zoom.at + zoom.dur + (zoom.hold ?? 40);
    z = interpolate(
      frame,
      [zoom.at, zoom.at + zoom.dur, backAt, backAt + zoom.dur],
      [1, zoom.scale, zoom.scale, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) },
    );
  }
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          transform: `translateY(${(1 - enter) * 160}px) rotate(${(1 - enter) * -5}deg) scale(${0.94 + enter * 0.06})`,
          filter: "drop-shadow(0 40px 70px rgba(0,0,0,0.32))",
        }}
      >
        <div
          style={{
            transform: `scale(${z})`,
            transformOrigin: zoom ? `${zoom.x * 100}% ${zoom.y * 100}%` : "center",
          }}
        >
          <PhoneFrame width={width}>
            <OffthreadVideo
              src={staticFile(`footage/${src}`)}
              startFrom={from}
              playbackRate={rate}
              muted
              style={{ width: "100%", display: "block" }}
            />
          </PhoneFrame>
        </div>
      </div>
      <Captions mood="river" cues={cues} segmentDuration={segmentDuration} />
    </AbsoluteFill>
  );
};

/* Big statement: kicker + word-punch headline. */
export const Statement: React.FC<{ mood: Mood; kicker?: string; headline: string; sub?: string }> = ({ mood, kicker, headline, sub }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ink = inkFor(mood);
  const dark = mood === "dusk" || mood === "night";
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: "0 90px", fontFamily: brand.fontStack }}>
      {kicker ? (
        <div
          style={{
            fontSize: 32,
            letterSpacing: 6,
            textTransform: "uppercase",
            fontWeight: 700,
            color: dark ? "#9fd0bd" : brand.accent,
            marginBottom: 40,
            opacity: interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          {kicker}
        </div>
      ) : null}
      <div style={{ textAlign: "center", lineHeight: 1.12 }}>
        {headline.split(" ").map((w, i) => {
          const s = spring({ frame: frame - i * 4, fps, config: { damping: 14, stiffness: 160 } });
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                fontSize: 96,
                fontWeight: 750,
                color: ink,
                marginRight: 24,
                letterSpacing: -1,
                transform: `scale(${0.4 + Math.min(1, s) * 0.6}) translateY(${(1 - Math.min(1, s)) * 30}px)`,
                opacity: Math.min(1, s * 1.4),
              }}
            >
              {w}
            </span>
          );
        })}
      </div>
      {sub ? (
        <div
          style={{
            marginTop: 44,
            fontSize: 40,
            lineHeight: 1.45,
            color: subInkFor(mood),
            textAlign: "center",
            maxWidth: 840,
            opacity: interpolate(frame, [18, 32], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        >
          {sub}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/* Hard-cut theme montage with a corner label chip. */
const THEME_CUTS: [string, string][] = [
  ["05-theme-demonfire.webm", "Demonfire"],
  ["05-theme-koipond.webm", "Koi pond"],
  ["05-theme-carnival.webm", "Carnival"],
  ["05-theme-catnap.webm", "Catnap"],
  ["05-theme-abyss.webm", "Abyss"],
  ["05-theme-gravemist.webm", "Gravemist"],
];
const CUT = 30;
const ThemeMontage: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: brand.fontStack }}>
    {THEME_CUTS.map(([src, label], i) => (
      <Sequence key={src} from={i * CUT} durationInFrames={CUT}>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div style={{ filter: "drop-shadow(0 40px 70px rgba(0,0,0,0.34))" }}>
            <PhoneFrame width={742}>
              <OffthreadVideo
                src={staticFile(`footage/${src}`)}
                startFrom={30}
                muted
                style={{ width: "100%", display: "block" }}
              />
            </PhoneFrame>
          </div>
          <div
            style={{
              position: "absolute",
              bottom: 130,
              left: "50%",
              transform: "translateX(-50%)",
              padding: "16px 38px",
              borderRadius: 999,
              background: "rgba(16,24,20,0.88)",
              color: "#f2f0e9",
              fontSize: 40,
              fontWeight: 700,
            }}
          >
            {label}
          </div>
        </AbsoluteFill>
      </Sequence>
    ))}
    <div
      style={{
        position: "absolute",
        top: 90,
        right: 70,
        padding: "12px 30px",
        borderRadius: 999,
        background: "#f2e2b8",
        color: "#7c5c14",
        fontSize: 32,
        fontWeight: 700,
      }}
    >
      Pro
    </div>
    <div
      style={{
        position: "absolute",
        top: 96,
        left: 70,
        fontSize: 40,
        fontWeight: 750,
        color: "#f2f0e9",
      }}
    >
      Every thread becomes a creature.
    </div>
  </AbsoluteFill>
);

/* Two stills drifting past each other (Ken Burns duo). */
const KenBurnsDuo: React.FC<{ a: string; b: string; cues: Cue[]; segmentDuration: number }> = ({ a, b, cues, segmentDuration }) => {
  const frame = useCurrentFrame();
  const drift = interpolate(frame, [0, segmentDuration], [0, 1]);
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: 60,
          top: 260 - drift * 60,
          transform: `rotate(-5deg) scale(${1 + drift * 0.04})`,
          filter: "drop-shadow(0 34px 60px rgba(0,0,0,0.3))",
        }}
      >
        <PhoneFrame width={500}>
          <Img src={staticFile(`stills/${a}`)} style={{ width: "100%", display: "block" }} />
        </PhoneFrame>
      </div>
      <div
        style={{
          position: "absolute",
          right: 60,
          top: 560 + drift * 40,
          transform: `rotate(5deg) scale(${1.04 - drift * 0.04})`,
          filter: "drop-shadow(0 34px 60px rgba(0,0,0,0.34))",
        }}
      >
        <PhoneFrame width={500}>
          <Img src={staticFile(`stills/${b}`)} style={{ width: "100%", display: "block" }} />
        </PhoneFrame>
      </div>
      <Captions mood="river" cues={cues} segmentDuration={segmentDuration} />
    </AbsoluteFill>
  );
};

/* Cold open: logo draws, then the name of the idea. */
const ColdOpen: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ink = inkFor("river");
  const draw = interpolate(frame, [0, 26], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", fontFamily: brand.fontStack, gap: 44 }}>
      <div style={{ opacity: draw }}>
        <LogoMark ink={ink} size={300} />
      </div>
      <div style={{ textAlign: "center", lineHeight: 1.1, padding: "0 90px" }}>
        {"Your mind is one current.".split(" ").map((w, i) => {
          const s = spring({ frame: frame - 14 - i * 4, fps, config: { damping: 200, stiffness: 110 } });
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                fontSize: 104,
                fontWeight: 750,
                color: ink,
                marginRight: 26,
                letterSpacing: -1.5,
                transform: `translateY(${(1 - s) * 50}px)`,
                opacity: s,
              }}
            >
              {w}
            </span>
          );
        })}
      </div>
      <div
        style={{
          fontSize: 42,
          color: subInkFor("river"),
          opacity: interpolate(frame, [46, 60], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        A quiet map of everything pulling at you.
      </div>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------ the film */

type Seg = { from: number; dur: number; mood: Mood; node: React.ReactNode };

export const Flagship: React.FC = () => {
  const segs: Seg[] = [
    { from: 0, dur: 105, mood: "river", node: <ColdOpen /> },
    {
      from: 105,
      dur: 285,
      mood: "river",
      node: (
        <PhoneClip
          src="01-hero.webm"
          from={at("01-hero.webm", "naming")}
          rate={1.2}
          segmentDuration={285}
          cues={[
            { at: 10, text: "Something lands on your mind? Name it." },
            { at: 152, text: "Set how loud it feels — honestly." },
            { at: 238, text: "It becomes a thread beside Now — not noise inside your head." },
          ]}
        />
      ),
    },
    { from: 390, dur: 120, mood: "night", node: <Statement mood="night" headline="Unanswered threads get louder." /> },
    {
      from: 510,
      dur: 161,
      mood: "night",
      node: (
        <PhoneClip
          src="03-louder-a.webm"
          from={at("03-louder-a.webm", "act")}
          rate={1.3}
          segmentDuration={161}
          zoom={{ x: 0.62, y: 0.42, scale: 1.4, at: 30, dur: 24, hold: 50 }}
          cues={[
            { at: 8, text: "A week can pass in seconds here." },
            { at: 92, text: "Every thread gets an honest answer." },
          ]}
        />
      ),
    },
    {
      from: 671,
      dur: 111,
      mood: "night",
      node: (
        <PhoneClip
          src="03-louder-b.webm"
          from={at("03-louder-b.webm", "days")}
          rate={1.8}
          segmentDuration={111}
          cues={[{ at: 16, text: "Then the days roll on — and it all restarts." }]}
        />
      ),
    },
    { from: 782, dur: 180, mood: "dusk", node: <ThemeMontage /> },
    {
      from: 962,
      dur: 180,
      mood: "warm",
      node: (
        <PhoneClip
          src="02-pip.webm"
          from={at("02-pip.webm", "offers-120")}
          rate={1.17}
          segmentDuration={180}
          zoom={{ x: 0.6, y: 0.28, scale: 1.7, at: 90, dur: 26, hold: 44 }}
          cues={[{ at: 18, text: "Meet Pip. He keeps watch with you." }]}
        />
      ),
    },
    {
      from: 1142,
      dur: 210,
      mood: "river",
      node: (
        <PhoneClip
          src="04-merge.webm"
          from={at("04-merge.webm", "wizard")}
          rate={1.14}
          segmentDuration={210}
          zoom={{ x: 0.5, y: 0.45, scale: 1.12, at: 60, dur: 60, hold: 200 }}
          cues={[
            { at: 12, text: "When a thread is resolved, integrate it." },
            { at: 120, text: "What it held comes home to you." },
          ]}
        />
      ),
    },
    {
      from: 1352,
      dur: 150,
      mood: "warm",
      node: (
        <KenBurnsDuo
          a="still-wholeness.png"
          b="still-history.png"
          segmentDuration={150}
          cues={[{ at: 14, text: "See how gathered you are — and read your days back." }]}
        />
      ),
    },
    { from: 1502, dur: 80, mood: "river", node: <Statement mood="river" headline="Nothing leaves unless you send it." /> },
    {
      from: 1582,
      dur: 70,
      mood: "dusk",
      node: (
        <PhoneClip
          src="09-share.webm"
          from={at("09-share.webm", "upload")}
          segmentDuration={70}
          cues={[{ at: 10, text: "Share only what you choose — with your therapist. (Pro)" }]}
        />
      ),
    },
    { from: 1652, dur: 148, mood: "river", node: <EndCard mood="river" pro line="Free to start. Your threads stay on your device." /> },
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
