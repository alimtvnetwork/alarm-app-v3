/**
 * Personalization Page — Theme switcher, skin selector, accent color picker, streak calendar, clock format.
 */

import { TooltipProvider } from "@/components/ui/tooltip";
import StreakCalendar from "@/components/personalization/StreakCalendar";
import ThemeSelector from "@/components/personalization/ThemeSelector";
import SkinSelector from "@/components/personalization/SkinSelector";
import AccentColorPicker from "@/components/personalization/AccentColorPicker";
import ClockFormatToggle from "@/components/personalization/ClockFormatToggle";

const Personalization = () => {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-heading font-bold">Personalization</h1>
        <StreakCalendar />
        <ThemeSelector />
        <SkinSelector />
        <AccentColorPicker />
        <ClockFormatToggle />
      </div>
    </TooltipProvider>
  );
};

export default Personalization;
