"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuth((state) => state.login);
  const [email, setEmail] = useState("kadogochristopher@gmail.com");
  const [password, setPassword] = useState("Chris@1234");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
      <section className="w-full max-w-xl p-2 sm:p-4 lg:p-6">
        <h2 className="text-3xl font-semibold text-[var(--color-ice)]">
          Sign in
        </h2>

        <form
          className="mt-8 space-y-5"
          onSubmit={async (event) => {
            event.preventDefault();

            setErrorMessage("");
            setIsSubmitting(true);

            try {
              await login({ email, password });
              router.push("/apps");
            } catch (error) {
              setErrorMessage(
                error instanceof Error
                  ? error.message
                  : "Unable to sign in. Please try again.",
              );
            } finally {
              setIsSubmitting(false);
            }
          }}
        >
          <label className="block">
            <span className="text-sm font-medium text-[var(--color-ice)]">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="mt-2 w-full rounded-[1.2rem] border border-[var(--color-shell-border)] bg-black/15 px-4 py-3 text-[var(--color-ice)] outline-none transition-colors focus:border-[var(--color-sand)]/50"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[var(--color-ice)]">
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="mt-2 w-full rounded-[1.2rem] border border-[var(--color-shell-border)] bg-black/15 px-4 py-3 text-[var(--color-ice)] outline-none transition-colors focus:border-[var(--color-sand)]/50"
            />
          </label>

          {errorMessage ? (
            <p className="rounded-[1rem] border border-rose-300/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full border border-[var(--color-sand)]/40 bg-[var(--color-sand)]/18 px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition-colors hover:bg-[var(--color-sand)]/26"
          >
            {isSubmitting ? "Signing in..." : "Sign In"}
          </button>

          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-sm text-[var(--color-sand)] transition-colors hover:text-[var(--color-ice)]"
            >
              Forgot password?
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
