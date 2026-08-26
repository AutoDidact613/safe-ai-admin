interface IconProps {
  size?: number;
  className?: string;
}

const base = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export function ShieldIcon({ size = 26, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export function BookIcon({ size = 26, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <path d="M4 5.5C4 4.7 4.7 4 5.5 4H12v16H5.5c-.8 0-1.5-.7-1.5-1.5v-13z" />
      <path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H12v16h6.5c.8 0 1.5-.7 1.5-1.5v-13z" />
    </svg>
  );
}

export function ChatIcon({ size = 26, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <path d="M4 5.5C4 4.7 4.7 4 5.5 4h13c.8 0 1.5.7 1.5 1.5v9c0 .8-.7 1.5-1.5 1.5H9l-4 4v-4H5.5C4.7 16 4 15.3 4 14.5v-9z" />
      <path d="M8 9h8M8 12h5" />
    </svg>
  );
}

export function BoxIcon({ size = 26, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <path d="M3.5 8l8.5-4 8.5 4v8l-8.5 4-8.5-4V8z" />
      <path d="M3.5 8L12 12l8.5-4M12 12v8" />
    </svg>
  );
}

export function ClockIcon({ size = 26, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

export function LockIcon({ size = 26, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <rect x="5.5" y="10.5" width="13" height="9" rx="1.5" />
      <path d="M8 10.5V7.5a4 4 0 018 0v3" />
    </svg>
  );
}

export function ChevronDownIcon({ size = 10, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" className={className}>
      <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ArrowUpIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" {...base} className={className}>
      <path d="M8 13V3M8 3L3 8M8 3L13 8" />
    </svg>
  );
}

export function CloseIcon({ size = 14, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" {...base} className={className}>
      <path d="M2 2l10 10M12 2L2 12" />
    </svg>
  );
}
