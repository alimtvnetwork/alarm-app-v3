/**
 * Error Panel — Displays captured errors with severity badges and detail modal.
 * Source: spec/03-error-manage-spec error modal + error store specs.
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
} from "lucide-react";
import { toast } from "sonner";

// ─── Severity Config ─────────────────────────────────────────────

const SEVERITY_CONFIG: Record<ErrorSeverity, { icon: typeof Flame; label: string; className: string }> = {
  critical: { icon: Flame, label: "Critical", className: "bg-destructive text-destructive-foreground" },
  error: { icon: XCircle, label: "Error", className: "bg-destructive/80 text-destructive-foreground" },
  warning: { icon: AlertTriangle, label: "Warning", className: "bg-[hsl(var(--snooze))]/20 text-[hsl(var(--snooze))]" },
  info: { icon: Info, label: "Info", className: "bg-primary/20 text-primary" },
};

// ─── Error Row ───────────────────────────────────────────────────

function ErrorRow({ error, onClick }: { error: CapturedError; onClick: () => void }) {
  const config = SEVERITY_CONFIG[error.severity];
  const Icon = config.icon;
  const time = new Date(error.createdAt).toLocaleTimeString();

  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-3 p-3 rounded-lg text-left hover:bg-accent/50 transition-colors"
    >
      <Icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${config.className}`}>
            {error.code}
          </Badge>
          <span className="text-[10px] text-muted-foreground">{time}</span>
        </div>
        <p className="text-sm text-foreground truncate mt-0.5">{error.message}</p>
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

// ─── Main Error Panel ────────────────────────────────────────────

export default function ErrorPanel() {
  const { recentErrors, clearRecentErrors, openErrorModal, openErrorQueue } = useErrorStore();

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Error Log
              {recentErrors.length > 0 && (
                <Badge variant="secondary" className="text-xs">{recentErrors.length}</Badge>
              )}
            </CardTitle>
            <div className="flex gap-2">
              {recentErrors.length > 1 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openErrorQueue(recentErrors)}
                >
                  Browse All
                </Button>
              )}
              {recentErrors.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={clearRecentErrors}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {recentErrors.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No errors captured yet.
            </p>
          ) : (
            <ScrollArea className="max-h-64">
              <div className="space-y-1">
                {recentErrors.map((error) => (
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
    </>
  );
}
