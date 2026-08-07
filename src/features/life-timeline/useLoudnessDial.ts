import { useRef, useState } from "react";

/** Movement below this is still a tap; beyond it the gesture picks an axis. */
const DECIDE_PX = 8;
/** Vertical pixels per loudness step — up is louder, down is quieter. */
const STEP_PX = 36;

export type LoudnessPreview = { branchId: string; level: number };

type DialState =
  | { phase: "idle" }
  | {
      phase: "candidate";
      branchId: string;
      pointerId: number;
      startX: number;
      startY: number;
      startLevel: number;
    }
  | {
      phase: "adjusting";
      branchId: string;
      pointerId: number;
      startY: number;
      startLevel: number;
      level: number;
    };

type Options = {
  svgRef: React.RefObject<SVGSVGElement>;
  /** The gesture turned out horizontal: hand it back to the time pan. */
  onPanHandoff: (clientX: number) => void;
  /** The thumb released on a new level: persist it. */
  onCommit: (branchId: string, level: number) => void;
};

/**
 * Press a thread, then slide the thumb up or down anywhere on the stage to
 * raise or lower how loudly it vibrates. A plain tap still opens the quick
 * menu; a horizontal drag still pans through time. Adjusting is a touch,
 * not a decision — the thread's day counter is untouched.
 */
export function useLoudnessDial({ svgRef, onPanHandoff, onCommit }: Options) {
  const stateRef = useRef<DialState>({ phase: "idle" });
  // A finished drag must not fire the click that follows it.
  const consumedRef = useRef(false);
  const chipRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ x: 0, y: 0 });
  const [preview, setPreview] = useState<LoudnessPreview | null>(null);

  function reset() {
    stateRef.current = { phase: "idle" };
    setPreview(null);
  }

  function moveChip(e: { clientX: number; clientY: number }) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    // The chip floats up-left of the thumb, never underneath it.
    posRef.current = {
      x: Math.max(8, e.clientX - rect.left - 48),
      y: Math.max(8, e.clientY - rect.top - 48),
    };
    if (chipRef.current) {
      chipRef.current.style.transform = `translate(${posRef.current.x}px, ${posRef.current.y}px)`;
    }
  }

  /** Pointer went down on a thread: it may become a dial drag, a pan, or a tap. */
  function onBranchPointerDown(branchId: string, startLevel: number, e: React.PointerEvent) {
    consumedRef.current = false;
    // A second finger pauses everything, committing nothing.
    if (stateRef.current.phase !== "idle") {
      reset();
      return;
    }
    stateRef.current = {
      phase: "candidate",
      branchId,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startLevel,
    };
  }

  /**
   * The stage saw a pointer go down. Returns true when this pointer already
   * belongs to the dial, so the pan must not seed itself from it.
   */
  function onStagePointerDown(pointerId: number): boolean {
    const s = stateRef.current;
    if (s.phase === "idle") return false;
    if (s.pointerId === pointerId) return true;
    // A different pointer arrived mid-gesture: revert, commit nothing.
    reset();
    return false;
  }

  /** Returns true when the dial consumed the move; the pan must ignore it. */
  function onPointerMove(e: React.PointerEvent): boolean {
    const s = stateRef.current;
    if (s.phase === "idle" || s.pointerId !== e.pointerId) return false;

    if (s.phase === "candidate") {
      const dx = e.clientX - s.startX;
      const dy = e.clientY - s.startY;
      if (Math.hypot(dx, dy) <= DECIDE_PX) return true; // still a tap
      if (Math.abs(dy) >= Math.abs(dx)) {
        // Vertical wins: the thumb is dialing loudness now.
        try {
          svgRef.current?.setPointerCapture?.(e.pointerId);
        } catch {
          // jsdom and older engines: the drag still works within the svg
        }
        const level = clampLevel(s.startLevel + Math.round((s.startY - e.clientY) / STEP_PX));
        stateRef.current = {
          phase: "adjusting",
          branchId: s.branchId,
          pointerId: s.pointerId,
          startY: s.startY,
          startLevel: s.startLevel,
          level,
        };
        setPreview({ branchId: s.branchId, level });
        moveChip(e);
        return true;
      }
      // Horizontal wins: this is a pan after all.
      stateRef.current = { phase: "idle" };
      onPanHandoff(e.clientX);
      return true;
    }

    // adjusting
    const level = clampLevel(s.startLevel + Math.round((s.startY - e.clientY) / STEP_PX));
    if (level !== s.level) {
      stateRef.current = { ...s, level };
      setPreview({ branchId: s.branchId, level });
    }
    moveChip(e);
    return true;
  }

  function onPointerUp(e: React.PointerEvent) {
    const s = stateRef.current;
    if (s.phase === "idle" || s.pointerId !== e.pointerId) return;
    if (s.phase === "adjusting") {
      // The drag ends here — whatever happens, the tap-click must not follow.
      consumedRef.current = true;
      try {
        svgRef.current?.releasePointerCapture?.(e.pointerId);
      } catch {
        // capture may never have been taken
      }
      if (s.level !== s.startLevel) onCommit(s.branchId, s.level);
    }
    reset(); // a candidate that never moved stays a tap: the click proceeds
  }

  /** The gesture was taken away (system gesture, palm rejection): revert. */
  function onPointerCancel(e: React.PointerEvent) {
    const s = stateRef.current;
    if (s.phase === "idle" || s.pointerId !== e.pointerId) return;
    if (s.phase === "adjusting") consumedRef.current = true;
    reset();
  }

  /** Capture-phase click filter for the stage: swallow the click after a drag. */
  function onClickCapture(e: React.MouseEvent) {
    if (!consumedRef.current) return;
    consumedRef.current = false;
    e.preventDefault();
    e.stopPropagation();
  }

  return {
    preview,
    chipRef,
    chipPos: posRef,
    onBranchPointerDown,
    onStagePointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onClickCapture,
  };
}

function clampLevel(level: number): number {
  return Math.max(1, Math.min(5, level));
}
