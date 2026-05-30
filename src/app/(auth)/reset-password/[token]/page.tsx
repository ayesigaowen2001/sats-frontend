"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { resetPasswordWithApi } from "@/lib/api/auth-client";

interface ResetPasswordPageProps {
  params: {
    token: string;
  };
}

export default function ResetPasswordPage({ params }: ResetPasswordPageProps) {
  const router = useRouter();
  const token = useMemo(() => decodeURIComponent(params.token), [params.token]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
      <section className="w-full max-w-xl p-2 sm:p-4 lg:p-6">
        <h2 className="text-3xl font-semibold text-[var(--color-ice)]">
          Reset password
        </h2>
        <p className="mt-2 text-sm text-[var(--color-mist)]">
          Enter and confirm your new password to finish resetting your account.
        </p>

        <form
          className="mt-8 space-y-5"
          onSubmit={async (event) => {
            event.preventDefault();

            setErrorMessage("");
            setSuccessMessage("");

            if (!newPassword || !confirmPassword) {
              setErrorMessage("Both password fields are required.");
              return;
            }

            if (newPassword !== confirmPassword) {
              setErrorMessage("Passwords do not match.");
              return;
            }

            setIsSubmitting(true);

            try {
              const response = await resetPasswordWithApi({
                token,
                newPassword,
                confirmPassword,
              });

              setSuccessMessage(
                response.message ||
                  "Password reset successful. Redirecting to sign in...",
              );

              setTimeout(() => {
                router.push("/login");
              }, 1200);
            } catch (error) {
              setErrorMessage(
                error instanceof Error
                  ? error.message
                  : "Unable to reset password.",
              );
            } finally {
              setIsSubmitting(false);
            }
          }}
        >
          <label className="block">
            <span className="text-sm font-medium text-[var(--color-ice)]">
              New password
            </span>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
              className="mt-2 w-full rounded-[1.2rem] border border-[var(--color-shell-border)] bg-black/15 px-4 py-3 text-[var(--color-ice)] outline-none transition-colors focus:border-[var(--color-sand)]/50"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[var(--color-ice)]">
              Confirm password
            </span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              className="mt-2 w-full rounded-[1.2rem] border border-[var(--color-shell-border)] bg-black/15 px-4 py-3 text-[var(--color-ice)] outline-none transition-colors focus:border-[var(--color-sand)]/50"
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
            {isSubmitting ? "Resetting..." : "Reset password"}
          </button>
        </form>

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
