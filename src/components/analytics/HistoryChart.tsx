/**
 * HistoryChart — Polar/rose chart showing daily alarm event totals
 * with labeled segments and center total.
 */

import {
  PieChart, Pie, Cell, ResponsiveContainer, Text,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

const COLORS = [
  "#3b82f6", // Fired — blue
  "#facc15", // Snoozed — yellow
  "#a78bfa", // Dismissed — purple
  "#22d3ee", // Missed — cyan
];

const LABELS_MAP: Record<string, number> = { Fired: 0, Snoozed: 1, Dismissed: 2, Missed: 3 };

interface HistoryChartProps {
  dailyData: { date: string; fired: number; snoozed: number; dismissed: number; missed: number }[];
}

/* Custom label renderer — value + name outside each slice */
const renderLabel = ({
  cx, cy, midAngle, outerRadius, name, value,
}: any) => {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 18;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <g>
      <Text
        x={x}
        y={y - 6}
        textAnchor={x > cx ? "start" : "end"}
        fill="hsl(var(--foreground))"
        fontSize={12}
        fontWeight={700}
      >
        {value}
      </Text>
      <Text
        x={x}
        y={y + 8}
        textAnchor={x > cx ? "start" : "end"}
        fill="hsl(var(--muted-foreground))"
        fontSize={9}
      >
        {name}
      </Text>
    </g>
  );
};

const HistoryChart = ({ dailyData }: HistoryChartProps) => {
  const { t } = useTranslation();

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
          <div className="flex flex-col items-center">
            <div className="relative w-[260px] h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={2}
                    stroke="none"
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                    label={renderLabel}
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => {
                      const ci = LABELS_MAP[entry.name] ?? index;
                      return <Cell key={index} fill={COLORS[ci]} />;
                    })}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {/* Center total */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] text-muted-foreground font-body">Total</span>
                <span className="text-xl font-heading font-bold text-primary">{total}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default HistoryChart;
