import { useEffect } from "react";
import { useAppStore } from "./stores/app-store";
import { PrimaryNavigation } from "./features/navigation/PrimaryNavigation";
import { Logo } from "./features/navigation/Logo";
import { LifeTimeline } from "./features/life-timeline/LifeTimeline";
import { OperationTray } from "./features/timeline-shell/OperationTray";
import { HistoryView } from "./features/history/HistoryView";
import { MergeReview } from "./features/history/MergeReview";
import { MorePage } from "./features/more/MorePage";

export default function App() {
  const ready = useAppStore((s) => s.ready);
  const view = useAppStore((s) => s.view);
  const theme = useAppStore((s) => s.theme);
  const reducedMotion = useAppStore((s) => s.reducedMotion);
  const init = useAppStore((s) => s.init);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.reducedMotion = String(reducedMotion);
  }, [theme, reducedMotion]);

  if (!ready) {
    return <div className="app" aria-busy="true" />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <Logo />
        <span className="app-title">One Current</span>
        <PrimaryNavigation variant="header" />
      </header>
      <main className="app-main">
        {view.kind === "now" && (
          <div className="now-workspace">
            <LifeTimeline />
            <OperationTray />
          </div>
        )}
        {view.kind === "history" && <HistoryView />}
        {view.kind === "merge-review" && <MergeReview mergeId={view.mergeId} />}
        {view.kind === "more" && <MorePage />}
      </main>
      <PrimaryNavigation variant="bottom" />
    </div>
  );
}
