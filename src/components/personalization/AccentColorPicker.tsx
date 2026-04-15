import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useSettingsStore } from "@/stores/settings-store";
import { Palette, Check } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const ACCENT_COLORS = [
  { value: "#8b7355", label: "Warm Brown" },
  { value: "#6366F1", label: "Indigo" },
  { value: "#10B981", label: "Emerald" },
  { value: "#F59E0B", label: "Amber" },
  { value: "#EF4444", label: "Red" },
  { value: "#8B5CF6", label: "Violet" },
] as const;

const AccentColorPicker = () => {
  const accent = useSettingsStore((s) => s.settings.AccentColor);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="shrink-0">
          <Label className="font-heading text-sm flex items-center gap-1.5">
            <Palette className="h-3.5 w-3.5" />
            Accent
          </Label>
        </div>
        <div className="flex gap-2">
          {ACCENT_COLORS.map(({ value, label }) => {
            const isActive = accent === value;
            return (
              <Tooltip key={value}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => updateSettings({ AccentColor: value })}
                    aria-label={label}
                    className="relative"
                  >
                    <div
                      className={`h-7 w-7 rounded-full transition-all ${
                        isActive ? "ring-2 ring-foreground ring-offset-2 ring-offset-background scale-110" : "hover:scale-110"
                      }`}
                      style={{ backgroundColor: value }}
                    >
                      {isActive && (
                        <Check className="absolute inset-0 m-auto h-3.5 w-3.5 text-white drop-shadow" />
                      )}
                    </div>
                  </button>
                </TooltipTrigger>
                <TooltipContent>{label}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default AccentColorPicker;
