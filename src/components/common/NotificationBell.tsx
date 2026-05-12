"use client";

interface NotificationBellProps {
  count: number;
}

export function NotificationBell({ count }: NotificationBellProps) {
  return (
    <button
      type="button"
      className="relative flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-shell-border)] bg-[var(--color-shell)] text-lg text-white transition-colors hover:border-white/20 hover:bg-[var(--color-shell-strong)]"
      aria-label="Notifications"
    >
      <span aria-hidden="true">N</span>
      <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-[var(--color-sand)] px-1.5 py-0.5 text-center text-[10px] font-semibold text-[#132633]">
        {count}
      </span>
    </button>
  );
}
