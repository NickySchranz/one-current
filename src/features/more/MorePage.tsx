import { SettingsSections } from "@/features/settings/SettingsPage";
import { useT } from "@/i18n/i18n";

/** Everything that is not working (Now) or reviewing (History). */
export function MorePage() {
  const t = useT();
  return (
    <div className="panel">
      <h1>{t("More")}</h1>
      <SettingsSections />
    </div>
  );
}
