import { useEffect, useMemo, useRef, useState } from "react";
import { filterBranches, useAppStore } from "@/stores/app-store";
import { buildTimelineLayout } from "@/visualization/main-line/layout";
import { generateTicks, dateToX } from "@/visualization/zoom/time-scale";
import { describeTimeline, describeBranch } from "@/visualization/a11y/describe";
import { isOpen, isWaiting, mostActivated } from "@/domain/branches/logic";
import type { PsychologicalBranch } from "@/domain/branches/types";
import { BranchLine } from "./BranchLine";
import { TimelineFilters } from "./TimelineFilters";
import { EnergyBar } from "./EnergyBar";
import { BranchTouchView } from "@/features/branch-touch/BranchTouchView";
import { branchColor } from "@/visualization/branch-lines/style";

const DAY = 24 * 60 * 60 * 1000;

export function LifeTimeline() {
  const branches = useAppStore((s) => s.branches);
  const window_ = useAppStore((s) => s.window);
  const typeFilter = useAppStore((s) => s.typeFilter);
  const statusFilter = useAppStore((s) => s.statusFilter);
  const setView = useAppStore((s) => s.setView);
  const zoomBy = useAppStore((s) => s.zoomBy);
  const panBy = useAppStore((s) => s.panBy);
  const returnToNow = useAppStore((s) => s.returnToNow);
  const theme = useAppStore((s) => s.theme);
  const view = useAppStore((s) => s.view);
  const reclaim = useAppStore((s) => s.reclaim);
  const clearReclaim = useAppStore((s) => s.clearReclaim);
  const reducedMotion = useAppStore((s) => s.reducedMotion);

  // Tapping a line focuses it: the touch sheet opens and everything else steps back.
  const focusedBranchId = view.kind === "touch" ? view.branchId : undefined;

  // A decision just released feelings: let them drift home, then forget the event.
  useEffect(() => {
    if (!reclaim) return;
    const t = setTimeout(clearReclaim, reducedMotion ? 0 : 2200);
    return () => clearTimeout(t);
  }, [reclaim, clearReclaim, reducedMotion]);

  const stageRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ width: 960, height: 480 });
  const [focusIndex, setFocusIndex] = useState(-1);
  // Vertical zoom: spread a few lines apart, or squeeze many into view.
  const [yZoom, setYZoom] = useState(1);
  const dragRef = useRef<{ x: number; moved: boolean } | null>(null);
  // Active touches; two at once become a pinch (horizontal = time, vertical = lanes).
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ dx: number; dy: number } | null>(null);

  // Wheel / trackpad: scrolling moves you closer to or further from the branches
  // (vertical zoom — scroll down to step back and see them all), pinch or
  // shift-scroll zooms time around the cursor, sideways scroll pans. Attached
  // natively so we can preventDefault (React registers wheel listeners as passive).
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.shiftKey) {
        // ctrl+wheel is a trackpad pinch
        const rect = el.getBoundingClientRect();
        const focal = Math.max(0, Math.min(1, (e.clientX - rect.left) / Math.max(1, rect.width)));
        const speed = e.ctrlKey ? 0.008 : 0.0022;
        const delta = e.shiftKey && e.deltaY === 0 ? e.deltaX : e.deltaY;
        zoomBy(Math.exp(delta * speed), focal);
        return;
      }
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        panBy(e.deltaX / Math.max(1, el.clientWidth));
        return;
      }
      // Scroll down = zoom out: lanes squeeze together and the branches recede.
      setYZoom((z) => Math.min(3, Math.max(0.4, z * Math.exp(-e.deltaY * 0.002))));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomBy, panBy]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setSize({
        width: Math.max(320, r.width),
        height: Math.max(240, r.height),
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const visible = useMemo(
    () => filterBranches(branches, typeFilter, statusFilter),
    [branches, typeFilter, statusFilter],
  );

  const compact = size.width < 640;
  const layout = useMemo(
    () =>
      buildTimelineLayout(visible, {
        width: size.width,
        height: size.height,
        window: window_,
        compact,
        yZoom,
      }),
    [visible, size, window_, compact, yZoom],
  );

  const ticks = useMemo(() => generateTicks(layout.window), [layout.window]);
  const summary = useMemo(() => describeTimeline(visible, layout.window), [visible, layout.window]);
  const top = mostActivated(visible);
  const byId = useMemo(() => new Map(visible.map((b) => [b.id, b])), [visible]);

  const openCount = visible.filter((b) => isOpen(b) && !isWaiting(b)).length;
  const waitingCount = visible.filter(isWaiting).length;

  const ordered = layout.geometries
    .map((g) => byId.get(g.branchId))
    .filter((b): b is PsychologicalBranch => !!b);

  // "Return to Now" appears once you have moved away from the default view:
  // the recent week with the right edge at the furthest future we extend.
  const today = new Date().toISOString().slice(0, 10);
  const span = Date.parse(layout.window.end) - Date.parse(layout.window.start);
  const furthestEnd = Date.parse(today) + span / 4;
  const awayFromNow =
    furthestEnd - Date.parse(layout.window.end) > 0.25 * DAY ||
    Math.abs(span - 8 * DAY) > 0.75 * DAY;

  const todayX = dateToX(today, layout.window, layout.metrics.width);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const dir = e.key === "ArrowDown" ? 1 : -1;
      setFocusIndex(Math.max(0, Math.min(ordered.length - 1, focusIndex + dir)));
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      panBy(-0.15);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      panBy(0.15);
    } else if ((e.key === "Enter" || e.key === " ") && focusIndex >= 0 && ordered[focusIndex]) {
      e.preventDefault();
      setView({ kind: "touch", branchId: ordered[focusIndex].id });
    } else if (e.key === "+" || e.key === "=") {
      zoomBy(0.7);
    } else if (e.key === "-") {
      zoomBy(1.4);
    } else if (e.key === "Home" || e.key === "n") {
      returnToNow();
    }
  }

  function onPointerDown(e: React.PointerEvent) {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()];
      pinchRef.current = { dx: Math.abs(a.x - b.x), dy: Math.abs(a.y - b.y) };
      dragRef.current = null;
    } else {
      dragRef.current = { x: e.clientX, moved: false };
    }
  }
  function onPointerMove(e: React.PointerEvent) {
    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
    // Two fingers: horizontal spread zooms time, vertical spread spreads lanes.
    if (pointersRef.current.size === 2 && pinchRef.current) {
      const [a, b] = [...pointersRef.current.values()];
      const dx = Math.abs(a.x - b.x);
      const dy = Math.abs(a.y - b.y);
      const prev = pinchRef.current;
      if (prev.dx > 40 && dx > 40) {
        const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
        const mid = (a.x + b.x) / 2;
        const focal = Math.max(0, Math.min(1, (mid - rect.left) / Math.max(1, rect.width)));
        zoomBy(prev.dx / dx, focal);
      }
      if (prev.dy > 40 && dy > 40) {
        setYZoom((z) => Math.min(3, Math.max(0.4, z * (dy / prev.dy))));
      }
      pinchRef.current = { dx, dy };
      return;
    }
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 6) {
      d.moved = true;
      d.x = e.clientX;
      panBy(-dx / Math.max(1, layout.metrics.width));
    }
  }
  function onPointerUp(e: React.PointerEvent) {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    dragRef.current = null;
  }

  return (
    <div className="timeline-page">
      <div className="timeline-controls">
        <TimelineFilters variant="popover" />
        <span className="hint timeline-counts" aria-hidden="true">
          {openCount} active · {waitingCount} waiting
        </span>
      </div>

      <EnergyBar branches={visible} />


      <p className="visually-hidden" role="status">
        {summary}
      </p>

      <div className="timeline-stage" ref={stageRef}>
        <svg
          ref={svgRef}
          className="timeline-svg"
          width={size.width}
          height={layout.height}
          role="img"
          aria-label={summary}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          {/* today softly glows: this part of the line is where life is happening */}
          {layout.nowX - todayX > 0 && (
            <rect
              className="today-band"
              x={todayX}
              y={0}
              width={layout.nowX - todayX}
              height={layout.height}
              aria-hidden="true"
            />
          )}

          {/* axis ticks */}
          {ticks.map((t) => {
            const x = dateToX(t.date, layout.window, layout.metrics.width);
            return (
              <g key={t.date} className={`axis-tick ${t.major ? "major" : ""}`} aria-hidden="true">
                <line x1={x} y1={16} x2={x} y2={layout.height - 20} />
                <text x={x + 4} y={layout.height - 8}>{t.label}</text>
              </g>
            );
          })}

          {/* main life line, with a slow current flowing toward Now */}
          <path
            className="main-line"
            d={`M 0 ${layout.mainY} L ${layout.nowX} ${layout.mainY}`}
            aria-hidden="true"
          />
          <path
            className="main-flow"
            d={`M 0 ${layout.mainY} L ${layout.nowX} ${layout.mainY}`}
            aria-hidden="true"
          />
          <path
            className="main-line"
            d={`M ${layout.nowX - 12} ${layout.mainY - 6} L ${layout.nowX} ${layout.mainY} L ${layout.nowX - 12} ${layout.mainY + 6}`}
            aria-hidden="true"
          />

          {/* faded projection: how tomorrow would feel if nothing gets decided.
              It lives in time — panning back slides it out of the window. */}
          {layout.fullWidth - layout.nowX > 4 && (
          <g className="future-projection" aria-hidden="true">
            <rect
              className="future-band"
              x={layout.nowX}
              y={0}
              width={Math.max(0, layout.fullWidth - layout.nowX)}
              height={layout.height}
            />
            <path
              className="future-main"
              d={`M ${layout.nowX} ${layout.mainY} L ${layout.fullWidth} ${layout.mainY}`}
            />
            {layout.geometries
              .filter((g) => g.reachesNow)
              .map((g) => {
                const branch = byId.get(g.branchId);
                if (!branch) return null;
                const span = layout.fullWidth - layout.nowX;
                return (
                  <path
                    key={g.branchId}
                    className="future-line"
                    stroke={branchColor(branch, theme)}
                    d={`M ${layout.nowX} ${g.laneY} C ${layout.nowX + span * 0.4} ${g.laneY}, ${layout.nowX + span * 0.6} ${g.projectedY}, ${layout.fullWidth} ${g.projectedY}`}
                  />
                );
              })}
            <text
              className="future-label"
              x={layout.nowX + (layout.fullWidth - layout.nowX) / 2}
              y={layout.height - 8}
              textAnchor="middle"
            >
              tomorrow
            </text>
          </g>
          )}

          {/* branch lines */}
          {layout.geometries.map((g, i) => {
            const branch = byId.get(g.branchId);
            if (!branch) return null;
            return (
              <BranchLine
                key={g.branchId}
                branch={branch}
                geometry={g}
                theme={theme}
                focused={i === focusIndex}
                emphasizedId={top?.id}
                highlighted={branch.id === focusedBranchId}
                dimmed={!!focusedBranchId && branch.id !== focusedBranchId}
                onSelect={() => setView({ kind: "touch", branchId: branch.id })}
                onSelectMoment={() =>
                  setView({ kind: "touch", branchId: branch.id })
                }
                onSelectMergePoint={() => {
                  const mergeId = branch.mergeIds[branch.mergeIds.length - 1];
                  if (mergeId) setView({ kind: "merge-review", mergeId });
                }}
              />
            );
          })}

          {/* Now marker: alive, breathing */}
          <g
            className="now-marker"
            role="button"
            tabIndex={-1}
            style={{ cursor: "pointer" }}
            onClick={() => setView({ kind: "now" })}
            aria-label="Now. Select to see everything entering the present."
          >
            <circle className="now-glow" cx={layout.nowX - 2} cy={layout.mainY} r={14} />
            <circle cx={layout.nowX - 2} cy={layout.mainY} r={7} />
            <text className="now-label" x={layout.nowX - 8} y={layout.mainY - 18} textAnchor="end">
              Now
            </text>
          </g>
        </svg>

        {branches.length === 0 && (
          <div className="timeline-empty">
            <p className="prompt">Your life continues on one main line.</p>
            <p className="hint">
              When something begins pulling part of your attention away from the present, add it as
              a branch with the + button. You can merge it back when it has given you what it
              carries.
            </p>
          </div>
        )}

        {awayFromNow && (
          <button className="btn return-to-now" onClick={returnToNow}>
            ⇥ Return to Now
          </button>
        )}

        {branches.length > 0 && (
          <span className="hint timeline-legend" aria-hidden="true">
            solid = active · dotted = waiting · curved back = merged · thicker = stronger pull ·
            faint ✓ = decided today · scroll = step back from the lines · pinch or shift-scroll = zoom time
          </span>
        )}

        {/* feelings returning to the main line after a decision */}
        {reclaim && !reducedMotion && (() => {
          const g = layout.geometries.find((x) => x.branchId === reclaim.branchId);
          if (!g) return null;
          const x0 = Math.min(g.labelX, layout.metrics.width - 60);
          const y0 = g.labelY;
          return (
            <div className="reclaim-layer" aria-hidden="true" key={reclaim.key}>
              {reclaim.feelings.map((f, i) => (
                <span
                  key={f}
                  className="tag quality reclaim-chip"
                  style={
                    {
                      "--x0": `${x0}px`,
                      "--y0": `${y0}px`,
                      "--dx": `${layout.nowX - 24 - x0}px`,
                      "--dy": `${layout.mainY - y0}px`,
                      animationDelay: `${i * 0.14}s`,
                    } as React.CSSProperties
                  }
                >
                  {f}
                </span>
              ))}
            </div>
          );
        })()}

      </div>

      {/* focus sheet: decide something about the tapped line without leaving the timeline */}
      {focusedBranchId && (
        <>
          <div
            className="sheet-backdrop"
            aria-hidden="true"
            onClick={() => setView({ kind: "timeline" })}
          />
          <div className="touch-sheet" role="dialog" aria-modal="true" aria-label="This branch">
            <BranchTouchView key={focusedBranchId} branchId={focusedBranchId} sheet />
          </div>
        </>
      )}

      {/* semantic non-visual equivalent */}
      <nav aria-label="Branches">
        <ul className="visually-hidden">
          {ordered.map((b) => (
            <li key={b.id}>
              <button onClick={() => setView({ kind: "touch", branchId: b.id })}>
                {describeBranch(b)}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
