"use client";

import { useState } from "react";

interface ServerIdFilterProps {
  label: string;
  placeholder: string;
  actionLabel: string;
  loadingLabel: string;
  errorMessage?: string;
  hasActiveResult: boolean;
  onSearch: (id: string) => Promise<void>;
  onClear: () => void;
}

export function ServerIdFilter({
  label,
  placeholder,
  actionLabel,
  loadingLabel,
  errorMessage,
  hasActiveResult,
  onSearch,
  onClear,
}: ServerIdFilterProps) {
  const [inputValue, setInputValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const id = inputValue.trim();

    if (!id) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSearch(id);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-xl space-y-2">
      <form
        onSubmit={handleSubmit}
        className="flex items-center justify-center"
      >
        <div className="flex w-full items-center overflow-hidden rounded-xl border border-[var(--color-shell-border)] bg-black/10 focus-within:border-[var(--color-sand)]/40">
          <input
            type="text"
            aria-label={label}
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            placeholder={placeholder}
            className="min-w-0 flex-1 bg-transparent px-4 py-3 text-[var(--color-ice)] outline-none placeholder:text-[var(--color-mist)]"
          />
          {hasActiveResult ? (
            <button
              type="button"
              aria-label="Clear filter"
              title="Clear filter"
              onClick={() => {
                setInputValue("");
                onClear();
              }}
              className="inline-flex h-11 w-11 items-center justify-center border-l border-white/10 text-[var(--color-mist)] transition-colors hover:bg-white/10 hover:text-white"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          ) : null}
          <button
            type="submit"
            aria-label={isSubmitting ? loadingLabel : actionLabel}
            title={isSubmitting ? loadingLabel : actionLabel}
            disabled={isSubmitting || !inputValue.trim()}
            className="inline-flex h-11 w-11 items-center justify-center border-l border-white/10 text-[var(--color-ice)] transition-colors hover:bg-[var(--color-sand)]/18 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? (
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4 animate-spin"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 1 1-6.2-8.56" />
              </svg>
            ) : (
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            )}
          </button>
        </div>
      </form>

      {errorMessage ? (
        <p className="text-center text-sm text-rose-200">{errorMessage}</p>
      ) : null}
    </section>
  );
}
