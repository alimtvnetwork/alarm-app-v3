/**
 * Error Log Page — Dedicated page for viewing captured errors with severity filtering.
 */

import { useState } from "react";
import { useErrorStore } from "@/stores/error-store";
import type { ErrorSeverity } from "@/types/errors";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Trash2, Filter } from "lucide-react";
import ErrorRow from "@/components/errors/ErrorRow";
import ErrorDetailModal from "@/components/errors/ErrorDetailModal";
import { SEVERITY_CONFIG, SEVERITY_ORDER } from "@/components/errors/severity-config";

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
