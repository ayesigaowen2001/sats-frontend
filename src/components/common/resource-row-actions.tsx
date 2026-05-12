interface ResourceRowActionsProps {
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
}

export function ResourceRowActions({
  onEdit,
  onDelete,
  isDeleting = false,
}: ResourceRowActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onEdit}
        aria-label="Edit"
        title="Edit"
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-[var(--color-ice)] transition-colors hover:bg-white/10"
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
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={isDeleting}
        aria-label="Delete"
        title={isDeleting ? "Deleting" : "Delete"}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-rose-300/40 text-rose-100 transition-colors hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isDeleting ? (
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
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
          </svg>
        )}
      </button>
    </div>
  );
}
