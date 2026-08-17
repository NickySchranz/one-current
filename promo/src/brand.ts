/* Brand tokens lifted from one_current/public/about/index.html so the
   videos read as part of the same family as the landing page. */
export const brand = {
  accent: "#3f6f5f",
  accentSoft: "#e4ede9",
  ink: "#26251f",
  inkSoft: "#5c594e",
  paper: "#faf8f2",
  paperWarm: "#f3efe5",
  device: "#1d1c19",
  fontStack:
    '"Seravek", "Gill Sans Nova", Ubuntu, Calibri, "DejaVu Sans", source-sans-pro, sans-serif',
};

/* Per-video backdrop moods. */
export const moods = {
  river: { from: "#eef3ef", to: "#dce9e2", deep: "#3f6f5f" },
  dusk: { from: "#1d2b26", to: "#101a16", deep: "#0b120f" },
  warm: { from: "#f6efe2", to: "#eaddc6", deep: "#8a6a3f" },
  night: { from: "#171d2b", to: "#0e1119", deep: "#0a0d14" },
};

export type Mood = keyof typeof moods;
