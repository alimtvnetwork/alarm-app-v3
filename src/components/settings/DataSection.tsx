/**
 * Data Settings Section — event retention, export privacy.
 */

import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSettingsStore } from "@/stores/settings-store";
import { Database } from "lucide-react";

const DataSection = () => {
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-heading">
          <Database className="h-4 w-4" />
          {t("settings.data")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Label className="font-body text-sm">{t("settings.eventRetention")}</Label>
          <Select
            value={String(settings.EventRetentionDays)}
            onValueChange={(v) => updateSettings({ EventRetentionDays: Number(v) })}
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">{t("settings.days", { count: 30 })}</SelectItem>
              <SelectItem value="60">{t("settings.days", { count: 60 })}</SelectItem>
              <SelectItem value="90">{t("settings.days", { count: 90 })}</SelectItem>
              <SelectItem value="180">{t("settings.days", { count: 180 })}</SelectItem>
              <SelectItem value="365">{t("settings.year")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between">
          <Label className="font-body text-sm">{t("settings.exportPrivacy")}</Label>
          <Switch
            checked={settings.ExportWarningDismissed}
            onCheckedChange={(v) => updateSettings({ ExportWarningDismissed: v })}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default DataSection;
