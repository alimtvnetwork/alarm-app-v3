/**
 * HistoryChart — Premium donut chart for daily alarm events
 * based on the provided JSON design spec.
 */

import {
  PieChart, Pie, Cell, ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

const SEGMENT_COLORS: Record<string, string> = {
  Fired: "#E6F14A",
  Snoozed: "#4C6EF5",
  Dismissed: "#B197FC",
  Missed: "#3BC9DB",
};

interface HistoryChartProps {
  dailyData: { date: string; fired: number; snoozed: number; dismissed: number; missed: number }[];
}

/* Outer label with connector line */
const renderLabel = ({
  cx, cy, midAngle, outerRadius, name, value,
}: any) => {
  const RADIAN = Math.PI / 180;
  const sin = Math.sin(-midAngle * RADIAN);
  const cos = Math.cos(-midAngle * RADIAN);

  // Connector start (edge of pie)
  const sx = cx + outerRadius * cos;
  const sy = cy + outerRadius * sin;

  // Connector elbow
  const mx = cx + (outerRadius + 14) * cos;
  const my = cy + (outerRadius + 14) * sin;

  // Connector end (horizontal)
  const ex = cx + (outerRadius + 28) * cos;
  const ey = my;

  const anchor = ex > cx ? "start" : "end";
  const color = SEGMENT_COLORS[name] ?? "#fff";

  return (
    <g>
      {/* Connector line */}
      <path
        d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
        stroke="#A5B4FC"
        strokeWidth={1.5}
        fill="none"
      />
      {/* Value */}
      <text
        x={ex + (ex > cx ? 4 : -4)}
        y={ey - 6}
        textAnchor={anchor}
        fill={color}
        fontSize={13}
        fontWeight={700}
        fontFamily="sans-serif"
      >
        {value}
      </text>
      {/* Label */}
      <text
        x={ex + (ex > cx ? 4 : -4)}
        y={ey + 9}
        textAnchor={anchor}
        fill="hsl(var(--muted-foreground))"
        fontSize={10}
        fontFamily="sans-serif"
      >
        {name}
      </text>
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
            <div className="relative w-full h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius="45%"
                    outerRadius="70%"
                    paddingAngle={4}
                    cornerRadius={6}
                    stroke="none"
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                    label={renderLabel}
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={SEGMENT_COLORS[entry.name] ?? "#888"}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {/* Center circle with total */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="flex flex-col items-center justify-center w-20 h-20 rounded-full bg-[#1C1C3A]">
                  <span className="text-[10px] text-muted-foreground">Total</span>
                  <span className="text-lg font-heading font-bold text-primary">{total}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default HistoryChart;
