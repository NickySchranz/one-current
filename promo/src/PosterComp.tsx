import React from "react";
import { AbsoluteFill, Img, staticFile, useVideoConfig } from "remotion";
import { Background, inkFor, subInkFor } from "./components/Background";
import { PhoneFrame, BrowserFrame } from "./components/DeviceFrame";
import { LogoMark } from "./components/LogoMark";
import { brand } from "./brand";
import type { Mood } from "./brand";

export type PosterDef = {
  id: string;
  w: number;
  h: number;
  mood: Mood;
  layout: "device" | "quote" | "grid" | "split";
  still?: string; // file in public/stills/
  stills?: string[]; // grid tiles
  deviceKind?: "phone" | "browser"; // split
  kicker?: string;
  headline: string;
  sub?: string;
  badge?: string;
  bullets?: string[];
};

const BrandRow: React.FC<{ ink: string; sub: string }> = ({ ink }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
    <LogoMark ink={ink} size={92} />
    <span style={{ fontSize: 34, fontWeight: 700, color: ink }}>One Current</span>
  </div>
);

const Badge: React.FC<{ text: string }> = ({ text }) => (
  <div
    style={{
      alignSelf: "flex-start",
      padding: "10px 26px",
      borderRadius: 999,
      background: "#f2e2b8",
      color: "#7c5c14",
      fontSize: 30,
      fontWeight: 700,
      letterSpacing: 1,
    }}
  >
    {text}
  </div>
);

export const PosterComp: React.FC<{ def: PosterDef }> = ({ def }) => {
  const { width, height } = useVideoConfig();
  const ink = inkFor(def.mood);
  const sub = subInkFor(def.mood);
  const dark = def.mood === "dusk" || def.mood === "night";
  const tall = height / width; // 1.0 sq · 1.25 4:5 · ~1.41 print · ~1.78 story
  const pad = Math.round(width * 0.065);
  const headlineSize = Math.min(96, width * 0.088) * (def.headline.length > 30 ? 0.82 : 1);

  const Header = (
    <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
      {def.kicker ? (
        <div
          style={{
            fontSize: 30,
            letterSpacing: 6,
            textTransform: "uppercase",
            fontWeight: 700,
            color: dark ? "#9fd0bd" : brand.accent,
          }}
        >
          {def.kicker}
        </div>
      ) : null}
      <div style={{ fontSize: headlineSize, fontWeight: 750, lineHeight: 1.08, color: ink, letterSpacing: -1 }}>
        {def.headline}
      </div>
      {def.sub ? (
        <div style={{ fontSize: 38, lineHeight: 1.4, color: sub, maxWidth: width * 0.82 }}>{def.sub}</div>
      ) : null}
      {def.badge ? <Badge text={def.badge} /> : null}
    </div>
  );

  return (
    <AbsoluteFill style={{ fontFamily: brand.fontStack, overflow: "hidden" }}>
      <Background mood={def.mood} />

      {def.layout === "device" && (
        <AbsoluteFill style={{ padding: pad, display: "flex", flexDirection: "column", gap: 44 }}>
          <BrandRow ink={ink} sub={sub} />
          {Header}
          <div style={{ flex: 1, position: "relative", marginTop: 8 }}>
            <div
              style={{
                position: "absolute",
                left: "50%",
                transform: "translateX(-50%)",
                top: 0,
                filter: "drop-shadow(0 40px 70px rgba(0,0,0,0.30))",
              }}
            >
              <PhoneFrame width={Math.round(width * (tall > 1.5 ? 0.56 : 0.6))}>
                {def.still ? (
                  <Img src={staticFile(`stills/${def.still}`)} style={{ width: "100%", display: "block" }} />
                ) : null}
              </PhoneFrame>
            </div>
          </div>
        </AbsoluteFill>
      )}

      {def.layout === "quote" && (
        <AbsoluteFill style={{ padding: pad, display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 48, alignItems: "center", textAlign: "center" }}>
            <LogoMark ink={ink} size={210} />
            {def.kicker ? (
              <div style={{ fontSize: 30, letterSpacing: 6, textTransform: "uppercase", fontWeight: 700, color: dark ? "#9fd0bd" : brand.accent }}>
                {def.kicker}
              </div>
            ) : null}
            <div style={{ fontSize: Math.min(104, width * 0.094) * (def.headline.length > 40 ? 0.72 : 1), fontWeight: 750, lineHeight: 1.14, color: ink, letterSpacing: -1, maxWidth: width * 0.86 }}>
              {def.headline}
            </div>
            {def.sub ? <div style={{ fontSize: 40, lineHeight: 1.45, color: sub, maxWidth: width * 0.78 }}>{def.sub}</div> : null}
            {def.badge ? <Badge text={def.badge} /> : null}
          </div>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 14 }}>
            <LogoMark ink={ink} size={64} />
            <span style={{ fontSize: 27, fontWeight: 700, color: sub }}>One Current</span>
          </div>
        </AbsoluteFill>
      )}

      {def.layout === "grid" && (
        <AbsoluteFill style={{ padding: pad, display: "flex", flexDirection: "column", gap: 40 }}>
          <BrandRow ink={ink} sub={sub} />
          {Header}
          <div
            style={{
              flex: 1,
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 26,
              alignContent: "start",
              marginTop: 10,
            }}
          >
            {(def.stills ?? []).map((s) => (
              <div
                key={s}
                style={{
                  borderRadius: 30,
                  border: `7px solid ${brand.device}`,
                  overflow: "hidden",
                  background: "#fff",
                  boxShadow: "0 22px 45px rgba(0,0,0,0.28)",
                  aspectRatio: "390 / 620",
                }}
              >
                <Img src={staticFile(`stills/${s}`)} style={{ width: "100%", display: "block" }} />
              </div>
            ))}
          </div>
        </AbsoluteFill>
      )}

      {def.layout === "split" && (
        <AbsoluteFill style={{ padding: pad, display: "flex", flexDirection: "column", gap: 42 }}>
          <BrandRow ink={ink} sub={sub} />
          {Header}
          <div style={{ display: "flex", flexDirection: "column", gap: 30, marginTop: 4 }}>
            {(def.bullets ?? []).map((b) => (
              <div key={b} style={{ display: "flex", alignItems: "center", gap: 22 }}>
                <div style={{ width: 16, height: 16, borderRadius: 8, background: brand.accent, flex: "none" }} />
                <div style={{ fontSize: 39, fontWeight: 600, color: ink }}>{b}</div>
              </div>
            ))}
          </div>
          <div style={{ flex: 1, position: "relative" }}>
            <div
              style={{
                position: "absolute",
                left: "50%",
                transform: "translateX(-50%)",
                top: 10,
                filter: "drop-shadow(0 40px 70px rgba(0,0,0,0.30))",
              }}
            >
              {def.deviceKind === "browser" ? (
                <BrowserFrame width={Math.round(width * 0.87)}>
                  <Img src={staticFile(`stills/${def.still}`)} style={{ width: "100%", display: "block" }} />
                </BrowserFrame>
              ) : (
                <PhoneFrame width={Math.round(width * 0.54)}>
                  <Img src={staticFile(`stills/${def.still}`)} style={{ width: "100%", display: "block" }} />
                </PhoneFrame>
              )}
            </div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
