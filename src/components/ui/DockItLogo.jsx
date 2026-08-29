// DockIt Logo — SVG inline component
// Usage:
//   <DockItLogo />             — horizontal (icon + wordmark), adapts to dark/light theme
//   <DockItLogo variant="light" />  — force light on dark
//   <DockItLogo iconOnly />    — just the clipboard mark
//   <DockItLogo size="sm|md|lg" />

export default function DockItLogo({
  variant,            // optional override
  iconOnly = false,
  size = 'md',        // 'sm' | 'md' | 'lg'
  className = '',
}) {
  const sizes = {
    sm: { icon: 24, text: 13, sub: 8 },
    md: { icon: 32, text: 16, sub: 10 },
    lg: { icon: 44, text: 22, sub: 12 },
  };
  const s = sizes[size] || sizes.md;

  // The clipboard icon SVG (32×32 design space, scales via width/height)
  const Icon = () => (
    <svg
      width={s.icon}
      height={s.icon}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="shrink-0"
    >
      {/* Clipboard body */}
      <rect
        x="5"
        y="6"
        width="22"
        height="24"
        rx="2.5"
        className="stroke-ink"
        strokeWidth="2.2"
        fill="none"
      />
      {/* Clip bar at top (amber) */}
      <rect
        x="11"
        y="3"
        width="10"
        height="5.5"
        rx="2"
        className="fill-accent"
      />
      {/* Clip ring */}
      <circle cx="16" cy="4.5" r="1.5" className="fill-accent" />
      {/* Checkmark (amber) */}
      <polyline
        points="10,16 14,20.5 22,12"
        className="stroke-accent"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Text lines (ink) */}
      <line x1="9.5" y1="23.5" x2="22.5" y2="23.5" className="stroke-ink" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="9.5" y1="26.5" x2="18"   y2="26.5" className="stroke-ink" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );

  if (iconOnly) {
    return (
      <span className={className} aria-label="DockIt">
        <Icon />
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-2.5 select-none leading-none ${className}`} aria-label="DockIt">
      <span className="flex items-center justify-center shrink-0">
        <Icon />
      </span>
      <span className="flex flex-col justify-center leading-none">
        <span
          className="leading-none text-ink font-display"
          style={{ fontSize: s.text, fontWeight: 700, letterSpacing: '-0.01em' }}
        >
          Dock<span className="text-accent">It</span>
        </span>
        <span
          className="leading-none text-ink-muted uppercase font-display"
          style={{ fontSize: s.sub, letterSpacing: '0.08em', fontWeight: 500, marginTop: 3 }}
        >
          Compliance · Simplified
        </span>
      </span>
    </span>
  );
}
