/**
 * ErrorDetailModal — Modal showing full error details with queue navigation.
 */

import { useState } from "react";
import { useErrorStore } from "@/stores/error-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  ClipboardCheck,
} from "lucide-react";
import { toast } from "sonner";
import { SEVERITY_CONFIG } from "./severity-config";

const ErrorDetailModal = () => {
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
};

export default ErrorDetailModal;
