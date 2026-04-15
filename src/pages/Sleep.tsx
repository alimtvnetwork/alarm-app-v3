/**
 * Sleep Page — Sleep quality tracking, bedtime goals, weekly sleep chart.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Moon, Sun, Star } from "lucide-react";
import BedtimeReminderCard from "@/components/sleep/BedtimeReminderCard";
import AmbientPlayer from "@/components/sleep/AmbientPlayer";

const MOCK_SLEEP_DATA = [
  { day: "Mon", hours: 7.5, quality: 4 },
  { day: "Tue", hours: 6.2, quality: 3 },
  { day: "Wed", hours: 8.0, quality: 5 },
  { day: "Thu", hours: 7.0, quality: 4 },
  { day: "Fri", hours: 5.5, quality: 2 },
  { day: "Sat", hours: 9.0, quality: 5 },
  { day: "Sun", hours: 8.5, quality: 4 },
];

const Sleep = () => {
  const [sleepQuality, setSleepQuality] = useState(3);
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const { t } = useTranslation();

  const MOODS = [
    { emoji: "😴", label: t("sleep.exhausted") },
    { emoji: "😐", label: t("sleep.tired") },
    { emoji: "🙂", label: t("sleep.ok") },
    { emoji: "😊", label: t("sleep.good") },
    { emoji: "🤩", label: t("sleep.great") },
  ];

  const avgHours = (
    MOCK_SLEEP_DATA.reduce((sum, d) => sum + d.hours, 0) / MOCK_SLEEP_DATA.length
  ).toFixed(1);

  const avgQuality = (
    MOCK_SLEEP_DATA.reduce((sum, d) => sum + d.quality, 0) / MOCK_SLEEP_DATA.length
  ).toFixed(1);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-heading font-bold">{t("sleep.title")}</h1>

      <div className="grid grid-cols-2 gap-2">
        <Card>
          <CardContent className="flex flex-col items-center p-4">
            <Moon className="mb-1 h-5 w-5 text-primary" />
            <span className="text-2xl font-heading font-bold">{avgHours}h</span>
            <span className="text-xs text-muted-foreground font-body">{t("sleep.avgSleep")}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center p-4">
            <Star className="mb-1 h-5 w-5 text-alarm-snooze" />
            <span className="text-2xl font-heading font-bold">{avgQuality}/5</span>
            <span className="text-xs text-muted-foreground font-body">{t("sleep.avgQuality")}</span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-heading">{t("sleep.thisWeek")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={MOCK_SLEEP_DATA} barCategoryGap="20%">
              <CartesianGrid
                strokeDasharray="4 4"
                vertical={false}
                stroke="hsl(var(--border) / 0.4)"
              />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                dy={8}
              />
              <YAxis
                domain={[0, 12]}
                ticks={[0, 3, 6, 9, 12]}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                width={30}
                unit="h"
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--accent) / 0.15)", radius: 6 }}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 10,
                  fontSize: 12,
                  padding: "6px 12px",
                }}
                formatter={(value: number) => [`${value}h`, "Sleep"]}
              />
              <Bar
                dataKey="hours"
                fill="hsl(var(--primary))"
                radius={[6, 6, 0, 0]}
                maxBarSize={36}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <BedtimeReminderCard />

      <AmbientPlayer />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-heading">
            <Sun className="h-4 w-4" />
            {t("sleep.howDidYouSleep")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-body">
              <span>{t("sleep.quality")}</span>
              <span>{sleepQuality}/5</span>
            </div>
            <Slider
              value={[sleepQuality]}
              onValueChange={([v]) => setSleepQuality(v)}
              min={1}
              max={5}
              step={1}
            />
          </div>

          <div className="space-y-2">
            <span className="text-xs text-muted-foreground font-body">{t("sleep.mood")}</span>
            <div className="flex justify-between gap-1">
              {MOODS.map((mood, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedMood(i)}
                  className={`flex flex-col items-center gap-0.5 rounded-lg p-2 transition-colors ${
                    selectedMood === i
                      ? "bg-primary/15 ring-1 ring-primary"
                      : "hover:bg-secondary"
                  }`}
                >
                  <span className="text-xl">{mood.emoji}</span>
                  <span className="text-[10px] text-muted-foreground">{mood.label}</span>
                </button>
              ))}
            </div>
          </div>

          <Button className="w-full">{t("sleep.save")}</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Sleep;
