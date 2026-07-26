import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/**
 * Catches render/data errors in the page area and shows a friendly fallback
 * instead of a blank screen. Reset by remounting (keyed on the route) or via
 * the reload button.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Dashboard error boundary caught:", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <AlertTriangle className="h-6 w-6 text-red-500" />
          </div>
          <h2 className="text-base font-semibold text-navy-800">
            Something went wrong
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            This section failed to load. Try reloading the page, or pick another
            item from the menu.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
