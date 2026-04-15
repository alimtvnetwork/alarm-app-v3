import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useSettingsStore } from "@/stores/settings-store";

const ClockFormatToggle = () => {
  const is24Hour = useSettingsStore((s) => s.settings.Is24Hour);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <Label className="font-body text-sm">24-Hour Clock</Label>
          <p className="text-xs text-muted-foreground font-body">
            Switch between 12h (AM/PM) and 24h format.
          </p>
        </div>
        <button
          onClick={() => updateSettings({ Is24Hour: !is24Hour })}
          className={`rounded-lg px-3 py-1.5 text-sm font-body transition-colors ${
            is24Hour
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground"
          }`}
        >
          {is24Hour ? "24h" : "12h"}
        </button>
      </CardContent>
    </Card>
  );
};

export default ClockFormatToggle;
