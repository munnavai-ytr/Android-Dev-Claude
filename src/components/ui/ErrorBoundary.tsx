'use client';

import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Copy, Check } from 'lucide-react';
import { GlassCard } from './GlassCard';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleCopy = () => {
    const details = `DroidForge Error Report:\nError: ${this.state.error?.message}\nStack: ${this.state.error?.stack}\nComponent Stack: ${this.state.errorInfo?.componentStack}`;
    navigator.clipboard.writeText(details);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2000);
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#07080B] text-[#F2F4F8] flex items-center justify-center p-4">
          <GlassCard radius={28} className="p-8 max-w-lg w-full text-center space-y-4 border-red-500/20">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-[#FF5C6C]">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white">Application Exception</h2>
              <p className="text-xs text-[#8B93A7] leading-relaxed">
                An unexpected client-side error occurred. Your keys and projects in IndexedDB remain secure.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 rounded-xl bg-black/60 border border-red-500/20 text-left font-mono text-xs text-[#FF5C6C] max-h-32 overflow-y-auto">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                onClick={this.handleReload}
                className="px-4 py-2 rounded-xl bg-[#3DDC84] text-black font-semibold text-xs flex items-center gap-1.5 hover:opacity-90 transition-opacity"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Application</span>
              </button>

              <button
                onClick={this.handleReset}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium text-xs border border-white/10 transition-colors"
              >
                Try to Recover
              </button>

              <button
                onClick={this.handleCopy}
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#8B93A7] hover:text-white text-xs border border-white/10 flex items-center gap-1.5 transition-colors"
                title="Copy error details"
              >
                {this.state.copied ? <Check className="w-3.5 h-3.5 text-[#3DDC84]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{this.state.copied ? 'Copied' : 'Copy Trace'}</span>
              </button>
            </div>
          </GlassCard>
        </div>
      );
    }

    return this.props.children;
  }
}
