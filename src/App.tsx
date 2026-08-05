import { useEffect } from "react";
import { useAppStore } from "./stores/app-store";
import { NavTabs } from "./features/navigation/NavTabs";
import { Logo } from "./features/navigation/Logo";
import { LifeTimeline } from "./features/life-timeline/LifeTimeline";
import { CreateBranch } from "./features/branch-creation/CreateBranch";
import { RecurrenceCheck } from "./features/branch-creation/RecurrenceCheck";
import { BranchView } from "./features/branch-inspection/BranchView";
import { MergeWizard } from "./features/branch-merge/MergeWizard";
import { NowView } from "./features/present-inputs/NowView";
import { WaitingSetup } from "./features/waiting-branches/WaitingSetup";
import { HistoryView } from "./features/history/HistoryView";
import { MergeReview } from "./features/history/MergeReview";
import { BranchListPage } from "./features/branch-list/BranchListPage";
import { SettingsPage } from "./features/settings/SettingsPage";

export default function App() {
  const ready = useAppStore((s) => s.ready);
  const view = useAppStore((s) => s.view);
  const theme = useAppStore((s) => s.theme);
  const reducedMotion = useAppStore((s) => s.reducedMotion);
  const init = useAppStore((s) => s.init);
  const setView = useAppStore((s) => s.setView);

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
        <NavTabs variant="header" />
        <button
          className="btn btn-quiet header-settings"
          aria-label="Settings"
          aria-current={view.kind === "settings" ? "page" : undefined}
          onClick={() => setView({ kind: "settings" })}
        >
          ⚙
        </button>
      </header>
      <main className="app-main">
        {(view.kind === "timeline" || view.kind === "touch") && <LifeTimeline />}
        {view.kind === "create" && <CreateBranch />}
        {view.kind === "recurrence" && <RecurrenceCheck view={view} />}
        {view.kind === "branch" && <BranchView view={view} />}
        {view.kind === "merge" && <MergeWizard branchIds={view.branchIds} />}
        {view.kind === "now" && <NowView />}
        {view.kind === "waiting-setup" && <WaitingSetup branchId={view.branchId} />}
        {view.kind === "history" && <HistoryView />}
        {view.kind === "merge-review" && <MergeReview mergeId={view.mergeId} />}
        {view.kind === "branches" && <BranchListPage />}
        {view.kind === "settings" && <SettingsPage />}
      </main>
      {view.kind !== "create" && view.kind !== "touch" && (
        <button
          className="fab"
          aria-label="New branch"
          title="New branch"
          onClick={() => setView({ kind: "create" })}
        >
          +
        </button>
      )}
      <NavTabs variant="bottom" />
    </div>
  );
}
