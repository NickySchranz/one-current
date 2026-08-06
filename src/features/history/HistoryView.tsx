import { useRef, useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { isClosed } from "@/domain/branches/logic";
import { energySplit, integrationSummary } from "@/domain/feelings/logic";
import { useT } from "@/i18n/i18n";

const DAY = 24 * 60 * 60 * 1000;

type HistoryFilter = "all" | "branches" | "actions" | "merges" | "recurring";

const FILTERS: { id: HistoryFilter; label: string }[] = [
  { id: "all", label: "Everything" },
  { id: "branches", label: "Threads" },
  { id: "actions", label: "Actions" },
  { id: "merges", label: "Integrated" },
  { id: "recurring", label: "Recurring" },
];

/** English display phrases for merge result statuses (keys stay untouched in data). */
const STATUS_PHRASES: Record<string, string> = {
  merged: "integrated",
  "partly merged": "partly integrated",
};

function dayIso(offset: number): string {
  return new Date(Date.now() + offset * DAY).toISOString().slice(0, 10);
}

/** Recent days, threads integrated, recurring patterns, and past merges. */
export function HistoryView() {
  const t = useT();
  const language = useAppStore((s) => s.language);
  const branches = useAppStore((s) => s.branches);
  const merges = useAppStore((s) => s.merges);
  const setView = useAppStore((s) => s.setView);
  // 0 = today; step back as far as you like.
  const [dayOffset, setDayOffset] = useState(0);
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const swipeX = useRef<number | null>(null);
  const show = (f: HistoryFilter) => filter === "all" || filter === f;
  const locale = language === "es" ? "es" : undefined;

  const mergedBranches = branches.filter(
    (b) => isClosed(b) || b.status === "partly-integrated",
  );
  const recurring = branches.filter((b) => b.recurrenceCount > 0);

  const day = dayIso(dayOffset);
  const label =
    dayOffset === 0
      ? t("Today")
      : dayOffset === -1
        ? t("Yesterday")
        : new Date(Date.now() + dayOffset * DAY).toLocaleDateString(locale, {
            weekday: "short",
            day: "numeric",
            month: "short",
          });
  // The record a past day leaves behind: steps, moments, beginnings, endings.
  const dayActions = useAppStore((s) => s.actions).filter(
    (a) => a.createdAt.slice(0, 10) === day,
  );
  const dayMoments = branches.flatMap((b) =>
    b.commits.filter((m) => m.date === day).map((m) => ({ branch: b, moment: m })),
  );
  const dayStarted = branches.filter((b) => b.firstCreatedAt.slice(0, 10) === day);
  const dayClosed = branches.filter((b) => b.mergeDate === day);

  // Where the day's energy went, and which feelings were held or returned.
  // Every decision — an action or "nothing can be done" — brings some home.
  const dayDate = new Date(day + "T12:00:00");
  const energy = energySplit(branches, dayDate);
  const feelings = integrationSummary(branches, dayDate);

  return (
    <div className="panel">
      {/* The day itself is the page header: swipe or step through the days here. */}
      <div
        className="day-swipe"
        onTouchStart={(e) => {
          swipeX.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          const start = swipeX.current;
          swipeX.current = null;
          const end = e.changedTouches[0]?.clientX;
          if (start == null || end == null) return;
          const delta = end - start;
          if (Math.abs(delta) < 48) return;
          // Pull the days like a strip of paper: right reveals earlier days.
          if (delta > 0) setDayOffset((o) => o - 1);
          else setDayOffset((o) => Math.min(0, o + 1));
        }}
      >
        <div className="day-pager" role="group" aria-label={t("Recent days")}>
          <button
            className="btn btn-quiet day-pager-arrow"
            aria-label={t("Previous day")}
            onClick={() => setDayOffset((o) => o - 1)}
          >
            ‹
          </button>
          <h1 className="day-pager-label">{label}</h1>
          <button
            className="btn btn-quiet day-pager-arrow"
            aria-label={t("Next day")}
            disabled={dayOffset >= 0}
            onClick={() => setDayOffset((o) => Math.min(0, o + 1))}
          >
            ›
          </button>
        </div>
      </div>

      <div className="card sunken energy-review">
        <h3 className="day-section-title">{t("Energy · feelings")}</h3>
        <div
          className="energy-track"
          role="img"
          aria-label={t(
            "About {pct} percent of your energy moves with your main line this day.",
            { pct: Math.round(energy.mainShare * 100) },
          )}
        >
          <span className="energy-main" style={{ width: `${energy.mainShare * 100}%` }} />
          {energy.parts.map((p) => (
            <span
              key={p.branch.id}
              className="energy-part"
              style={{ width: `${p.share * 100}%` }}
              title={p.branch.title}
            />
          ))}
        </div>
        <p className="hint" style={{ margin: 0 }}>
          {energy.parts.length === 0
            ? t("All of you moves with your main line.")
            : t(
                energy.parts.length === 1
                  ? "1 open line is drawing on you. Every decision returns some of that energy."
                  : "{n} open lines are drawing on you. Every decision returns some of that energy.",
                { n: energy.parts.length },
              )}
        </p>
        {feelings.returnedToday.length > 0 && (
          <p className="hint" style={{ margin: 0 }}>
            {t("Returned by this day's decisions: {list}", {
              list: feelings.returnedToday.map((f) => t(f)).join(", "),
            })}
          </p>
        )}
        {feelings.held.map((h) => (
          <p key={h.branch.id} className="hint" style={{ margin: 0 }}>
            {t("“{title}” still holds {list}", {
              title: h.branch.title,
              list: h.feelings.map((f) => t(f)).join(", "),
            })}
          </p>
        ))}
      </div>

      <div className="tag-row" role="group" aria-label={t("What to review")}>
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className="chip"
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
          >
            {t(f.label)}
          </button>
        ))}
      </div>

      {show("actions") && (
      <div>
      {dayActions.length > 0 && (
        <>
          <h3 className="day-section-title">{t("Steps you decided on")}</h3>
          {dayActions.map((a) => (
            <div key={a.id} className="card sunken">
              <strong>{a.title}</strong>
              <p className="hint" style={{ margin: 0 }}>
                {a.branchesIntegrated[0]?.branchTitle
                  ? t("toward “{title}”", { title: a.branchesIntegrated[0].branchTitle })
                  : t("on your main line")}
                {a.durationMinutes
                  ? ` · ${t("about {n} min", { n: a.durationMinutes })}`
                  : ""}
              </p>
            </div>
          ))}
        </>
      )}
      {dayMoments.map(({ branch: b, moment: m }) => (
        <div key={m.id} className="card sunken">
          <strong>{m.title}</strong>
          <p className="hint" style={{ margin: 0 }}>
            {t("a moment on “{title}”", { title: b.title })}
          </p>
        </div>
      ))}
      {dayClosed.map((b) => (
        <div key={b.id} className="card sunken">
          <strong>{b.title}</strong>
          <p className="hint" style={{ margin: 0 }}>
            {b.status === "converted-to-project"
              ? t("became real work and left your head")
              : t("folded back into your one line")}
          </p>
        </div>
      ))}
      {dayStarted.map((b) => (
        <div key={b.id} className="card sunken">
          <strong>{b.title}</strong>
          <p className="hint" style={{ margin: 0 }}>
            {t("began pulling on you this day")}
          </p>
        </div>
      ))}
      {dayActions.length === 0 &&
        dayMoments.length === 0 &&
        dayClosed.length === 0 &&
        dayStarted.length === 0 && (
          <p className="calm-note">{t("Nothing was recorded on this day. It simply passed.")}</p>
        )}
      </div>
      )}

      {show("branches") && (
      <>
      <h2>{t("Integrated threads")}</h2>
      {mergedBranches.length === 0 ? (
        <p className="hint">
          {t("Nothing integrated yet. Threads you integrate stay visible here and on the timeline.")}
        </p>
      ) : (
        mergedBranches.map((b) => (
          <div key={b.id} className="card">
            <strong>{b.title}</strong>
            <p className="hint" style={{ margin: 0 }}>
              {t("Began {date}", { date: b.forkLabel ?? b.forkDate })}
              {b.mergeDate
                ? ` · ${t("integrated {date}", { date: b.mergeDate })}`
                : ` · ${t("partly integrated")}`}
              {b.storedQualities.length > 0
                ? ` · ${t("reclaimed: {list}", { list: b.storedQualities.join(", ") })}`
                : ""}
            </p>
            {b.mergeIds.length > 0 && (
              <button
                className="btn btn-quiet"
                onClick={() =>
                  setView({ kind: "merge-review", mergeId: b.mergeIds[b.mergeIds.length - 1] })
                }
              >
                {t("What was integrated")}
              </button>
            )}
          </div>
        ))
      )}
      </>
      )}

      {show("recurring") && recurring.length > 0 && (
        <>
          <h2>{t("Patterns")}</h2>
          <p className="hint">
            {t(
              "Threads that returned. Returning does not undo integrating something — it usually points at a need that keeps asking.",
            )}
          </p>
          {recurring.map((b) => (
            <div key={b.id} className="card sunken">
              <strong>{b.title}</strong>
              <p className="hint" style={{ margin: 0 }}>
                {t(b.recurrenceCount === 1 ? "Returned 1 time" : "Returned {n} times", {
                  n: b.recurrenceCount,
                })}{" "}
                ·{" "}
                {b.unmetNeeds.length > 0
                  ? t("needs: {list}", { list: b.unmetNeeds.join(", ") })
                  : t("no needs recorded")}
              </p>
            </div>
          ))}
        </>
      )}

      {show("merges") && (
      <>
      <h2>{t("Everything integrated")}</h2>
      {merges.length === 0 ? (
        <p className="hint">{t("Nothing has been integrated yet.")}</p>
      ) : (
        [...merges]
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .map((m) => (
            <button
              key={m.id}
              className="branch-chip"
              onClick={() => setView({ kind: "merge-review", mergeId: m.id })}
            >
              <div>
                <strong>{new Date(m.createdAt).toLocaleDateString(locale)}</strong>
                <p className="hint" style={{ margin: 0 }}>
                  {t(m.branchIds.length === 1 ? "1 thread" : "{n} threads", {
                    n: m.branchIds.length,
                  })}{" "}
                  ·{" "}
                  {t(
                    STATUS_PHRASES[m.resultStatus.replace(/-/g, " ")] ??
                      m.resultStatus.replace(/-/g, " "),
                  )}
                  {m.reclaimedQualities.length > 0
                    ? ` · ${t("reclaimed {list}", { list: m.reclaimedQualities.join(", ") })}`
                    : ""}
                </p>
              </div>
            </button>
          ))
      )}
      </>
      )}
    </div>
  );
}
