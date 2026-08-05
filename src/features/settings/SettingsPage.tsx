import { useRef, useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { THEMES } from "@/visualization/theme";

/** Appearance, comfort, and privacy controls. */
export function SettingsPage() {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const reducedMotion = useAppStore((s) => s.reducedMotion);
  const setReducedMotion = useAppStore((s) => s.setReducedMotion);
  const exportData = useAppStore((s) => s.exportData);
  const importData = useAppStore((s) => s.importData);
  const deleteEverything = useAppStore((s) => s.deleteEverything);
  const loadExampleData = useAppStore((s) => s.loadExampleData);

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
      setMessage("Import complete.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Import failed.");
    }
  }

  return (
    <div className="panel">
      <h1>Settings</h1>

      <h2>Appearance</h2>
      <div className="card">
        <div className="filter-row" role="group" aria-label="Theme">
          {THEMES.map((t) => (
            <button
              key={t.id}
              className="btn"
              aria-pressed={theme === t.id}
              onClick={() => setTheme(t.id)}
            >
              <span
                className="theme-swatch"
                style={{ background: `linear-gradient(135deg, ${t.paper} 48%, ${t.accent} 52%)` }}
                aria-hidden="true"
              />
              {t.name}
            </button>
          ))}
        </div>
        <p className="hint" style={{ margin: 0 }}>
          {THEMES.find((t) => t.id === theme)?.hint}
        </p>
      </div>

      <h2>Comfort</h2>
      <div className="card">
        <label style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
          <input
            type="checkbox"
            style={{ width: "auto", minHeight: 0 }}
            checked={reducedMotion}
            onChange={(e) => setReducedMotion(e.target.checked)}
          />
          Reduce motion (no line movement or pulsing)
        </label>
      </div>

      <h2>Explore</h2>
      <div className="card">
        <p className="hint">
          See what a lived-in timeline looks like: nine example branches — drifting, waiting,
          resting, merged — plus today's actions. You can delete them any time.
        </p>
        <button className="btn" onClick={() => void loadExampleData()}>
          Load example branches
        </button>
      </div>

      <h2>Privacy</h2>
      <div className="card">
        <p className="hint">
          Everything you write stays in this browser, stored locally on your device. Nothing is
          sent anywhere. Export a copy before switching devices.
        </p>
        <div className="filter-row">
          <button className="btn" onClick={doExport}>Export everything</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>Import</button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="visually-hidden"
            aria-label="Import a One Current export file"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void doImport(f);
              e.target.value = "";
            }}
          />
          {!confirmingDelete ? (
            <button className="btn btn-danger" onClick={() => setConfirmingDelete(true)}>
              Delete everything
            </button>
          ) : (
            <>
              <span>Delete all branches, merges, and history permanently?</span>
              <button
                className="btn btn-danger"
                onClick={async () => {
                  await deleteEverything();
                  setConfirmingDelete(false);
                  setMessage("All data deleted.");
                }}
              >
                Yes, delete
              </button>
              <button className="btn" onClick={() => setConfirmingDelete(false)}>Keep it</button>
            </>
          )}
        </div>
        {message && <p role="status">{message}</p>}
      </div>
    </div>
  );
}
