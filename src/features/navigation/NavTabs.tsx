import { Fragment } from "react";
import { useAppStore, type View } from "@/stores/app-store";

type PageId = "timeline" | "now" | "branches" | "history" | "settings";

const PAGES: { id: PageId; label: string; icon: string; view: View }[] = [
  { id: "timeline", label: "Timeline", icon: "─╲─", view: { kind: "timeline" } },
  { id: "now", label: "Now", icon: "●", view: { kind: "now" } },
  { id: "branches", label: "Branches", icon: "≡", view: { kind: "branches" } },
  { id: "history", label: "History", icon: "◔", view: { kind: "history" } },
  { id: "settings", label: "Settings", icon: "⚙", view: { kind: "settings" } },
];

/** Which page a given view belongs to, for the active tab state. */
export function activePage(view: View): PageId {
  switch (view.kind) {
    case "now":
      return "now";
    case "branches":
    case "branch":
    case "create":
    case "recurrence":
    case "merge":
    case "waiting-setup":
      return "branches";
    case "history":
    case "merge-review":
      return "history";
    case "settings":
      return "settings";
    default:
      return "timeline";
  }
}

export function NavTabs({ variant }: { variant: "header" | "bottom" }) {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const current = activePage(view);

  // The bottom bar keeps four tabs around the docked + button;
  // Settings lives in the header on small screens.
  const pages = variant === "bottom" ? PAGES.filter((p) => p.id !== "settings") : PAGES;

  return (
    <nav
      className={variant === "header" ? "nav-tabs" : "nav-bottom"}
      aria-label="Main navigation"
    >
      {pages.map((p, i) => (
        <Fragment key={p.id}>
          {variant === "bottom" && i === pages.length / 2 && (
            <span className="nav-fab-slot" aria-hidden="true" />
          )}
          <button
            className="nav-tab"
            aria-current={current === p.id ? "page" : undefined}
            onClick={() => setView(p.view)}
          >
            {variant === "bottom" && (
              <span className="nav-icon" aria-hidden="true">
                {p.icon}
              </span>
            )}
            {p.label}
          </button>
        </Fragment>
      ))}
    </nav>
  );
}
