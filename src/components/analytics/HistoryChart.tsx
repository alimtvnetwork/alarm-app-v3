/**
 * HistoryChart — Donut ring chart showing daily alarm event totals
 * with center stat and color-coded legend.
 */

import {
  PieChart, Pie, Cell, ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--snooze))",
  "hsl(var(--dismiss))",
  "hsl(var(--destructive))",
];

const LABELS = ["Fired", "Snoozed", "Dismissed", "Missed"];

interface HistoryChartProps {
  dailyData: { date: string; fired: number; snoozed: number; dismissed: number; missed: number }[];
}

const HistoryChart = ({ dailyData }: HistoryChartProps) => {
  const { t } = useTranslation();

  // Aggregate totals across all days
  const totals = dailyData.reduce(
    (acc, d) => ({
      fired: acc.fired + d.fired,
      snoozed: acc.snoozed + d.snoozed,
      dismissed: acc.dismissed + d.dismissed,
      missed: acc.missed + d.missed,
    }),
    { fired: 0, snoozed: 0, dismissed: 0, missed: 0 }
  );

  const pieData = [
    { name: "Fired", value: totals.fired },
    { name: "Snoozed", value: totals.snoozed },
    { name: "Dismissed", value: totals.dismissed },
    { name: "Missed", value: totals.missed },
  ].filter((d) => d.value > 0);

  const total = pieData.reduce((s, d) => s + d.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-heading">{t("analytics.dailyEvents")}</CardTitle>
      </CardHeader>
      <CardContent>
        {dailyData.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("analytics.noData")}</p>
        ) : (
          <div className="flex flex-col items-center gap-4">
            {/* Donut with center total */}
            <div className="relative w-[180px] h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    stroke="none"
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                  >
                    {pieData.map((_entry, index) => {
                      const colorIndex = LABELS.indexOf(_entry.name);
                      return <Cell key={index} fill={COLORS[colorIndex >= 0 ? colorIndex : 0]} />;
                    })}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-heading font-bold text-foreground">{total}</span>
                <span className="text-[10px] text-muted-foreground font-body">Total</span>
              </div>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {LABELS.map((label, i) => {
                const val = [totals.fired, totals.snoozed, totals.dismissed, totals.missed][i];
                if (val === 0) return null;
                const pct = total > 0 ? Math.round((val / total) * 100) : 0;
                return (
                  <div key={label} className="flex items-center gap-2 text-xs">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: COLORS[i] }}
                    />
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-semibold text-foreground ml-auto">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default HistoryChart;
