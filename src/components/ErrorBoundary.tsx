import React, { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  // useDefineForClassFields: false requires explicit declare for inherited members
  declare state: State;
  declare props: Readonly<Props>;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-10 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mx-auto">
              <AlertTriangle className="text-rose-500" size={32} />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-extrabold text-on-surface">Something went wrong</h1>
              <p className="text-sm text-on-surface-variant">
                An unexpected error occurred. Your analysis data has not been lost.
              </p>
              {this.state.error && (
                <p className="text-xs font-mono text-slate-400 bg-slate-50 rounded p-3 text-left mt-4 break-all">
                  {this.state.error.message}
                </p>
              )}
            </div>
            <button
              onClick={() => { window.location.href = '/intake'; }}
              className="flex items-center gap-2 mx-auto bg-primary text-white px-6 py-3 rounded-lg font-bold hover:bg-primary-dim transition-all"
            >
              <RefreshCw size={16} />
              Return to Intake
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
