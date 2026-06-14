import type { FormEvent } from "react";

type StringFormValues<T> = {
  [K in keyof T]: string;
};

export interface EntityFormField<T extends StringFormValues<T>> {
  name: keyof T;
  label: string;
  type?:
    | "text"
    | "email"
    | "password"
    | "date"
    | "datetime-local"
    | "select"
    | "color"
    | "file";
  required?: boolean;
  colSpan?: 1 | 2;
  options?: Array<{ value: string; label: string }>;
  readOnly?: boolean;
  accept?: string;
}

interface EntityFormProps<T extends StringFormValues<T>> {
  title: string;
  fields: EntityFormField<T>[];
  values: T;
  errorMessage?: string;
  submitLabel: string;
  submitLoadingLabel: string;
  isSubmitting: boolean;
  onChange: (name: keyof T, value: string) => void;
  onFileSelect?: (name: keyof T, file: File | null) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel?: () => void;
}

export function EntityForm<T extends StringFormValues<T>>({
  title,
  fields,
  values,
  errorMessage,
  submitLabel,
  submitLoadingLabel,
  isSubmitting,
  onChange,
  onFileSelect,
  onSubmit,
  onCancel,
}: EntityFormProps<T>) {
  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-4 rounded-2xl border border-[var(--color-shell-border)] p-4 sm:grid-cols-2"
    >
      <div className="sm:col-span-2 flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-[var(--color-ice)]">
          {title}
        </h3>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-ice)]"
          >
            Cancel
          </button>
        ) : null}
      </div>

      {fields.map((field) => (
        <label
          key={String(field.name)}
          className={field.colSpan === 2 ? "block sm:col-span-2" : "block"}
        >
          <span className="text-sm font-medium text-[var(--color-ice)]">
            {field.label}
          </span>

          {field.type === "select" ? (
            <select
              required={field.required}
              value={values[field.name] ?? ""}
              onChange={(event) => onChange(field.name, event.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2 text-[var(--color-ice)] outline-none [&_option]:bg-slate-900 [&_option]:text-white"
            >
              <option value="">-- Select an option --</option>
              {field.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : field.type === "file" ? (
            <input
              type="file"
              accept={field.accept}
              required={field.required}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                onFileSelect?.(field.name, file);
              }}
              className="mt-2 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2 text-[var(--color-ice)] outline-none file:mr-3 file:rounded-full file:border-0 file:bg-[var(--color-sand)]/18 file:px-3 file:py-1 file:text-xs file:font-semibold file:uppercase file:tracking-[0.12em] file:text-[var(--color-ice)] hover:file:bg-[var(--color-sand)]/28"
            />
          ) : (
            <input
              type={field.type ?? "text"}
              required={field.required}
              readOnly={field.readOnly}
              value={values[field.name] ?? ""}
              onChange={(event) => onChange(field.name, event.target.value)}
              className={`mt-2 w-full rounded-xl border border-[var(--color-shell-border)] text-[var(--color-ice)] outline-none disabled:opacity-50 ${
                field.type === "color"
                  ? "h-11 bg-transparent px-1 py-1"
                  : "bg-transparent px-3 py-2"
              }`}
            />
          )}
        </label>
      ))}

      {errorMessage ? (
        <p className="sm:col-span-2 rounded-xl border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
          {errorMessage}
        </p>
      ) : null}

      <div className="sm:col-span-2 flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-full border border-[var(--color-sand)]/40 bg-[var(--color-sand)]/18 px-5 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--color-ice)] transition-colors hover:bg-[var(--color-sand)]/28 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? submitLoadingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}
