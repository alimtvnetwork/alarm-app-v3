import { Plus, Settings, AlertTriangle } from "lucide-react";
import { useErrorStore } from "@/stores/error-store";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const isAlarmsPage = location.pathname === "/alarms";
  const errorCount = useErrorStore((s) => s.recentErrors.length);

  const handleAddAlarm = () => {
    if (location.pathname !== "/alarms") {
      navigate("/alarms");
      setTimeout(() => window.dispatchEvent(new Event("alarm:new")), 100);
    } else {
      window.dispatchEvent(new Event("alarm:new"));
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="flex items-center justify-between px-6 py-3">
        <h1 className="text-lg font-heading font-semibold">{t("header.title")}</h1>
        <div className="flex items-center gap-1">
          {isAlarmsPage && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 hover:bg-transparent hover:text-foreground"
              aria-label={t("header.addAlarm")}
              onClick={handleAddAlarm}
            >
              <Plus className="h-5 w-5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 relative hover:bg-transparent hover:text-foreground"
            aria-label="Error log"
            onClick={() => navigate("/errors")}
          >
            <AlertTriangle className="h-5 w-5" />
            {errorCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                {errorCount > 9 ? "9+" : errorCount}
              </span>
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 hover:bg-transparent hover:text-foreground"
            aria-label={t("header.settings")}
            onClick={() => navigate("/settings")}
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
