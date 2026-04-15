/**
 * Alarm Defaults Settings Section — snooze, auto-dismiss, sound, gradual volume.
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
import { Bell, Volume2 } from "lucide-react";

const AlarmDefaultsSection = () => {
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-heading">
          <Bell className="h-4 w-4" />
          {t("settings.alarmDefaults")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Label className="font-body text-sm">{t("settings.snoozeDuration")}</Label>
          <Select
            value={String(settings.DefaultSnoozeDurationMin)}
            onValueChange={(v) => updateSettings({ DefaultSnoozeDurationMin: Number(v) })}
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 3, 5, 10, 15, 20, 30].map((n) => (
                <SelectItem key={n} value={String(n)}>{t("settings.min", { count: n })}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <Label className="font-body text-sm">{t("settings.maxSnoozes")}</Label>
          <Select
            value={String(settings.DefaultMaxSnoozeCount)}
            onValueChange={(v) => updateSettings({ DefaultMaxSnoozeCount: Number(v) })}
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[0, 1, 2, 3, 5, 10].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n === 0 ? t("settings.noneOption") : String(n)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <Label className="font-body text-sm">{t("settings.autoDismiss")}</Label>
          <Select
            value={String(settings.AutoDismissMin)}
            onValueChange={(v) => updateSettings({ AutoDismissMin: Number(v) })}
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">{t("settings.manual")}</SelectItem>
              {[1, 5, 10, 15, 30, 60].map((n) => (
                <SelectItem key={n} value={String(n)}>{t("settings.min", { count: n })}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-muted-foreground" />
            <Label className="font-body text-sm">{t("settings.defaultSound")}</Label>
          </div>
          <Select
            value={settings.DefaultSound}
            onValueChange={(v) => updateSettings({ DefaultSound: v })}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="classic-beep">{t("alarmForm.classicBeep")}</SelectItem>
              <SelectItem value="gentle-chime">{t("alarmForm.gentleChime")}</SelectItem>
              <SelectItem value="nature-birds">{t("alarmForm.birds")}</SelectItem>
              <SelectItem value="digital-pulse">{t("alarmForm.digitalPulse")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <Label className="font-body text-sm">{t("settings.gradualVolume")}</Label>
          <Switch
            checked={settings.IsGradualVolumeEnabled}
            onCheckedChange={(v) => updateSettings({ IsGradualVolumeEnabled: v })}
          />
        </div>

        {settings.IsGradualVolumeEnabled && (
          <div className="flex items-center justify-between pl-4">
            <Label className="font-body text-xs text-muted-foreground">{t("settings.duration")}</Label>
            <Select
              value={String(settings.GradualVolumeDurationSec)}
              onValueChange={(v) => updateSettings({ GradualVolumeDurationSec: Number(v) })}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15s</SelectItem>
                <SelectItem value="30">30s</SelectItem>
                <SelectItem value="60">60s</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AlarmDefaultsSection;
