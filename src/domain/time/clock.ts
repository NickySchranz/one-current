/**
 * The app's sense of "now": wall time plus an optional skew.
 * The skew exists only for the Testing controls (watching days pass) and is
 * never persisted — reloading the page returns the app to real time.
 */
let skewMs = 0;

export function appNow(): Date {
  return new Date(Date.now() + skewMs);
}

export function getSkewMs(): number {
  return skewMs;
}

export function setSkewMs(ms: number): void {
  skewMs = ms;
}

export function advanceSkew(ms: number): void {
  skewMs += ms;
}
