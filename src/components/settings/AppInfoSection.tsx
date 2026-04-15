/**
 * App Info Section — timezone, version.
 */

import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useSettingsStore } from "@/stores/settings-store";

const AppInfoSection = () => {
  const timezone = useSettingsStore((s) => s.settings.SystemTimezone);
  const { t } = useTranslation();

  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-4 text-xs text-muted-foreground font-body">
        <div className="flex justify-between">
          <span>{t("settings.timezone")}</span>
          <span>{timezone}</span>
        </div>
        <Separator className="my-1" />
        <div className="flex justify-between">
          <span>{t("settings.version")}</span>
          <span>1.1.0</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default AppInfoSection;
