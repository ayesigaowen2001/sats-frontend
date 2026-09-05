/**
 * Full-screen loading animation shown while a route is being rendered
 * (initial page load and client-side navigation) before data is displayed.
 */
export function PageLoader() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center px-6">
      <div className="flex flex-col items-center gap-6 text-center">
        <span
          role="status"
          aria-label="Loading"
          className="inline-block h-12 w-12 animate-spin rounded-full border-[3px] border-[var(--color-shell-border)] border-t-[var(--color-sand)]"
        />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[var(--color-sand)]">
            SATS Command Center
          </p>
          <p className="mt-2 text-sm text-[var(--color-mist)]">
            Loading workspace…
          </p>
        </div>
      </div>
    </div>
  );
}
