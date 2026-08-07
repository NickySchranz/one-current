import { useEffect, useMemo, useRef, useState } from "react";
import { filterBranches, useAppStore } from "@/stores/app-store";
import { buildTimelineLayout } from "@/visualization/main-line/layout";
import { generateTicks, dateToX } from "@/visualization/zoom/time-scale";
import { describeTimeline, describeBranch } from "@/visualization/a11y/describe";
import { effectiveLoudness, isClosed, mostActivated } from "@/domain/branches/logic";
import { decidedToday } from "@/domain/feelings/logic";
import type { PsychologicalBranch, Loudness } from "@/domain/branches/types";
import { BranchLine } from "./BranchLine";
import { useLoudnessDial } from "./useLoudnessDial";
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
  const nowTick = useAppStore((s) => s.nowTick);
  const typeFilter = useAppStore((s) => s.typeFilter);
  const statusFilter = useAppStore((s) => s.statusFilter);
  const setView = useAppStore((s) => s.setView);
  const setOperation = useAppStore((s) => s.setOperation);
  const panBy = useAppStore((s) => s.panBy);
  const returnToNow = useAppStore((s) => s.returnToNow);
  const theme = useAppStore((s) => s.theme);
  const operation = useAppStore((s) => s.operation);
  const reclaim = useAppStore((s) => s.reclaim);
  const clearReclaim = useAppStore((s) => s.clearReclaim);
  const born = useAppStore((s) => s.born);
  const clearBorn = useAppStore((s) => s.clearBorn);
  const reducedMotion = useAppStore((s) => s.reducedMotion);
  const dialLoudness = useAppStore((s) => s.dialLoudness);
  const actions = useAppStore((s) => s.actions);
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ width: 960, height: 480 });
  // When the quick tray rises over the stage as a bottom sheet, the lanes move
  // up into the space that remains — the selected line and Now stay visible
  // together, never hidden behind the panel.
  const [bottomInset, setBottomInset] = useState(0);
  const insetRef = useRef(0); // the value currently on screen (mid-tween)
  const insetTargetRef = useRef(0); // where the tween is heading
  const insetTweenRef = useRef(0);
  useEffect(() => {
    // The lanes glide up to their new place rather than jumping — an eased
    // scroll of about a third of a second. Instant when motion is reduced.
    const animateTo = (target: number) => {
      insetTargetRef.current = target;
      cancelAnimationFrame(insetTweenRef.current);
      if (reducedMotion) {
        insetRef.current = target;
        setBottomInset(target);
        return;
      }
      const from = insetRef.current;
      const t0 = performance.now();
      const duration = 300;
      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        insetRef.current = from + (target - from) * eased;
        setBottomInset(insetRef.current);
        if (p < 1) insetTweenRef.current = requestAnimationFrame(step);
      };
      insetTweenRef.current = requestAnimationFrame(step);
    };
    const measure = () => {
      let next = 0;
      const stage = stageRef.current;
      // Quick trays and focused sheets alike: whichever panel is up, the
      // thread it concerns must stay in view above it.
      const tray = document.querySelector(".quick-tray, .touch-sheet");
      if (stage && tray) {
        const stageRect = stage.getBoundingClientRect();
        const trayRect = tray.getBoundingClientRect();
        const overlapX =
          Math.min(stageRect.right, trayRect.right) - Math.max(stageRect.left, trayRect.left);
        const overlapY = Math.max(0, stageRect.bottom - trayRect.top);
        // Only the bottom sheet counts; the desktop side panel leaves Now clear.
        if (overlapX > stageRect.width * 0.55 && overlapY > 0) {
          next = Math.min(overlapY, stageRect.height - 130);
        }
      }
      if (next !== insetTargetRef.current) animateTo(next);
    };
    const raf = requestAnimationFrame(measure);
    // The tray changes size within one operation (a form becomes a confirmation,
    // a step expands): keep following it so the lanes always fit what remains.
    const tray = document.querySelector(".quick-tray, .touch-sheet");
    let ro: ResizeObserver | undefined;
    if (tray) {
      ro = new ResizeObserver(measure);
      ro.observe(tray);
      // The sheet slides up over ~0.2s; its resting position is only known
      // once that entrance finishes, so measure again then.
      tray.addEventListener("animationend", measure);
    }
    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(insetTweenRef.current);
      ro?.disconnect();
      tray?.removeEventListener("animationend", measure);
    };
  }, [operation, size, reducedMotion]);
  const [focusIndex, setFocusIndex] = useState(-1);
  const dragRef = useRef<{ x: number; moved: boolean } | null>(null);
  const pointersRef = useRef(new Set<number>());

  // Press a thread, slide the thumb up or down: its loudness dials live.
  const dial = useLoudnessDial({
    svgRef,
    onPanHandoff: (clientX) => {
      dragRef.current = { x: clientX, moved: true };
    },
    onCommit: (branchId, level) => {
      void dialLoudness(branchId, level as Loudness);
    },
  });

  // Wheel / trackpad: sideways scrolling moves through time — faster down by
  // the date labels, where a scrub is clearly about time. The lanes themselves
  // never zoom: every thread always fits the stage. Attached natively so we
  // can preventDefault (React registers wheel listeners as passive).
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      // Vertical wheel stays native: it scrolls the stage when the threads
      // have grown taller than it. Only sideways scrubbing is ours.
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const nearDates = e.clientY > rect.bottom - 56;
      panBy((e.deltaX / Math.max(1, el.clientWidth)) * (nearDates ? 4 : 1));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [panBy]);

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
  // The app's sense of the present: ticks forward every half minute, jumps
  // when the Testing controls fast-forward time.
  const now = useMemo(() => new Date(nowTick), [nowTick]);
  const layout = useMemo(
    () =>
      buildTimelineLayout(visible, {
        width: size.width,
        // Whatever space the open panel leaves is what the lanes fit into —
        // even the lowest thread stays visible above the sheet.
        height: Math.max(130, size.height - bottomInset),
        window: window_,
        compact,
        now,
      }),
    [visible, size, window_, compact, bottomInset, now],
  );

  // With many threads the canvas grows taller than the stage and scrolls.
  // Whenever its shape changes, settle the view around the main line so Now
  // is what you see first; from there you scroll to the outer lanes.
  useEffect(() => {
    const sc = scrollRef.current;
    if (!sc) return;
    const overflow = layout.height - sc.clientHeight;
    if (overflow > 0) {
      sc.scrollTop = Math.max(0, Math.min(overflow, layout.mainY - sc.clientHeight / 2));
    }
  }, [layout.height, layout.mainY]);

  // The tapped thread stays in sight: when a panel opens for it, scroll its
  // lane up into the space the panel leaves free. Runs while the inset
  // animates, so the view follows the sheet as it slides in.
  useEffect(() => {
    if (!focusedBranchId) return;
    const sc = scrollRef.current;
    if (!sc) return;
    const g = layout.geometries.find((geo) => geo.branchId === focusedBranchId);
    if (!g) return;
    const usable = Math.max(130, sc.clientHeight - bottomInset);
    const maxScroll = Math.max(0, layout.height - sc.clientHeight);
    sc.scrollTop = Math.max(0, Math.min(maxScroll, g.endY - usable / 2));
  }, [focusedBranchId, layout, bottomInset]);

  const ticks = useMemo(() => generateTicks(layout.window, now), [layout.window, now]);
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
  const today = now.toISOString().slice(0, 10);
  const span = Date.parse(layout.window.end) - Date.parse(layout.window.start);
  const restingEnd = Date.parse(today) + span / 2;
  const awayFromNow =
    Math.abs(restingEnd - Date.parse(layout.window.end)) > 0.25 * DAY ||
    Math.abs(span - 8 * DAY) > 0.75 * DAY;

  const todayX = dateToX(today, layout.window, layout.metrics.width);

  // Every decision gathers around the main line past Now — steps still ahead,
  // steps already done today (✓), and even "nothing can be done", which is a
  // decision too. Decisions of integrated lines leave with them.
  const futureItems = useMemo(() => {
    const items: { id: string; label: string; done: boolean; color: string }[] = [];
    const short = (s: string, n = 26) => (s.length > n ? s.slice(0, n - 2) + "…" : s);
    for (const a of actions) {
      const owner = branches.find((b) => b.id === a.branchesIntegrated[0]?.branchId);
      if (owner && isClosed(owner)) continue;
      const doneToday = a.completedAt?.slice(0, 10) === today;
      if (a.completedAt && !doneToday) continue;
      items.push({
        id: a.id,
        label: doneToday ? `✓ ${short(a.title)}` : short(a.title),
        done: !!doneToday,
        color: owner ? branchColor(owner, theme) : "var(--accent)",
      });
    }
    for (const b of branches) {
      if (isClosed(b) || b.leftOn !== today) continue;
      items.push({
        id: b.id,
        label: `✓ ${t("resting · {title}", { title: short(b.title, 22) })}`,
        done: true,
        color: branchColor(b, theme, "muted"),
      });
    }
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t is stable per language
  }, [actions, branches, theme, today, language]);

  // How split the present is: open lines pull apart, decisions gather them.
  const activeLines = visible.filter((b) => !isClosed(b));

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
    } else if (e.key === "n" || e.key === "N") {
      e.preventDefault();
      setOperation({ kind: "creating-branch" });
    } else if (e.key === "Home") {
      returnToNow();
    }
  }

  function onPointerDown(e: React.PointerEvent) {
    pointersRef.current.add(e.pointerId);
    // A press on a thread belongs to the loudness dial until it picks an axis.
    if (dial.onStagePointerDown(e.pointerId)) {
      dragRef.current = null;
      return;
    }
    // One finger drags through time; a second finger simply pauses the drag.
    dragRef.current = pointersRef.current.size === 1 ? { x: e.clientX, moved: false } : null;
  }
  function onPointerMove(e: React.PointerEvent) {
    if (dial.onPointerMove(e)) return;
    if (pointersRef.current.size !== 1) return;
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 6) {
      d.moved = true;
      d.x = e.clientX;
      // Dragging along the date labels scrubs faster than dragging the lanes.
      const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
      const nearDates = e.clientY > rect.bottom - 56;
      panBy((-dx / Math.max(1, layout.metrics.width)) * (nearDates ? 4 : 1));
    }
  }
  function onPointerUp(e: React.PointerEvent) {
    dial.onPointerUp(e);
    pointersRef.current.delete(e.pointerId);
    dragRef.current = null;
  }
  function onPointerCancel(e: React.PointerEvent) {
    // Taken away by the system: revert the dial, commit nothing.
    dial.onPointerCancel(e);
    pointersRef.current.delete(e.pointerId);
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
        {/* the canvas may be taller than the stage: this container scrolls it,
            while the +, help and wholeness chip stay pinned to the stage */}
        <div className="timeline-scroll" ref={scrollRef}>
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
          onPointerCancel={onPointerCancel}
          onPointerLeave={onPointerUp}
          onClickCapture={dial.onClickCapture}
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

          {/* every decision gathers around the main line past Now — a calm
              record of the day. Tapping it opens the actions panel. */}
          {futureItems.length > 0 && layout.fullWidth - layout.nowX > 40 && (
            <g
              className="action-continuation"
              aria-hidden="true"
              onClick={() => setOperation({ kind: "viewing-actions" })}
            >
              <rect
                className="action-hit"
                x={layout.nowX + 4}
                y={layout.mainY + 2}
                width={170}
                height={futureItems.length * 16 + 16}
              />
              <path
                className="action-continuation-line"
                d={`M ${layout.nowX} ${layout.mainY} L ${Math.min(
                  layout.nowX + 150,
                  layout.fullWidth - 6,
                )} ${layout.mainY}`}
              />
              {futureItems.map((it, i) => {
                const y = layout.mainY + 16 + i * 16;
                return (
                  <g key={it.id} className={it.done ? "action-done" : undefined}>
                    <circle
                      className="action-bullet"
                      cx={layout.nowX + 16}
                      cy={y - 4}
                      r={3}
                      fill={it.color}
                    />
                    <text className="action-continuation-label" x={layout.nowX + 24} y={y}>
                      {it.label}
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
                nowMs={nowTick}
                loudnessPreview={
                  dial.preview?.branchId === branch.id ? dial.preview.level : undefined
                }
                onDialPointerDown={
                  // A decision today settles the loudness too: the dial rests
                  // with the line until tomorrow (or until it reopens).
                  isClosed(branch) || decidedToday(branch, now)
                    ? undefined
                    : // The drag moves in whole levels, starting from the
                      // loudness as felt today (drift included).
                      (e) =>
                        dial.onBranchPointerDown(
                          branch.id,
                          Math.round(effectiveLoudness(branch, now)),
                          e,
                        )
                }
                focused={i === focusIndex}
                emphasizedId={top?.id}
                highlighted={branch.id === focusedBranchId}
                dimmed={!!focusedBranchId && branch.id !== focusedBranchId}
                born={!reducedMotion && born?.branchId === branch.id}
                reducedMotion={reducedMotion}
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
        </div>

        {/* while the thumb dials a thread's loudness: its name and level, live */}
        {dial.preview && (() => {
          const b = byId.get(dial.preview.branchId);
          if (!b) return null;
          const title = b.title.length > 22 ? b.title.slice(0, 20) + "…" : b.title;
          return (
            <div
              className="loudness-chip"
              ref={dial.chipRef}
              style={{
                transform: `translate(${dial.chipPos.current.x}px, ${dial.chipPos.current.y}px)`,
              }}
            >
              <span className="loudness-chip-title">{title}</span>
              <span className="loudness-chip-dots" aria-hidden="true">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span key={n} className={`loudness-dot ${n <= dial.preview!.level ? "on" : ""}`} />
                ))}
              </span>
              <span className="visually-hidden" role="status" aria-live="polite">
                {t("Loudness {level} of 5", { level: dial.preview.level })}
              </span>
            </div>
          );
        })()}

        {branches.length === 0 && (
          <div className="timeline-empty">
            <p className="prompt">{t("Your life continues on one main line.")}</p>
            <p className="hint">
              {t(
                "When something begins pulling part of your attention away from the present, add it as a thread with the + button. You can integrate it when it has given you what it carries.",
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
