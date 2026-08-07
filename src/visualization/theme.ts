/** The five moods the app can wear. Each is a complete look: colour, type,
 * shape, and the pace of every animation. */
export const THEMES = [
  {
    id: "riverbed",
    name: "Riverbed",
    hint: "Warm paper, moss green, a slow steady current.",
    mode: "light",
    paper: "#faf9f6",
    accent: "#3f6f5f",
  },
  {
    id: "midnight",
    name: "Midnight console",
    hint: "Dark glass and cyan signals, quick and precise.",
    mode: "dark",
    paper: "#0b0e15",
    accent: "#4fd6e3",
  },
  {
    id: "sunprint",
    name: "Sunprint",
    hint: "Cream and terracotta, round and unhurried.",
    mode: "light",
    paper: "#faf1e2",
    accent: "#c2653f",
  },
  {
    id: "duskwood",
    name: "Duskwood",
    hint: "Forest dark with amber fireflies.",
    mode: "dark",
    paper: "#131a14",
    accent: "#d9a14e",
  },
  {
    id: "porcelain",
    name: "Porcelain",
    hint: "Gallery white, ink lines, one touch of red.",
    mode: "light",
    paper: "#ffffff",
    accent: "#b23a2a",
  },
  {
    id: "demonfire",
    name: "Demonfire",
    hint: "Ember dark. Every open thread is a small dragon — face it kindly and it settles.",
    mode: "dark",
    paper: "#161013",
    accent: "#c65a33",
  },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export function isThemeId(value: string): value is ThemeId {
  return THEMES.some((t) => t.id === value);
}

/** Whether a theme sits on dark ground — line colours pick their lightness from this. */
export function themeMode(id: ThemeId): "light" | "dark" {
  return THEMES.find((t) => t.id === id)?.mode ?? "light";
}
