"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";
import Link from "next/link";

interface PageErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface PageErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class PageErrorBoundary extends Component<
  PageErrorBoundaryProps,
  PageErrorBoundaryState
> {
  constructor(props: PageErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): PageErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("[PageErrorBoundary] Caught error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message ?? "";
      const isForbidden =
        errorMessage.toLowerCase().includes("403") ||
        errorMessage.toLowerCase().includes("forbidden") ||
        errorMessage.toLowerCase().includes("access denied") ||
        errorMessage.toLowerCase().includes("permission");

      return (
        <main className="flex w-full flex-1 items-center justify-center px-4 py-16 sm:px-5 lg:px-6 xl:px-7">
          <section className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(226,189,121,0.12),transparent_24%),linear-gradient(135deg,rgba(6,31,44,0.96),rgba(4,18,28,0.98))] p-8 shadow-[0_32px_120px_rgba(0,0,0,0.35)] sm:p-10">
            <div className="flex flex-col items-center text-center">
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-full border ${
                  isForbidden
                    ? "border-amber-400/30 bg-amber-400/10"
                    : "border-rose-400/30 bg-rose-400/10"
                }`}
              >
                {isForbidden ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-8 w-8 text-amber-300"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-8 w-8 text-rose-300"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                )}
              </div>

              <h1 className="mt-5 text-2xl font-semibold text-white">
                {isForbidden
                  ? "Access denied"
                  : (this.props.fallbackTitle ?? "Something went wrong")}
              </h1>
              <p className="mt-4 max-w-md text-base leading-7 text-[var(--color-mist)]">
                {isForbidden
                  ? "Your account does not have permission to view this workspace. Contact your system administrator to request the appropriate access."
                  : (this.props.fallbackMessage ?? errorMessage)
                    ? `An error occurred while loading this page: ${errorMessage}`
                    : "An unexpected error occurred while loading this page. Please try again."}
              </p>

              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--color-sand)]/40 bg-[var(--color-sand)]/18 px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--color-ice)] transition-colors hover:bg-[var(--color-sand)]/28"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                  >
                    <polyline points="23 4 23 10 17 10" />
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                  </svg>
                  Try again
                </button>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.05] px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--color-mist)] transition-colors hover:bg-white/[0.1] hover:text-white"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                  >
                    <path d="M19 12H5" />
                    <path d="M12 19l-7-7 7-7" />
                  </svg>
                  Return home
                </Link>
              </div>
            </div>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
