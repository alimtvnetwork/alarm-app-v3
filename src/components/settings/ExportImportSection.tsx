/**
 * ExportImportSection — Export alarms as JSON/CSV, import from JSON with merge/replace.
 * Shows privacy warning dialog before first export.
 */

import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, Upload, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useSettingsStore } from "@/stores/settings-store";
import { ExportFormat, ImportMode } from "@/types/alarm";
import { exportAlarms, importAlarmsFromJson } from "@/lib/export-import";
import { useAlarmStore } from "@/stores/alarm-store";

const ExportImportSection = () => {
  const { t } = useTranslation();
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const loadAlarms = useAlarmStore((s) => s.loadAlarms);

  const [exportFormat, setExportFormat] = useState<ExportFormat>(ExportFormat.Json);
  const [importMode, setImportMode] = useState<ImportMode>(ImportMode.Merge);
  const [showPrivacyWarning, setShowPrivacyWarning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    if (!settings.ExportWarningDismissed) {
      setShowPrivacyWarning(true);
      return;
    }
    doExport();
  };

  const doExport = async () => {
    await exportAlarms(exportFormat);
    toast.success(t("export.exportBtn") + " ✓");
  };

  const handlePrivacyConfirm = () => {
    updateSettings({ ExportWarningDismissed: true });
    setShowPrivacyWarning(false);
    doExport();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = event.target?.result as string;
        const result = await importAlarmsFromJson(json, importMode);
        loadAlarms();
        toast.success(
          `${t("export.importBtn")}: ${result.imported} imported, ${result.skipped} skipped`
        );
      } catch (err) {
        toast.error("Import failed: invalid JSON file");
      }
    };
    reader.readAsText(file);

    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-heading">
            <Download className="h-4 w-4" />
            {t("export.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* Export */}
          <div className="flex items-center gap-2">
            <Select
              value={exportFormat}
              onValueChange={(v) => setExportFormat(v as ExportFormat)}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ExportFormat.Json}>JSON</SelectItem>
                <SelectItem value={ExportFormat.Csv}>CSV</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleExport} variant="outline" className="flex-1 gap-2">
              <Download className="h-4 w-4" />
              {t("export.exportBtn")}
            </Button>
          </div>

          {/* Import */}
          <div className="flex items-center gap-2">
            <Select
              value={importMode}
              onValueChange={(v) => setImportMode(v as ImportMode)}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ImportMode.Merge}>{t("export.mergeMode")}</SelectItem>
                <SelectItem value={ImportMode.Replace}>{t("export.replaceMode")}</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleImportClick} variant="outline" className="flex-1 gap-2">
              <Upload className="h-4 w-4" />
              {t("export.importBtn")}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>

      {/* Privacy Warning Dialog */}
      <AlertDialog open={showPrivacyWarning} onOpenChange={setShowPrivacyWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 font-heading">
              <AlertTriangle className="h-5 w-5 text-alarm-snooze" />
              Privacy Warning
            </AlertDialogTitle>
            <AlertDialogDescription className="font-body">
              Exported files contain your alarm labels, schedules, and settings.
              Be careful when sharing these files as they may contain personal information.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePrivacyConfirm}>
              Continue Export
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ExportImportSection;
