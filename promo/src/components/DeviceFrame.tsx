import React from "react";
import { brand } from "../brand";

/* Phone shell around 780x1688 footage. Screen is sized so the whole device
   (incl. bezel) fits the given width. */
export const PhoneFrame: React.FC<{
  width?: number;
  children: React.ReactNode;
}> = ({ width = 760, children }) => {
  const bezel = Math.round(width * 0.028);
  const screenW = width - bezel * 2;
  const screenH = Math.round(screenW * (1688 / 780));
  return (
    <div
      style={{
        width,
        height: screenH + bezel * 2,
        background: brand.device,
        borderRadius: Math.round(width * 0.11),
        padding: bezel,
        boxShadow:
          "0 46px 90px rgba(0,0,0,0.34), 0 12px 28px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.10)",
      }}
    >
      <div
        style={{
          width: screenW,
          height: screenH,
          borderRadius: Math.round(width * 0.085),
          overflow: "hidden",
          background: "#fff",
          position: "relative",
        }}
      >
        {children}
      </div>
    </div>
  );
};

/* Browser-window card around desktop footage (2400x1600). The inner content
   can be panned/zoomed by the caller via the child's own transform. */
export const BrowserFrame: React.FC<{
  width?: number;
  aspect?: number; // height / width of the visible viewport
  children: React.ReactNode;
}> = ({ width = 1000, aspect = 1600 / 2400, children }) => {
  const barH = 64;
  const screenH = Math.round(width * aspect);
  return (
    <div
      style={{
        width,
        background: brand.device,
        borderRadius: 30,
        overflow: "hidden",
        boxShadow: "0 46px 90px rgba(0,0,0,0.34), 0 12px 28px rgba(0,0,0,0.22)",
      }}
    >
      <div
        style={{
          height: barH,
          display: "flex",
          alignItems: "center",
          gap: 13,
          paddingLeft: 28,
        }}
      >
        {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
          <div key={c} style={{ width: 18, height: 18, borderRadius: 9, background: c }} />
        ))}
        <div
          style={{
            marginLeft: 18,
            padding: "7px 22px",
            borderRadius: 12,
            background: "rgba(255,255,255,0.12)",
            color: "rgba(255,255,255,0.66)",
            fontSize: 22,
            fontFamily: brand.fontStack,
          }}
        >
          One Current — Practice
        </div>
      </div>
      <div style={{ width, height: screenH, overflow: "hidden", position: "relative", background: "#fff" }}>
        {children}
      </div>
    </div>
  );
};
