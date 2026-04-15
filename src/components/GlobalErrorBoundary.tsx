/**
 * Global Error Boundary — catches unhandled React errors and routes them
 * to useErrorStore.captureException for centralized error tracking.
 */

import { Component, type ErrorInfo, type ReactNode } from "react";
import { useErrorStore } from "@/stores/error-store";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    useErrorStore.getState().captureException(error, {
      source: "ErrorBoundary",
      triggerComponent: errorInfo.componentStack?.split("\n")[1]?.trim() ?? "unknown",
      triggerAction: "render",
    });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 p-6 text-center">
          <AlertTriangle className="h-10 w-10 text-destructive" />
          <h2 className="text-lg font-semibold text-foreground">Something went wrong</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            {this.state.error?.message ?? "An unexpected error occurred."}
          </p>
          <Button variant="outline" onClick={this.handleRetry}>
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
