import { useEffect, useMemo, useRef, useState } from "react";
import { filterBranches, useAppStore } from "@/stores/app-store";
import { buildTimelineLayout } from "@/visualization/main-line/layout";
import { generateTicks, dateToX } from "@/visualization/zoom/time-scale";
import { describeTimeline, describeBranch } from "@/visualization/a11y/describe";
import { isClosed, isWaiting, mostActivated } from "@/domain/branches/logic";
import type { PsychologicalBranch } from "@/domain/branches/types";
import { BranchLine } from "./BranchLine";
import { TimelineHelp } from "@/features/timeline-help/TimelineHelp";
import { WholenessIndicator } from "./WholenessIndicator";
import { branchColor } from "@/visualization/branch-lines/style";
import { mergePreviewPath } from "@/visualization/branch-lines/paths";
import { useT } from "@/i18n/i18n";

const DAY = 24 * 60 * 60 * 1000;

/** Never let timeline shortcuts fire while the user is typing somewhere. */
function isEditableTarget(e: { target: EventTarget | null }): boolean {
  const t = e.target as HTMLElement | null;
  if (!t) return false;
  return t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName);
}

export function LifeTimeline() {
  const branches = useAppStore((s) => s.branches);
  const window_ = useAppStore((s) => s.window);
  const typeFilter = useAppStore((s) => s.typeFilter);
  const statusFilter = useAppStore((s) => s.statusFilter);
  const setView = useAppStore((s) => s.setView);
  const setOperation = useAppStore((s) => s.setOperation);
  const zoomBy = useAppStore((s) => s.zoomBy);
  const panBy = useAppStore((s) => s.panBy);
  const returnToNow = useAppStore((s) => s.returnToNow);
  const theme = useAppStore((s) => s.theme);
  const operation = useAppStore((s) => s.operation);
  const reclaim = useAppStore((s) => s.reclaim);
  const clearReclaim = useAppStore((s) => s.clearReclaim);
  const born = useAppStore((s) => s.born);
  const clearBorn = useAppStore((s) => s.clearBorn);
  const reducedMotion = useAppStore((s) => s.reducedMotion);
  const actions = useAppStore((s) => s.actions);
  const waiting = useAppStore((s) => s.waiting);
  const language = useAppStore((s) => s.language);
  const t = useT();

  // The line the current operation concerns stays lit; everything else steps back.
  const focusedBranchId =
    "branchId" in operation
      ? operation.branchId
      : operation.kind === "confirming-merge" && operation.branchIds.length === 1
        ? operation.branchIds[0]
        : undefined;

  // A decision just released feelings: let them drift home, then forget the event.
  useEffect(() => {
    if (!reclaim) return;
    const t = setTimeout(clearReclaim, reducedMotion ? 0 : 2200);
    return () => clearTimeout(t);
  }, [reclaim, clearReclaim, reducedMotion]);

  // A just-created line draws itself in, then settles like the others.
  useEffect(() => {
    if (!born) return;
    const t = setTimeout(clearBorn, reducedMotion ? 0 : 1600);
    return () => clearTimeout(t);
  }, [born, clearBorn, reducedMotion]);

  const stageRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ width: 960, height: 480 });
  // When the quick tray rises over the stage as a bottom sheet, the lanes move
  // up into the space that remains — the selected line and Now stay visible
  // together, never hidden behind the panel.
  const [bottomInset, setBottomInset] = useState(0);
  const insetRef = useRef(0);
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      let next = 0;
      const stage = stageRef.current;
      const tray = document.querySelector(".quick-tray");
      if (stage && tray) {
        const stageRect = stage.getBoundingClientRect();
        const trayRect = tray.getBoundingClientRect();
        const overlapX =
          Math.min(stageRect.right, trayRect.right) - Math.max(stageRect.left, trayRect.left);
        const overlapY = Math.max(0, stageRect.bottom - trayRect.top);
        // Only the bottom sheet counts; the desktop side panel leaves Now clear.
        if (overlapX > stageRect.width * 0.55 && overlapY > 0) {
          next = Math.min(overlapY, stageRect.height * 0.6);
        }
      }
      if (next !== insetRef.current) {
        insetRef.current = next;
        setBottomInset(next);
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [operation, size]);
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
        height: Math.max(220, size.height - bottomInset),
        window: window_,
        compact,
        yZoom,
      }),
    [visible, size, window_, compact, yZoom, bottomInset],
  );

  const ticks = useMemo(() => generateTicks(layout.window), [layout.window]);
  const summary = useMemo(
    () => describeTimeline(visible, layout.window, t),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t is stable per language
    [visible, layout.window, language],
  );
  const top = mostActivated(visible);
  const byId = useMemo(() => new Map(visible.map((b) => [b.id, b])), [visible]);

  const ordered = layout.geometries
    .map((g) => byId.get(g.branchId))
    .filter((b): b is PsychologicalBranch => !!b);

  // "Return to Now" appears once you have moved away from the default view:
  // the recent week with the right edge at the furthest future we extend.
  const today = new Date().toISOString().slice(0, 10);
  const span = Date.parse(layout.window.end) - Date.parse(layout.window.start);
  const restingEnd = Date.parse(today) + span / 2;
  const awayFromNow =
    Math.abs(restingEnd - Date.parse(layout.window.end)) > 0.25 * DAY ||
    Math.abs(span - 8 * DAY) > 0.75 * DAY;

  const todayX = dateToX(today, layout.window, layout.metrics.width);

  // Every decided, still-open action gathers around the main line past Now —
  // one place, not scattered across lanes. Actions of merged lines leave with
  // them; actions of lines left for today are withdrawn by that decision.
  const futureActions = useMemo(() => {
    return actions.filter((a) => {
      if (a.completedAt) return false;
      const owner = a.branchesIntegrated[0]?.branchId;
      if (!owner) return true;
      const b = branches.find((x) => x.id === owner);
      return !!b && !isClosed(b);
    });
  }, [actions, branches]);

  // How split the present is: open lines pull apart, decisions gather them.
  const activeLines = visible.filter((b) => !isClosed(b) && !isWaiting(b));

  function onKeyDown(e: React.KeyboardEvent) {
    if (isEditableTarget(e)) return;
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
      setOperation({ kind: "quick-touch", branchId: ordered[focusIndex].id });
    } else if (e.key === "+" || e.key === "=") {
      zoomBy(0.7);
    } else if (e.key === "-") {
      zoomBy(1.4);
    } else if (e.key === "n" || e.key === "N") {
      e.preventDefault();
      setOperation({ kind: "creating-branch" });
    } else if (e.key === "Home") {
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
      <p className="visually-hidden" role="status">
        {summary}
      </p>

      <div className="timeline-stage" ref={stageRef}>
        {/* One round +, unmistakable and wordless, floating on the water. */}
        <button
          className="timeline-fab"
          aria-label={t("New thread")}
          onClick={() => setOperation({ kind: "creating-branch" })}
        >
          +
        </button>
        <TimelineHelp />
        {/* how split the present is: strands fan out per undecided line and
            come home as decisions are taken — tap it for the day's forecast */}
        <WholenessIndicator activeLines={activeLines} />
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

          {/* the future stays one line: the main line continues faded, nothing
              branches ahead of Now. It lives in time — panning back slides it
              out of the window. */}
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
          </g>
          )}

          {/* waiting lines carry their review point: until then, nothing is required */}
          {waiting
            .filter((w) => !w.closedAt)
            .map((w) => {
              const g = layout.geometries.find((x) => x.branchId === w.branchId);
              const branch = byId.get(w.branchId);
              if (!g || !branch || !isWaiting(branch) || !g.inWindow) return null;
              const x = dateToX(w.reviewDate, layout.window, layout.metrics.width);
              const reviewLabel = new Date(w.reviewDate + "T00:00:00").toLocaleDateString(
                undefined,
                { month: "short", day: "numeric" },
              );
              return (
                <g key={w.id} className="review-marker" aria-hidden="true">
                  {/* the still stretch between Now and the review, if it lies ahead */}
                  {x > g.endX + 8 && (
                    <line
                      className="waiting-extension"
                      x1={g.endX}
                      y1={g.laneY}
                      x2={x}
                      y2={g.laneY}
                      stroke={branchColor(branch, theme, "muted")}
                    />
                  )}
                  <circle
                    className="review-dot"
                    cx={x}
                    cy={g.laneY}
                    r={4}
                    stroke={branchColor(branch, theme)}
                  />
                  <text className="review-label" x={x} y={g.laneY - 9} textAnchor="middle">
                    {t("review · {date}", { date: reviewLabel })}
                  </text>
                  <title>
                    {t("Review on {date}. Nothing further is required from you until then.", {
                      date: reviewLabel,
                    })}
                  </title>
                </g>
              );
            })}

          {/* decided actions gather around the main line past Now: one place
              where everything you chose to do next can be read together */}
          {futureActions.length > 0 && layout.fullWidth - layout.nowX > 40 && (
            <g className="action-continuation" aria-hidden="true">
              <path
                className="action-continuation-line"
                d={`M ${layout.nowX} ${layout.mainY} L ${Math.min(
                  layout.nowX + 150,
                  layout.fullWidth - 6,
                )} ${layout.mainY}`}
              />
              {futureActions.map((a, i) => {
                const owner = branches.find(
                  (b) => b.id === a.branchesIntegrated[0]?.branchId,
                );
                const y = layout.mainY + 16 + i * 16;
                return (
                  <g key={a.id}>
                    <circle
                      className="action-bullet"
                      cx={layout.nowX + 16}
                      cy={y - 4}
                      r={3}
                      fill={owner ? branchColor(owner, theme) : "var(--accent)"}
                    />
                    <text className="action-continuation-label" x={layout.nowX + 24} y={y}>
                      {a.title.length > 26 ? a.title.slice(0, 24) + "…" : a.title}
                    </text>
                  </g>
                );
              })}
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
                born={!reducedMotion && born?.branchId === branch.id}
                onSelect={() => setOperation({ kind: "quick-touch", branchId: branch.id })}
                onSelectMoment={() => setOperation({ kind: "quick-touch", branchId: branch.id })}
                onSelectMergePoint={() => {
                  const mergeId = branch.mergeIds[branch.mergeIds.length - 1];
                  if (mergeId) setView({ kind: "merge-review", mergeId });
                }}
              />
            );
          })}

          {/* a merge being considered: the lines curve toward Now, reversibly */}
          {operation.kind === "confirming-merge" && (
            <g className="merge-preview-layer" aria-hidden="true">
              {operation.branchIds.map((id) => {
                const g = layout.geometries.find((x) => x.branchId === id);
                const branch = byId.get(id);
                if (!g || !branch || g.endsOnMain || !g.inWindow) return null;
                return (
                  <path
                    key={id}
                    className="merge-preview"
                    stroke={branchColor(branch, theme)}
                    d={mergePreviewPath(g, layout.metrics)}
                  />
                );
              })}
              {operation.branchIds.length > 0 && (
                <circle
                  className="merge-preview-target"
                  cx={layout.nowX - 2}
                  cy={layout.mainY}
                  r={12}
                />
              )}
            </g>
          )}

          {/* Now marker: alive, breathing */}
          <g
            className="now-marker"
            role="button"
            tabIndex={-1}
            style={{ cursor: "pointer" }}
            onClick={() => returnToNow()}
            aria-label={t("Now. Select to return the view to the present.")}
          >
            <circle className="now-glow" cx={layout.nowX - 2} cy={layout.mainY} r={14} />
            <circle cx={layout.nowX - 2} cy={layout.mainY} r={7} />
            <text className="now-label" x={layout.nowX - 8} y={layout.mainY - 18} textAnchor="end">
              {t("Now")}
            </text>
          </g>
        </svg>

        {branches.length === 0 && (
          <div className="timeline-empty">
            <p className="prompt">{t("Your life continues on one main line.")}</p>
            <p className="hint">
              {t(
                "When something begins pulling part of your attention away from the present, add it as a thread with the + button. You can bring it back when it has given you what it carries.",
              )}
            </p>
          </div>
        )}

        {awayFromNow && (
          <button className="btn return-to-now" onClick={returnToNow}>
            ⇥ {t("Return to Now")}
          </button>
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
                  {t(f)}
                </span>
              ))}
            </div>
          );
        })()}

      </div>

      {/* semantic non-visual equivalent */}
      <nav aria-label={t("Threads")}>
        <ul className="visually-hidden">
          {ordered.map((b) => (
            <li key={b.id}>
              <button onClick={() => setOperation({ kind: "quick-touch", branchId: b.id })}>
                {describeBranch(b, t)}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
