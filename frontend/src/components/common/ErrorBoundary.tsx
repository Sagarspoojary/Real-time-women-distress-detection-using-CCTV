import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { FiAlertOctagon, FiRefreshCw } from "react-icons/fi";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error boundary catch:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-center select-none text-xs">
          <div className="max-w-md w-full glass-panel border border-red-500/20 bg-red-950/5 p-8 rounded-2xl flex flex-col items-center gap-6 shadow-2xl">
            <div className="p-4 bg-red-950/30 border border-red-500/30 text-red-400 rounded-full animate-pulse">
              <FiAlertOctagon className="text-4xl" />
            </div>

            <div className="space-y-2">
              <h3 className="font-extrabold text-sm uppercase text-slate-200 tracking-wider">
                Operator Console Crash
              </h3>
              <p className="text-slate-500 leading-relaxed max-w-xs mx-auto">
                An unexpected thread error interrupted the terminal view. Diagnostic:
              </p>
              <pre className="p-3 bg-black/60 border border-slate-900 text-red-400/90 rounded-lg text-[10px] font-mono text-left overflow-x-auto max-w-full">
                {this.state.error?.message || "Unknown rendering exception"}
              </pre>
            </div>

            <button
              onClick={this.handleReload}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-white font-bold rounded-xl transition-all cursor-pointer uppercase tracking-wider text-[10px]"
            >
              <FiRefreshCw /> Reload Operator Terminal
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
