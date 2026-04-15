import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSettingsStore } from "@/stores/settings-store";
import { Paintbrush } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const SKIN_OPTIONS = [
  { value: "default", label: "Default", colors: ["#faf8f5", "#8b7355", "#f0ebe3", "#c9b99a"] },
  { value: "midnight", label: "Midnight", colors: ["#171b2e", "#4d7df2", "#dde3f0", "#3366cc"] },
  { value: "sunrise", label: "Sunrise", colors: ["#f5e6d8", "#e05c2d", "#ecd5c2", "#d99040"] },
  { value: "ocean", label: "Ocean", colors: ["#1a2c33", "#33b8a8", "#d4e6e2", "#408f85"] },
  { value: "forest", label: "Forest", colors: ["#192319", "#4da652", "#d6e8d6", "#3d8040"] },
  { value: "vscode", label: "VS Code", colors: ["#1e1e1e", "#007acc", "#d4d4d4", "#2d2d2d"] },
  { value: "dracula", label: "Dracula", colors: ["#282a36", "#bd93f9", "#f8f8f2", "#44475a"] },
  { value: "monokai", label: "Monokai", colors: ["#272822", "#f92672", "#f8f8f2", "#a6e22e"] },
  { value: "nord", label: "Nord", colors: ["#2e3440", "#5e81ac", "#d8dee9", "#88c0d0"] },
  { value: "solarized-dark", label: "Sol Dark", colors: ["#002b36", "#2aa198", "#fdf6e3", "#073642"] },
  { value: "solarized-light", label: "Sol Light", colors: ["#fdf6e3", "#2aa198", "#002b36", "#eee8d5"] },
  { value: "catppuccin", label: "Catppuccin", colors: ["#1e1e2e", "#cba6f7", "#cdd6f4", "#f5c2e7"] },
] as const;

const ROWS = [
  SKIN_OPTIONS.slice(0, 4),
  SKIN_OPTIONS.slice(4, 8),
  SKIN_OPTIONS.slice(8, 12),
];

const SkinSelector = () => {
  const skin = useSettingsStore((s) => s.settings.ThemeSkin ?? "default");
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-heading">
          <Paintbrush className="h-4 w-4" />
          Skin
        </CardTitle>
        <p className="text-xs text-muted-foreground font-body">
          Choose a color scheme for the entire app.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {ROWS.map((row, ri) => (
          <div key={ri} className="flex gap-1">
            {row.map(({ value, label, colors }) => {
              const isActive = skin === value;
              return (
                <Tooltip key={value}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => updateSettings({ ThemeSkin: value })}
                      className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl p-1.5 transition-all ${
                        isActive
                          ? "bg-secondary/80 shadow-sm"
                          : "hover:bg-secondary/40"
                      }`}
                    >
                      <div className="flex rounded-full overflow-hidden">
                        {colors.map((c, i) => (
                          <div
                            key={i}
                            className="h-4 w-2"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                      <span className="text-[8px] font-body text-muted-foreground">{label}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{label} theme</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default SkinSelector;
