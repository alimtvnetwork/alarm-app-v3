import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeMode } from "@/types/alarm";
import { useSettingsStore } from "@/stores/settings-store";
import { Sun, Moon, Monitor } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const THEME_OPTIONS = [
  { value: ThemeMode.Light, label: "Light", icon: Sun, tip: "Warm cream palette" },
  { value: ThemeMode.Dark, label: "Dark", icon: Moon, tip: "Warm charcoal palette" },
  { value: ThemeMode.System, label: "System", icon: Monitor, tip: "Follow your OS setting" },
] as const;

const ThemeSelector = () => {
  const theme = useSettingsStore((s) => s.settings.Theme);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-heading">
          <Sun className="h-4 w-4" />
          Theme
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          {THEME_OPTIONS.map(({ value, label, icon: Icon, tip }) => (
            <Tooltip key={value}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => updateSettings({ Theme: value })}
                  className={`flex flex-1 flex-col items-center gap-1.5 rounded-lg p-3 transition-colors ${
                    theme === value
                      ? "bg-primary/15 ring-1 ring-primary"
                      : "bg-secondary hover:bg-secondary/80"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs font-body">{label}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>{tip}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ThemeSelector;
