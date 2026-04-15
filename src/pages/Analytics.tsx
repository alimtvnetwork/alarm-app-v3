/**
 * Analytics Page — Alarm history charts, snooze trends, dismiss ratio, streak, CSV export.
 * Composed from extracted chart components and data hook.
 */

import { useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import * as ipc from "@/lib/ipc-adapter";
import { useDerivedAnalytics } from "@/hooks/useDerivedAnalytics";
import StatCard from "@/components/analytics/StatCard";
import HistoryChart from "@/components/analytics/HistoryChart";
import SnoozeChart from "@/components/analytics/SnoozeChart";
import BreakdownChart from "@/components/analytics/BreakdownChart";

const CSV_HEADERS = ["AlarmId", "Type", "FiredAt", "SnoozeCount", "ChallengeSolveTimeSec"];

async function buildCsvContent(): Promise<string | null> {
  const events = await ipc.listAlarmEvents();
  if (events.length === 0) return null;
  const rows = events.map((e) =>
    [e.AlarmId, e.Type, e.FiredAt, e.SnoozeCount, e.ChallengeSolveTimeSec ?? ""].join(",")
  );
  return [CSV_HEADERS.join(","), ...rows].join("\n");
}

function downloadCsv(content: string): void {
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `alarm-history-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

const Analytics = () => {
  const { t } = useTranslation();
  const { dailyData, snoozeTrend, totalFired, totalSnoozed, avgSolveTime, streak, pieData } =
    useDerivedAnalytics();

  const exportCsv = useCallback(async () => {
    const csv = await buildCsvContent();
    if (csv) downloadCsv(csv);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-heading font-bold">{t("analytics.title")}</h1>
        <Button variant="outline" size="sm" onClick={exportCsv} className="gap-1.5">
          <Download className="h-4 w-4" />
          {t("analytics.exportCsv")}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatCard label={t("analytics.totalFired")} value={totalFired} />
        <StatCard label={t("analytics.snoozed")} value={totalSnoozed} />
        <StatCard label={t("analytics.streak")} value={`${streak}d`} />
      </div>

      {avgSolveTime > 0 && (
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <span className="text-sm text-muted-foreground font-body">{t("analytics.avgChallengeTime")}</span>
            <span className="font-heading font-semibold">{avgSolveTime.toFixed(1)}s</span>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="history">
        <TabsList className="w-full">
          <TabsTrigger value="history" className="flex-1">{t("analytics.history")}</TabsTrigger>
          <TabsTrigger value="snooze" className="flex-1">{t("analytics.snoozeTrend")}</TabsTrigger>
          <TabsTrigger value="breakdown" className="flex-1">{t("analytics.breakdown")}</TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          <HistoryChart dailyData={dailyData} />
        </TabsContent>

        <TabsContent value="snooze">
          <SnoozeChart snoozeTrend={snoozeTrend} />
        </TabsContent>

        <TabsContent value="breakdown">
          <BreakdownChart pieData={pieData} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics;
