/**
 * Display Settings Section — clock format.
 */

import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSettingsStore } from "@/stores/settings-store";
import { Clock } from "lucide-react";

const DisplaySection = () => {
  const is24Hour = useSettingsStore((s) => s.settings.Is24Hour);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-heading">
          <Clock className="h-4 w-4" />
          {t("settings.display")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Label className="font-body text-sm">{t("settings.clock24h")}</Label>
          <Switch
            checked={is24Hour}
            onCheckedChange={(v) => updateSettings({ Is24Hour: v })}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default DisplaySection;
