import { beats as beatsData } from "./beats.generated.js";

/**
 * Footage positions by name instead of by number.
 *
 * Every clip carries a beat log from the capture run, so a cue can say where
 * it belongs — "the moment the thread is born" — rather than "frame 536".
 * Re-capturing then moves the captions with the footage instead of silently
 * stranding them, which is exactly what went wrong the last time the app's UI
 * moved underneath this set.
 *
 * A reference is a number (raw frame), or a string:
 *   "born"        the frame that beat was logged at
 *   "born+40"     40 frames after it
 *   "act-20"      20 frames before it
 *   "end"         the last frame of the recording
 *   "start"       0
 */

const scenes = beatsData;

const sceneOf = (src) => src.replace(/\.webm$/, "");

export function sceneFrames(src) {
  const s = scenes[sceneOf(src)];
  if (!s) throw new Error(`beats: no capture named "${sceneOf(src)}" — run sync-beats.mjs`);
  return s.frames;
}

export function resolveFrame(src, ref) {
  if (typeof ref === "number") return ref;
  const name = sceneOf(src);
  const scene = scenes[name];
  if (!scene) throw new Error(`beats: no capture named "${name}" — run sync-beats.mjs`);

  // Labels may contain hyphens ("tap-thread", "back-to-now"), so an offset is
  // only an offset when a +/- is followed by digits at the very end.
  const text = ref.trim();
  const m = /^(.*?)\s*([+-])\s*(\d+)$/.exec(text);
  const label = (m ? m[1] : text).trim();
  const sign = m ? m[2] : null;
  const amount = m ? m[3] : "0";
  if (!label) throw new Error(`beats: cannot read frame reference "${ref}" for ${name}`);

  const base =
    label === "end" ? scene.frames : label === "start" ? 0 : scene.beats[label];
  if (base === undefined) {
    const known = Object.keys(scene.beats).join(", ") || "(none logged)";
    throw new Error(`beats: ${name} has no beat "${label}". Known beats: ${known}`);
  }
  const offset = sign ? Number(amount) * (sign === "-" ? -1 : 1) : 0;
  // Clamp: a cue nudged past the end would silently never show.
  return Math.max(0, Math.min(scene.frames, base + offset));
}


/**
 * Turn beat references into frames, once, at module load. Everything
 * downstream (durations, sequences, captions) then sees plain numbers, and a
 * missing beat throws here rather than rendering a silently wrong cut.
 */
export const resolveDef = (def) => ({
  ...def,
  clips: def.clips.map((clip) => {
    const from = resolveFrame(clip.src, clip.from);
    const to = resolveFrame(clip.src, clip.to);
    if (to <= from)
      throw new Error(`${def.id}: clip ${clip.src} ends (${to}) at or before it starts (${from})`);
    return {
      ...clip,
      from,
      to,
      // cue frames are relative to the clip segment
      cues: clip.cues?.map((cue) => ({
        ...cue,
        at: Math.max(0, resolveFrame(clip.src, cue.at) - from),
      })),
    };
  }),
});
