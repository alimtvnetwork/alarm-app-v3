/**
 * ErrorRow — Single error entry in the error log list.
 */

import type { CapturedError } from "@/types/errors";
import { Badge } from "@/components/ui/badge";
import { SEVERITY_CONFIG } from "./severity-config";

interface ErrorRowProps {
  error: CapturedError;
  onClick: () => void;
}

const ErrorRow = ({ error, onClick }: ErrorRowProps) => {
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
};

export default ErrorRow;
