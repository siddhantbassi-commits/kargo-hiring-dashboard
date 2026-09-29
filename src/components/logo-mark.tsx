export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" fill="var(--accent)" />
      <path
        d="M10 9v14M10 16l7.5-7M10 16l7.5 7"
        stroke="var(--accent-foreground)"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M21 9v14" stroke="var(--accent-foreground)" strokeWidth="2.25" strokeLinecap="round" opacity="0.55" />
    </svg>
  );
}
