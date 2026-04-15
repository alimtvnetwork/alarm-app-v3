/**
 * System Settings Section — auto-launch, minimize to tray.
 */

import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSettingsStore } from "@/stores/settings-store";
import { Laptop } from "lucide-react";

const SystemSection = () => {
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-heading">
          <Laptop className="h-4 w-4" />
          {t("settings.system")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Label className="font-body text-sm">{t("settings.autoLaunch")}</Label>
          <Switch
            checked={settings.AutoLaunch}
            onCheckedChange={(v) => updateSettings({ AutoLaunch: v })}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label className="font-body text-sm">{t("settings.minimizeToTray")}</Label>
          <Switch
            checked={settings.MinimizeToTray}
            onCheckedChange={(v) => updateSettings({ MinimizeToTray: v })}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default SystemSection;
