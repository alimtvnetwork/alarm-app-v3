/**
 * Settings Page — All settings organized into sections with i18n.
 */

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSettingsStore } from "@/stores/settings-store";
import AlarmDefaultsSection from "@/components/settings/AlarmDefaultsSection";
import DisplaySection from "@/components/settings/DisplaySection";
import SystemSection from "@/components/settings/SystemSection";
import LanguageSection from "@/components/settings/LanguageSection";
import DataSection from "@/components/settings/DataSection";
import ExportImportSection from "@/components/settings/ExportImportSection";
import AppInfoSection from "@/components/settings/AppInfoSection";

const Settings = () => {
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const { t } = useTranslation();

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-heading font-bold">{t("settings.title")}</h1>
      <AlarmDefaultsSection />
      <DisplaySection />
      <SystemSection />
      <LanguageSection />
      <DataSection />
      <ExportImportSection />
      <AppInfoSection />
    </div>
  );
};

export default Settings;
