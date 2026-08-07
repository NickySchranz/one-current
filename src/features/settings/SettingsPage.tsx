import { useRef, useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { THEMES } from "@/visualization/theme";
import { useT } from "@/i18n/i18n";

/** Appearance, language, comfort, and privacy sections, rendered inside More. */
export function SettingsSections() {
  const t = useT();
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const language = useAppStore((s) => s.language);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const reducedMotion = useAppStore((s) => s.reducedMotion);
  const setReducedMotion = useAppStore((s) => s.setReducedMotion);
  const exportData = useAppStore((s) => s.exportData);
  const importData = useAppStore((s) => s.importData);
  const deleteEverything = useAppStore((s) => s.deleteEverything);
  const loadExampleData = useAppStore((s) => s.loadExampleData);
  const timeSkewMs = useAppStore((s) => s.timeSkewMs);
  const fastForward = useAppStore((s) => s.fastForward);
  const resetTimeSkew = useAppStore((s) => s.resetTimeSkew);

  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function doExport() {
    const json = await exportData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `one-current-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function doImport(file: File) {
    try {
      await importData(await file.text());
      setMessage(t("Import complete."));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t("Import failed."));
    }
  }

  return (
    <>
      <h2>{t("Appearance")}</h2>
      <div className="card">
        <div className="filter-row" role="group" aria-label={t("Theme")}>
          {THEMES.map((th) => (
            <button
              key={th.id}
              className="btn"
              aria-pressed={theme === th.id}
              onClick={() => setTheme(th.id)}
            >
              <span
                className="theme-swatch"
                style={{ background: `linear-gradient(135deg, ${th.paper} 48%, ${th.accent} 52%)` }}
                aria-hidden="true"
              />
              {t(th.name)}
            </button>
          ))}
        </div>
        <p className="hint" style={{ margin: 0 }}>
          {t(THEMES.find((th) => th.id === theme)?.hint ?? "")}
        </p>
      </div>

      <h2>{t("Language")}</h2>
      <div className="card">
        <div className="filter-row" role="group" aria-label={t("Language")}>
          <button
            className="btn"
            aria-pressed={language === "en"}
            onClick={() => setLanguage("en")}
          >
            English
          </button>
          <button
            className="btn"
            aria-pressed={language === "es"}
            onClick={() => setLanguage("es")}
          >
            Español
          </button>
        </div>
        <p className="hint" style={{ margin: 0 }}>
          {t("Changes every word the app says. Your own words stay as you wrote them.")}
        </p>
      </div>

      <h2>{t("Comfort")}</h2>
      <div className="card">
        <label style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
          <input
            type="checkbox"
            style={{ width: "auto", minHeight: 0 }}
            checked={reducedMotion}
            onChange={(e) => setReducedMotion(e.target.checked)}
          />
          {t("Reduce motion (no line movement or pulsing)")}
        </label>
      </div>

      <h2>{t("Explore")}</h2>
      <div className="card">
        <p className="hint">
          {t(
            "See what a lived-in timeline looks like: nine example threads — drifting, resting, integrated — plus today's actions. You can delete them any time.",
          )}
        </p>
        <button className="btn" onClick={() => void loadExampleData()}>
          {t("Load example threads")}
        </button>
      </div>

      <h2>{t("Testing")}</h2>
      <div className="card">
        <p className="hint">
          {t(
            "Move the app's clock forward to watch how threads behave when days pass without decisions. This only affects this session — reloading returns to real time.",
          )}
        </p>
        <div className="filter-row">
          <button className="btn" onClick={() => fastForward(6 * 60 * 60 * 1000)}>
            {t("+6 hours")}
          </button>
          <button className="btn" onClick={() => fastForward(24 * 60 * 60 * 1000)}>
            {t("+1 day")}
          </button>
          <button className="btn" onClick={() => fastForward(3 * 24 * 60 * 60 * 1000)}>
            {t("+3 days")}
          </button>
        </div>
        {timeSkewMs > 0 && (
          <div className="filter-row">
            <span role="status">
              {t("The app is living {days} day(s) ahead.", {
                days: (timeSkewMs / (24 * 60 * 60 * 1000)).toFixed(1),
              })}
            </span>
            <button className="btn" onClick={resetTimeSkew}>
              {t("Back to real time")}
            </button>
          </div>
        )}
      </div>

      <h2>{t("Privacy")}</h2>
      <div className="card">
        <p className="hint">
          {t(
            "Everything you write stays in this browser, stored locally on your device. Nothing is sent anywhere. Export a copy before switching devices.",
          )}
        </p>
        <div className="filter-row">
          <button className="btn" onClick={doExport}>{t("Export everything")}</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>{t("Import")}</button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="visually-hidden"
            aria-label={t("Import a One Current export file")}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void doImport(f);
              e.target.value = "";
            }}
          />
          {!confirmingDelete ? (
            <button className="btn btn-danger" onClick={() => setConfirmingDelete(true)}>
              {t("Delete everything")}
            </button>
          ) : (
            <>
              <span>
                {t(
                  "Delete all threads, everything integrated, and your whole history? This cannot be undone.",
                )}
              </span>
              <button
                className="btn btn-danger"
                onClick={async () => {
                  await deleteEverything();
                  setConfirmingDelete(false);
                  setMessage(t("All data deleted."));
                }}
              >
                {t("Yes, delete")}
              </button>
              <button className="btn" onClick={() => setConfirmingDelete(false)}>
                {t("Keep it")}
              </button>
            </>
          )}
        </div>
        {message && <p role="status">{message}</p>}
      </div>
    </>
  );
}
