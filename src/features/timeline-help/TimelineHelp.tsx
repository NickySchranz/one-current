import { useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/i18n";

/** The legend and keyboard map, folded away until asked for. */
export function TimelineHelp() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const t = useT();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);

  return (
    <div className="timeline-help" ref={rootRef}>
      <button
        className="timeline-info-btn"
        aria-label={t("Help")}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        i
      </button>
      {open && (
        <div className="timeline-help-panel" role="region" aria-label={t("Reading the timeline")}>
          <p className="hint" style={{ margin: 0 }}>
            <strong>{t("Reading the lines")}</strong>
            <br />
            {t(
              "solid = active · curved back = integrated · thicker = stronger pull · faint ✓ = decided today",
            )}
          </p>
          <p className="hint" style={{ margin: 0 }}>
            <strong>{t("Moving around")}</strong>
            <br />
            {t("drag or scroll sideways = move through time · along the dates = move faster")}
          </p>
        </div>
      )}
    </div>
  );
}
