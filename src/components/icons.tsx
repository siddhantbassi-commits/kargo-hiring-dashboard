type IconProps = { className?: string };
const base = { fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export function IconUsers({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" className={className} {...base}>
      <path d="M17 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1" />
      <circle cx="10" cy="7" r="3.5" />
      <path d="M17.5 12.5A3.5 3.5 0 0 0 15.5 6" />
      <path d="M21 20v-1a3.5 3.5 0 0 0-2.5-3.36" />
    </svg>
  );
}

export function IconBriefcase({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" className={className} {...base}>
      <rect x="3" y="7.5" width="18" height="12" rx="2" />
      <path d="M8 7.5V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1.5" />
      <path d="M3 12.5h18" />
    </svg>
  );
}

export function IconStar({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" className={className} {...base}>
      <path d="M12 3.5l2.6 5.3 5.85.85-4.23 4.12 1 5.83L12 16.9l-5.22 2.75 1-5.83-4.23-4.12 5.85-.85z" />
    </svg>
  );
}

export function IconClock({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" className={className} {...base}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

export function IconSearch({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" className={className} {...base}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M20 20l-4.35-4.35" />
    </svg>
  );
}

export function IconArrowRight({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" className={className} {...base}>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  );
}

export function IconMenu({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" className={className} {...base}>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  );
}

export function IconClose({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" className={className} {...base}>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );
}

export function IconEye({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" className={className} {...base}>
      <path d="M2.5 12S5.5 5.5 12 5.5 21.5 12 21.5 12 18.5 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function IconEyeOff({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" className={className} {...base}>
      <path d="M3 3l18 18" />
      <path d="M10.6 5.64A9.93 9.93 0 0 1 12 5.5c6.5 0 9.5 6.5 9.5 6.5a16.6 16.6 0 0 1-3.1 4.14M6.6 6.6C4.1 8.2 2.5 11 2.5 12S5.5 18.5 12 18.5c1.1 0 2.1-.14 3-.4" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

export function IconScale({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" className={className} {...base}>
      <path d="M12 3v18" />
      <path d="M7 21h10" />
      <path d="M4 7h6M14 7h6" />
      <path d="M4 7l-2.5 5a2.5 2.5 0 0 0 5 0z" />
      <path d="M20 7l-2.5 5a2.5 2.5 0 0 0 5 0z" />
    </svg>
  );
}
