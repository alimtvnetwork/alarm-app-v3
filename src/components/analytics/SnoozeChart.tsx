/**
 * SnoozeChart — Line chart of snooze count trend.
 */

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { TOOLTIP_STYLE } from "./chart-constants";

const SNOOZE_DOT_RADIUS = 4;

interface SnoozeChartProps {
  snoozeTrend: { date: string; snoozeCount: number }[];
}

const SnoozeChart = ({ snoozeTrend }: SnoozeChartProps) => {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-heading">{t("analytics.snoozeCountTrend")}</CardTitle>
      </CardHeader>
      <CardContent>
        {snoozeTrend.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("analytics.noSnoozeData")}</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={snoozeTrend}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Line
                type="monotone"
                dataKey="snoozeCount"
                stroke="hsl(var(--snooze))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--snooze))", r: SNOOZE_DOT_RADIUS }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default SnoozeChart;
