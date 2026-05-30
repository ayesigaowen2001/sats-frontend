"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  resendVerificationWithApi,
  verifyEmailWithApi,
} from "@/lib/api/auth-client";
import { getAccessToken } from "@/lib/auth-tokens";

interface VerifyEmailPageProps {
  params: {
    token: string;
  };
}

export default function VerifyEmailPage({ params }: VerifyEmailPageProps) {
  const token = useMemo(() => decodeURIComponent(params.token), [params.token]);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [resendMessage, setResendMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
      <section className="w-full max-w-xl p-2 sm:p-4 lg:p-6">
        <h2 className="text-3xl font-semibold text-[var(--color-ice)]">
          Verify email
        </h2>
        <p className="mt-2 text-sm text-[var(--color-mist)]">
          Confirm your email address with the verification token from your
          email.
        </p>

        <div className="mt-8 space-y-5">
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

          {resendMessage ? (
            <p className="rounded-[1rem] border border-sky-300/25 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
              {resendMessage}
            </p>
          ) : null}

          <button
            type="button"
            disabled={isSubmitting}
            onClick={async () => {
              setErrorMessage("");
              setSuccessMessage("");
              setIsSubmitting(true);

              try {
                const response = await verifyEmailWithApi(token);
                setSuccessMessage(
                  response.message || "Email verification successful.",
                );
              } catch (error) {
                setErrorMessage(
                  error instanceof Error
                    ? error.message
                    : "Unable to verify email.",
                );
              } finally {
                setIsSubmitting(false);
              }
            }}
            className="w-full rounded-full border border-[var(--color-sand)]/40 bg-[var(--color-sand)]/18 px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition-colors hover:bg-[var(--color-sand)]/26"
          >
            {isSubmitting ? "Verifying..." : "Verify email"}
          </button>

          <button
            type="button"
            disabled={isResending}
            onClick={async () => {
              setResendMessage("");
              setErrorMessage("");
              setIsResending(true);

              try {
                const accessToken = getAccessToken();

                if (!accessToken) {
                  throw new Error(
                    "Sign in first to resend verification email.",
                  );
                }

                const response = await resendVerificationWithApi(accessToken);
                setResendMessage(
                  response.message || "Verification email resent.",
                );
              } catch (error) {
                setErrorMessage(
                  error instanceof Error
                    ? error.message
                    : "Unable to resend verification email.",
                );
              } finally {
                setIsResending(false);
              }
            }}
            className="w-full rounded-full border border-[var(--color-shell-border)] bg-transparent px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--color-ice)] transition-colors hover:bg-white/5"
          >
            {isResending ? "Resending..." : "Resend verification email"}
          </button>
        </div>

        <p className="mt-5 text-sm text-[var(--color-mist)]">
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
