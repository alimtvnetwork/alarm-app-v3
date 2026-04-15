/**
 * Severity config and types shared across error log components.
 */

import type { ErrorSeverity } from "@/types/errors";
import { Flame, XCircle, AlertTriangle, Info } from "lucide-react";

export const SEVERITY_CONFIG: Record<ErrorSeverity, { icon: typeof Flame; label: string; className: string }> = {
  critical: { icon: Flame, label: "Critical", className: "bg-destructive text-destructive-foreground" },
  error: { icon: XCircle, label: "Error", className: "bg-destructive/80 text-destructive-foreground" },
  warning: { icon: AlertTriangle, label: "Warning", className: "bg-[hsl(var(--snooze))]/20 text-[hsl(var(--snooze))]" },
  info: { icon: Info, label: "Info", className: "bg-primary/20 text-primary" },
};

export const SEVERITY_ORDER: ErrorSeverity[] = ["critical", "error", "warning", "info"];
