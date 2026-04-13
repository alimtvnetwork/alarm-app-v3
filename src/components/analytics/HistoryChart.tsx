/**
 * HistoryChart — Stacked bar chart of daily alarm events.
 */

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { TOOLTIP_STYLE } from "./chart-constants";

interface HistoryChartProps {
  dailyData: { date: string; fired: number; snoozed: number; dismissed: number; missed: number }[];
}

const HistoryChart = ({ dailyData }: HistoryChartProps) => {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-heading">{t("analytics.dailyEvents")}</CardTitle>
      </CardHeader>
      <CardContent>
        {dailyData.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("analytics.noData")}</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="fired" stackId="a" fill="hsl(var(--primary))" />
              <Bar dataKey="snoozed" stackId="a" fill="hsl(var(--snooze))" />
              <Bar dataKey="dismissed" stackId="a" fill="hsl(var(--dismiss))" />
              <Bar dataKey="missed" stackId="a" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default HistoryChart;
