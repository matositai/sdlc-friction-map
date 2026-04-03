"use client";

import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: "var(--nc-void)" }}>
          <div className="max-w-md rounded-lg p-6" style={{ backgroundColor: "var(--nc-surface-1)", border: "1px solid var(--nc-ghost)" }}>
            <div className="flex items-start gap-3">
              <span className="text-2xl mt-1">⚠️</span>
              <div className="flex-1">
                <h2 className="font-semibold mb-2" style={{ color: "var(--foreground)" }}>
                  Something went wrong
                </h2>
                <p className="text-xs mb-4" style={{ color: "var(--muted-foreground)" }}>
                  {this.state.error?.message || "An unexpected error occurred"}
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="text-xs px-3 py-1.5 rounded font-medium transition-colors"
                  style={{
                    backgroundColor: "var(--nc-cyan)",
                    color: "var(--nc-void)",
                  }}
                >
                  Reload page
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
