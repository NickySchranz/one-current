import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  OffthreadVideo,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { Background } from "./components/Background";
import { PhoneFrame, BrowserFrame } from "./components/DeviceFrame";
import { TitleCard } from "./components/TitleCard";
import { Captions, Cue } from "./components/Captions";
import { EndCard } from "./components/EndCard";
import type { Mood } from "./brand";
export type { Clip, PromoDef, RawPromoDef, FocusKeyframe } from "./beats";
import type { Clip, PromoDef, FocusKeyframe } from "./beats";


export const promoDuration = (def: PromoDef) =>
  (def.introFrames ?? 66) +
  def.clips.reduce((n, c) => n + (c.to - c.from), 0) +
  (def.outroFrames ?? 100);

const FOOTAGE_W = { phone: 780, browser: 2400 } as const;
const FOOTAGE_H = { phone: 1688, browser: 1600 } as const;

const DesktopViewport: React.FC<{ clip: Clip; width: number; aspect: number }> = ({
  clip,
  width,
  aspect,
}) => {
  const frame = useCurrentFrame();
  const keys = clip.focus ?? [
    { at: 0, x: FOOTAGE_W.browser / 2, y: FOOTAGE_H.browser / 2, scale: 1 },
  ];
  const ats = keys.map((k) => k.at);
  const lerp = (sel: (k: FocusKeyframe) => number) =>
    keys.length === 1
      ? sel(keys[0])
      : interpolate(frame, ats, keys.map(sel), {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.inOut(Easing.cubic),
        });
  const scale = lerp((k) => k.scale);
  const fx = lerp((k) => k.x);
  const fy = lerp((k) => k.y);
  const k = (width / FOOTAGE_W.browser) * scale;
  const containerH = width * aspect;
  return (
    <div
      style={{
        position: "absolute",
        width: FOOTAGE_W.browser,
        height: FOOTAGE_H.browser,
        transformOrigin: "0 0",
        transform: `translate(${width / 2 - fx * k}px, ${containerH / 2 - fy * k}px) scale(${k})`,
      }}
    >
      <OffthreadVideo
        src={staticFile(`footage/${clip.src}`)}
        startFrom={clip.from}
        endAt={clip.to}
        muted
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
};

const ClipSegment: React.FC<{
  def: PromoDef;
  clip: Clip;
  isFirst: boolean;
}> = ({ def, clip, isFirst }) => {
  const frame = useCurrentFrame();
  const dur = clip.to - clip.from;
  const fadeIn = isFirst
    ? interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" })
    : interpolate(frame, [0, 7], [0.25, 1], { extrapolateRight: "clamp" });
  const breathe = 1 + 0.018 * Math.min(1, frame / dur); // slow push-in for life
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: fadeIn }}>
      <div style={{ transform: `scale(${breathe})` }}>
        {def.device === "phone" ? (
          <PhoneFrame width={742}>
            <OffthreadVideo
              src={staticFile(`footage/${clip.src}`)}
              startFrom={clip.from}
              endAt={clip.to}
              muted
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </PhoneFrame>
        ) : (
          <BrowserFrame width={1000} aspect={1600 / 2400}>
            <DesktopViewport clip={clip} width={1000} aspect={1600 / 2400} />
          </BrowserFrame>
        )}
      </div>
      <Captions mood={def.mood} cues={clip.cues ?? []} segmentDuration={dur} />
    </AbsoluteFill>
  );
};

export const PromoVideo: React.FC<{ def: PromoDef }> = ({ def }) => {
  const introFrames = def.introFrames ?? 66;
  const outroFrames = def.outroFrames ?? 100;
  let cursor = introFrames;
  const segments = def.clips.map((clip, i) => {
    const start = cursor;
    cursor += clip.to - clip.from;
    return { clip, start, i };
  });
  return (
    <AbsoluteFill>
      <Background mood={def.mood} />
      {segments.map(({ clip, start, i }) => (
        <Sequence key={i} from={start} durationInFrames={clip.to - clip.from}>
          <ClipSegment def={def} clip={clip} isFirst={i === 0} />
        </Sequence>
      ))}
      <Sequence from={0} durationInFrames={introFrames}>
        <TitleCard mood={def.mood} durationInFrames={introFrames} {...def.intro} />
      </Sequence>
      <Sequence from={cursor} durationInFrames={outroFrames}>
        <EndCard mood={def.mood} pro={def.pro} line={def.endLine} />
      </Sequence>
    </AbsoluteFill>
  );
};
