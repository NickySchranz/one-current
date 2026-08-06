import { useAppStore, type View } from "@/stores/app-store";
import { useT } from "@/i18n/i18n";

type PageId = "now" | "history" | "more";

const PAGES: { id: PageId; label: string; icon: string; view: View }[] = [
  { id: "now", label: "Now", icon: "●", view: { kind: "now" } },
  { id: "history", label: "History", icon: "◔", view: { kind: "history" } },
  { id: "more", label: "More", icon: "≡", view: { kind: "more" } },
];

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
 * Three destinations. Now is where I work; History is where I review;
 * More holds everything else.
 */
export function PrimaryNavigation({ variant }: { variant: "header" | "bottom" }) {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const current = activePage(view);
  const t = useT();

  return (
    <nav
      className={variant === "header" ? "nav-tabs" : "nav-bottom"}
      aria-label={t("Main navigation")}
    >
      {PAGES.map((p) => (
        <button
          key={p.id}
          className="nav-tab"
          aria-current={current === p.id ? "page" : undefined}
          onClick={() => setView(p.view)}
        >
          {variant === "bottom" && (
            <span className="nav-icon" aria-hidden="true">
              {p.icon}
            </span>
          )}
          {t(p.label)}
        </button>
      ))}
    </nav>
  );
}
