import { useAppStore, type View } from "@/stores/app-store";
import { useT } from "@/i18n/i18n";

type PageId = "now" | "history" | "more";

/** Which destination a given view belongs to, for the active tab state. */
export function activePage(view: View): PageId {
  switch (view.kind) {
    case "history":
    case "merge-review":
      return "history";
    case "more":
      return "more";
    default:
      return "now";
  }
}

/**
 * The destinations. Now is where I work; Actions is what I decided to do;
 * History is where I review; More holds everything else. On touch, the round +
 * sits in the middle of the bar, half a step above it.
 */
export function PrimaryNavigation({ variant }: { variant: "header" | "bottom" }) {
  const view = useAppStore((s) => s.view);
  const operation = useAppStore((s) => s.operation);
  const setView = useAppStore((s) => s.setView);
  const setOperation = useAppStore((s) => s.setOperation);
  const current = activePage(view);
  const viewingActions = current === "now" && operation.kind === "viewing-actions";
  const t = useT();

  const tab = (
    id: string,
    label: string,
    icon: string,
    active: boolean,
    onClick: () => void,
  ) => (
    <button
      key={id}
      className="nav-tab"
      aria-current={active ? "page" : undefined}
      onClick={onClick}
    >
      {variant === "bottom" && (
        <span className="nav-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      {t(label)}
    </button>
  );

  const nowTab = tab("now", "Now", "●", current === "now" && !viewingActions, () =>
    setView({ kind: "now" }),
  );
  const actionsTab = tab("actions", "Actions", "→", viewingActions, () =>
    setOperation({ kind: "viewing-actions" }),
  );
  const historyTab = tab("history", "History", "◔", current === "history", () =>
    setView({ kind: "history" }),
  );
  const moreTab = tab("more", "More", "≡", current === "more", () =>
    setView({ kind: "more" }),
  );

  return (
    <nav
      className={variant === "header" ? "nav-tabs" : "nav-bottom"}
      aria-label={t("Main navigation")}
    >
      {nowTab}
      {actionsTab}
      {variant === "bottom" && (
        <button
          className="nav-plus"
          aria-label={t("New thread")}
          onClick={() => setOperation({ kind: "creating-branch" })}
        >
          +
        </button>
      )}
      {historyTab}
      {moreTab}
    </nav>
  );
}
