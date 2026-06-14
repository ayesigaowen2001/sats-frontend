"use client";

import Link from "next/link";

interface ForbiddenViewProps {
  title?: string;
  message?: string;
  returnPath?: string;
  returnLabel?: string;
}

export function ForbiddenView({
  title = "Access denied",
  message = "Your account does not have permission to view this workspace. Contact your system administrator to request the appropriate access.",
  returnPath = "/",
  returnLabel = "Return to command center",
}: ForbiddenViewProps) {
  return (
    <main className="flex w-full flex-1 items-center justify-center px-4 py-16 sm:px-5 lg:px-6 xl:px-7">
      <section className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(226,189,121,0.12),transparent_24%),linear-gradient(135deg,rgba(6,31,44,0.96),rgba(4,18,28,0.98))] p-8 shadow-[0_32px_120px_rgba(0,0,0,0.35)] sm:p-10">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-amber-400/30 bg-amber-400/10">
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
          </div>

          <h1 className="mt-5 text-2xl font-semibold text-white">{title}</h1>
          <p className="mt-4 max-w-md text-base leading-7 text-[var(--color-mist)]">
            {message}
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href={returnPath}
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
                <path d="M19 12H5" />
                <path d="M12 19l-7-7 7-7" />
              </svg>
              {returnLabel}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
