/**
 * Settings Page — All settings organized into sections with i18n.
 */

import { useEffect } from "react";
import ExportImportSection from "@/components/settings/ExportImportSection";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSettingsStore } from "@/stores/settings-store";
import {
  Clock,
  Volume2,
  Bell,
  Globe,
  Laptop,
  Database,
} from "lucide-react";

const Settings = () => {
  const settings = useSettingsStore((s) => s.settings);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const { t, i18n } = useTranslation();

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLanguageChange = (lang: string) => {
    updateSettings({ Language: lang });
    i18n.changeLanguage(lang);
    localStorage.setItem("alarm_app_language", lang);
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-heading font-bold">{t("settings.title")}</h1>

      {/* Alarm Defaults */}
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

      {/* Display */}
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
              checked={settings.Is24Hour}
              onCheckedChange={(v) => updateSettings({ Is24Hour: v })}
            />
          </div>
        </CardContent>
      </Card>

      {/* System */}
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

      {/* Language */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-heading">
            <Globe className="h-4 w-4" />
            {t("settings.language")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={settings.Language}
            onValueChange={handleLanguageChange}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">{t("settings.english")}</SelectItem>
              <SelectItem value="ms">{t("settings.bahasaMelayu")}</SelectItem>
              <SelectItem value="zh">{t("settings.chinese")}</SelectItem>
              <SelectItem value="ja">{t("settings.japanese")}</SelectItem>
              <SelectItem value="bn">{t("settings.bangla")}</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Data */}
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

      {/* Export / Import */}
      <ExportImportSection />

      {/* Info */}
      <Card>
        <CardContent className="flex flex-col gap-1 p-4 text-xs text-muted-foreground font-body">
          <div className="flex justify-between">
            <span>{t("settings.timezone")}</span>
            <span>{settings.SystemTimezone}</span>
          </div>
          <Separator className="my-1" />
          <div className="flex justify-between">
            <span>{t("settings.version")}</span>
            <span>1.0.0</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
