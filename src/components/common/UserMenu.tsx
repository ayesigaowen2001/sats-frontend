"use client";

import { useRouter } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";

export function UserMenu() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const logout = useAuth((state) => state.logout);

  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-full border border-[var(--color-shell-border)] bg-[var(--color-shell)] px-3 py-2 text-left text-sm text-[var(--color-ice)] transition-colors hover:border-white/20 hover:bg-[var(--color-shell-strong)]">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-sand)]/20 font-semibold text-[var(--color-paper)]">
          {user.name
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)}
        </span>
        <span className="hidden min-w-0 sm:block">
          <span className="block truncate font-semibold">{user.name}</span>
          <span className="block truncate text-xs text-[var(--color-mist)]">
            {user.role}
          </span>
        </span>
      </summary>
      <div className="absolute right-0 z-40 mt-3 w-64 rounded-[1.5rem] border border-[var(--color-shell-border)] bg-[var(--color-night-alt)]/95 p-4 shadow-[var(--color-shell-shadow)] backdrop-blur-xl">
        <p className="text-sm font-semibold text-[var(--color-ice)]">
          {user.name}
        </p>
        <p className="mt-1 text-sm text-[var(--color-mist)]">{user.email}</p>
        <p className="mt-2 text-xs uppercase tracking-[0.2em] text-[var(--color-fog)]">
          {user.role}
        </p>
        <button
          type="button"
          onClick={() => {
            logout();
            router.push("/login");
          }}
          className="mt-4 w-full rounded-full border border-[var(--color-shell-border)] bg-[var(--color-shell)] px-4 py-2 text-sm font-medium text-[var(--color-ice)] transition-colors hover:border-white/20 hover:bg-[var(--color-shell-strong)]"
        >
          Logout
        </button>
      </div>
    </details>
  );
}
