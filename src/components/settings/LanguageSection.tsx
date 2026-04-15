/**
 * Language Settings Section.
 */

import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSettingsStore } from "@/stores/settings-store";
import { Globe } from "lucide-react";

const LanguageSection = () => {
  const language = useSettingsStore((s) => s.settings.Language);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const { t, i18n } = useTranslation();

  const handleLanguageChange = (lang: string) => {
    updateSettings({ Language: lang });
    i18n.changeLanguage(lang);
    localStorage.setItem("alarm_app_language", lang);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-heading">
          <Globe className="h-4 w-4" />
          {t("settings.language")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Select value={language} onValueChange={handleLanguageChange}>
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
  );
};

export default LanguageSection;
