/**
 * Error Log Page — Dedicated page for viewing captured errors with severity filtering.
 */

import { useState } from "react";
import { useErrorStore } from "@/stores/error-store";
import type { CapturedError, ErrorSeverity } from "@/types/errors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  XCircle,
  Info,
  Flame,
  Trash2,
  Copy,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Filter,
} from "lucide-react";
import { toast } from "sonner";

// ─── Severity Config ─────────────────────────────────────────────

const SEVERITY_CONFIG: Record<ErrorSeverity, { icon: typeof Flame; label: string; className: string }> = {
  critical: { icon: Flame, label: "Critical", className: "bg-destructive text-destructive-foreground" },
  error: { icon: XCircle, label: "Error", className: "bg-destructive/80 text-destructive-foreground" },
  warning: { icon: AlertTriangle, label: "Warning", className: "bg-[hsl(var(--snooze))]/20 text-[hsl(var(--snooze))]" },
  info: { icon: Info, label: "Info", className: "bg-primary/20 text-primary" },
};

const SEVERITY_ORDER: ErrorSeverity[] = ["critical", "error", "warning", "info"];

// ─── Error Row ───────────────────────────────────────────────────

function ErrorRow({ error, onClick }: { error: CapturedError; onClick: () => void }) {
  const config = SEVERITY_CONFIG[error.severity];
  const Icon = config.icon;
  const time = new Date(error.createdAt).toLocaleString();

  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-3 p-3 rounded-lg text-left hover:bg-accent/50 transition-colors border border-border/50"
    >
      <Icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${config.className}`}>
            {error.code}
          </Badge>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {config.label}
          </Badge>
          <span className="text-[10px] text-muted-foreground ml-auto">{time}</span>
        </div>
        <p className="text-sm text-foreground mt-1">{error.message}</p>
        {error.context.source && (
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Source: {error.context.source} → {error.context.triggerAction ?? "unknown"}
          </p>
        )}
      </div>
    </button>
  );
}

// ─── Error Detail Modal ──────────────────────────────────────────

function ErrorDetailModal() {
  const { selectedError, isModalOpen, closeErrorModal, errorQueue, currentQueueIndex, navigateQueue } = useErrorStore();
  const [copied, setCopied] = useState(false);

  if (!selectedError) return null;

  const config = SEVERITY_CONFIG[selectedError.severity];
  const hasQueue = errorQueue.length > 1;

  const handleCopy = async () => {
    const text = [
      `Code: ${selectedError.code}`,
      `Message: ${selectedError.message}`,
      `Severity: ${selectedError.severity}`,
      `Time: ${selectedError.createdAt}`,
      `Route: ${selectedError.context.route ?? "unknown"}`,
      `Source: ${selectedError.context.source ?? "unknown"}`,
      `Action: ${selectedError.context.triggerAction ?? "unknown"}`,
      `Component: ${selectedError.context.triggerComponent ?? "unknown"}`,
      selectedError.stack ? `\nStack:\n${selectedError.stack}` : "",
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={(open) => !open && closeErrorModal()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Badge className={config.className}>{config.label}</Badge>
            <span className="text-sm font-mono">[{selectedError.code}]</span>
            {hasQueue && (
              <span className="text-xs text-muted-foreground ml-auto">
                {currentQueueIndex + 1}/{errorQueue.length}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <p className="text-foreground">{selectedError.message}</p>

          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">Time</span>
              <p>{new Date(selectedError.createdAt).toLocaleString()}</p>
            </div>
            <div>
              <span className="font-medium text-foreground">Route</span>
              <p>{selectedError.context.route ?? "—"}</p>
            </div>
            <div>
              <span className="font-medium text-foreground">Source</span>
              <p>{selectedError.context.source ?? "—"}</p>
            </div>
            <div>
              <span className="font-medium text-foreground">Action</span>
              <p>{selectedError.context.triggerAction ?? "—"}</p>
            </div>
          </div>

          {selectedError.stack && (
            <pre className="text-[10px] bg-muted p-2 rounded-md overflow-x-auto max-h-32 whitespace-pre-wrap text-muted-foreground">
              {selectedError.stack}
            </pre>
          )}
        </div>

        <DialogFooter className="flex-row gap-2">
          {hasQueue && (
            <div className="flex gap-1 mr-auto">
              <Button size="icon" variant="ghost" onClick={() => navigateQueue("prev")}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => navigateQueue("next")}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
          <Button size="sm" variant="outline" onClick={handleCopy}>
            {copied ? <ClipboardCheck className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
            {copied ? "Copied" : "Copy All"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ───────────────────────────────────────────────────

const ErrorLog = () => {
  const { recentErrors, clearRecentErrors, openErrorModal, openErrorQueue } = useErrorStore();
  const [activeFilter, setActiveFilter] = useState<ErrorSeverity | "all">("all");

  const filtered = activeFilter === "all"
    ? recentErrors
    : recentErrors.filter((e) => e.severity === activeFilter);

  const counts = SEVERITY_ORDER.reduce<Record<string, number>>((acc, sev) => {
    acc[sev] = recentErrors.filter((e) => e.severity === sev).length;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-heading font-semibold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Error Log
          {recentErrors.length > 0 && (
            <Badge variant="secondary">{recentErrors.length}</Badge>
          )}
        </h2>
        <div className="flex gap-2">
          {filtered.length > 1 && (
            <Button size="sm" variant="outline" onClick={() => openErrorQueue(filtered)}>
              Browse All
            </Button>
          )}
          {recentErrors.length > 0 && (
            <Button size="sm" variant="ghost" onClick={clearRecentErrors}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Severity Filters */}
      <div className="flex gap-2 flex-wrap">
        <Button
          size="sm"
          variant={activeFilter === "all" ? "default" : "outline"}
          onClick={() => setActiveFilter("all")}
          className="text-xs h-7"
        >
          <Filter className="h-3 w-3 mr-1" />
          All ({recentErrors.length})
        </Button>
        {SEVERITY_ORDER.map((sev) => {
          const config = SEVERITY_CONFIG[sev];
          const count = counts[sev] ?? 0;
          if (count === 0) return null;
          return (
            <Button
              key={sev}
              size="sm"
              variant={activeFilter === sev ? "default" : "outline"}
              onClick={() => setActiveFilter(sev)}
              className="text-xs h-7"
            >
              {config.label} ({count})
            </Button>
          );
        })}
      </div>

      {/* Error List */}
      <Card>
        <CardContent className="p-3">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {recentErrors.length === 0
                ? "No errors captured yet. Errors will appear here automatically."
                : "No errors match this filter."}
            </p>
          ) : (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-2">
                {filtered.map((error) => (
                  <ErrorRow
                    key={error.id}
                    error={error}
                    onClick={() => openErrorModal(error)}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <ErrorDetailModal />
    </div>
  );
};

export default ErrorLog;
