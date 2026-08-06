import { SettingsSections } from "@/features/settings/SettingsPage";
import { useT } from "@/i18n/i18n";

/** Everything that is not working (Now) or reviewing (History). */
export function MorePage() {
  const t = useT();
  return (
    <div className="panel">
      <h1>{t("More")}</h1>
      <SettingsSections />
      <h2>{t("About")}</h2>
      <div className="card">
        <p className="hint" style={{ margin: 0 }}>
          <a href="about/index.html">{t("What One Current is, and how it works")}</a>
        </p>
      </div>
    </div>
  );
}
