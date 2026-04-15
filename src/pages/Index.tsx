/**
 * Index — Clean clock page: analog clock, digital time, next alarm countdown.
 * No alarm list — that lives on the dedicated /alarms page.
 */

import { useEffect } from "react";
import AnalogClock from "@/components/clock/AnalogClock";
import DigitalTime from "@/components/clock/DigitalTime";
import MissedAlarmBanner from "@/components/alarm/MissedAlarmBanner";
import { useAlarmStore } from "@/stores/alarm-store";
import { useSettingsStore } from "@/stores/settings-store";

const Index = () => {
  const loadAlarms = useAlarmStore((s) => s.loadAlarms);
  const loadGroups = useAlarmStore((s) => s.loadGroups);
  const loadSettings = useSettingsStore((s) => s.loadSettings);

  useEffect(() => {
    loadAlarms();
    loadGroups();
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-center gap-6">
      <MissedAlarmBanner />

      <div className="w-full rounded-xl bg-card p-8 shadow-sm">
        <div className="flex flex-col items-center gap-6">
          <AnalogClock />
          <DigitalTime />
        </div>
      </div>
    </div>
  );
};

export default Index;
