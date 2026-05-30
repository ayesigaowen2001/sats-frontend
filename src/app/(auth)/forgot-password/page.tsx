"use client";

import Link from "next/link";
import { useState } from "react";

import { forgotPasswordWithApi } from "@/lib/api/auth-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
      <section className="w-full max-w-xl p-2 sm:p-4 lg:p-6">
        <h2 className="text-3xl font-semibold text-[var(--color-ice)]">
          Forgot password
        </h2>
        <p className="mt-2 text-sm text-[var(--color-mist)]">
          Enter your email address to receive a one-time password reset link.
        </p>

        <form
          className="mt-8 space-y-5"
          onSubmit={async (event) => {
            event.preventDefault();

            setErrorMessage("");
            setSuccessMessage("");
            setIsSubmitting(true);

            try {
              const response = await forgotPasswordWithApi(email.trim());
              setSuccessMessage(
                response.message ||
                  "If your email exists in our records, a reset link has been sent.",
              );
            } catch (error) {
              setErrorMessage(
                error instanceof Error
                  ? error.message
                  : "Unable to process request right now.",
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
              placeholder="user@example.com"
            />
          </label>

          {errorMessage ? (
            <p className="rounded-[1rem] border border-rose-300/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {errorMessage}
            </p>
          ) : null}

          {successMessage ? (
            <p className="rounded-[1rem] border border-emerald-300/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              {successMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full border border-[var(--color-sand)]/40 bg-[var(--color-sand)]/18 px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition-colors hover:bg-[var(--color-sand)]/26"
          >
            {isSubmitting ? "Requesting..." : "Send reset link"}
          </button>
        </form>

        <p className="mt-5 text-sm text-[var(--color-mist)]">
          Remembered your password?{" "}
          <Link
            href="/login"
            className="text-[var(--color-sand)] transition-colors hover:text-[var(--color-ice)]"
          >
            Back to sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
