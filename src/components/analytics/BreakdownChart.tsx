/**
 * BreakdownChart — Radial bar chart showing event type percentages.
 */

import {
  RadialBarChart, RadialBar, ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

const COLORS: Record<string, string> = {
  Fired: "#E6F14A",
  Snoozed: "#4C6EF5",
  Dismissed: "#B197FC",
  Missed: "#3BC9DB",
};

interface BreakdownChartProps {
  pieData: { name: string; value: number }[];
}

const BreakdownChart = ({ pieData }: BreakdownChartProps) => {
  const { t } = useTranslation();
  const total = pieData.reduce((s, d) => s + d.value, 0);

  const radialData = pieData
    .map((d) => ({
      name: d.name,
      value: total > 0 ? Math.round((d.value / total) * 100) : 0,
      fill: COLORS[d.name] ?? "#888",
    }))
    .sort((a, b) => a.value - b.value);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-heading">{t("analytics.eventBreakdown")}</CardTitle>
      </CardHeader>
      <CardContent>
        {pieData.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("analytics.noData")}</p>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-[200px] h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  cx="50%"
                  cy="50%"
                  innerRadius="30%"
                  outerRadius="90%"
                  data={radialData}
                  startAngle={90}
                  endAngle={-270}
                  barSize={12}
                >
                  <RadialBar
                    dataKey="value"
                    cornerRadius={6}
                    background={{ fill: "hsl(var(--muted) / 0.3)" }}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="flex flex-col items-center justify-center w-16 h-16 rounded-full bg-[#1C1C3A]">
                  <span className="text-[10px] text-muted-foreground">Total</span>
                  <span className="text-lg font-heading font-bold text-primary">{total}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {radialData.map((d) => (
                <div key={d.name} className="flex items-center gap-2 text-xs">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: d.fill }}
                  />
                  <span className="text-muted-foreground">{d.name}</span>
                  <span className="font-semibold text-foreground ml-auto">{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BreakdownChart;
