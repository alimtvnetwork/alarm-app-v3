/**
 * BreakdownChart — Donut pie chart of event type breakdown.
 */

import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { TOOLTIP_STYLE, PIE_COLORS } from "./chart-constants";

const INNER_RADIUS = 45;
const OUTER_RADIUS = 70;

interface BreakdownChartProps {
  pieData: { name: string; value: number }[];
}

const BreakdownChart = ({ pieData }: BreakdownChartProps) => {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-heading">{t("analytics.eventBreakdown")}</CardTitle>
      </CardHeader>
      <CardContent>
        {pieData.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("analytics.noData")}</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="45%"
                innerRadius={INNER_RADIUS}
                outerRadius={OUTER_RADIUS}
                paddingAngle={1}
                stroke="none"
                dataKey="value"
                label={false}
              >
                {pieData.map((_entry, index) => (
                  <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                formatter={(value: string) => {
                  const total = pieData.reduce((s, d) => s + d.value, 0);
                  const item = pieData.find((d) => d.name === value);
                  const pct = item && total > 0 ? Math.round((item.value / total) * 100) : 0;
                  return <span style={{ color: "hsl(var(--muted-foreground))" }}>{value} {pct}%</span>;
                }}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default BreakdownChart;
