/**
 * The owner page's reported mark: a small flat flag, yellow on an ink pole.
 * Decorative; whatever it sits beside says "reported" in words.
 */
export function Flag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className={className}>
      <path
        d="M5 18V3"
        stroke="var(--foreground)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M5 4h10l-2.5 3.5L15 11H5z"
        fill="var(--winner)"
        stroke="var(--foreground)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
