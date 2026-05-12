"use client";

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-shell-border)] bg-[rgba(4,16,24,0.76)] backdrop-blur-xl">
      <div className="flex flex-col gap-5 px-4 py-4 sm:px-5 lg:px-6 xl:px-7">
        <div className="flex items-center justify-end">
          <label className="flex w-full max-w-2xl items-center gap-3 rounded-full border border-[var(--color-shell-border)] bg-[var(--color-shell)] px-4 py-2 text-sm text-[var(--color-mist)]">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-fog)]">
              Search
            </span>
            <input
              type="search"
              placeholder="Search modules, animals, devices, organizations"
              className="w-full bg-transparent text-[var(--color-ice)] outline-none"
            />
          </label>
        </div>
      </div>
    </header>
  );
}
