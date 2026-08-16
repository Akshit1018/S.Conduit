export function Mark({ className = "size-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" className="fill-elevated" />
      <path
        d="M8 16h6M18 16h6"
        className="stroke-primary"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="16" cy="16" r="3.2" className="stroke-primary" strokeWidth="1.6" />
      <circle cx="7.2" cy="16" r="1.6" className="fill-primary" />
      <circle cx="24.8" cy="16" r="1.6" className="fill-primary" />
    </svg>
  );
}
