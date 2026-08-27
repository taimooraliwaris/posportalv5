// @ts-nocheck
import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reportLovableError } from "@/lib/lovable-error-reporting";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  name?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(`[ErrorBoundary:${this.props.name ?? "unnamed"}]`, error, errorInfo);
    try {
      reportLovableError(error, {
        boundary: this.props.name ?? "app_error_boundary",
        componentStack: errorInfo.componentStack ?? "",
      });
    } catch {
      // Ignored if error reporting fails
    }
  }

  handleReset = (): void => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (typeof this.props.fallback === "function") {
        return this.props.fallback(this.state.error, this.handleReset);
      }
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[300px] w-full flex-col items-center justify-center rounded-2xl border border-border bg-card p-6 text-center shadow-soft">
          <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Something went wrong</h2>
          <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
            {this.state.error.message || "An unexpected error occurred in this view."}
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button onClick={this.handleReset} className="h-11 gap-2">
              <RefreshCw className="h-4 w-4" /> Try again
            </Button>
            <Button
              variant="outline"
              className="h-11 gap-2"
              onClick={() => {
                window.location.href = "/till";
              }}
            >
              <Home className="h-4 w-4" /> Go to Till
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
