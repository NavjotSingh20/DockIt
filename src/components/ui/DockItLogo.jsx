// DockIt Logo — SVG inline component
// Usage:
//   <DockItLogo />             — horizontal (icon + wordmark), default dark theme
//   <DockItLogo variant="light" />  — for dark backgrounds (white text)
//   <DockItLogo iconOnly />    — just the clipboard mark (e.g. favicon, avatar)
//   <DockItLogo size="sm|md|lg" />

export default function DockItLogo({
  variant = 'dark',   // 'dark' | 'light'
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

  const ink = variant === 'light' ? '#FEFDFB' : '#1C1917';
  const amber = '#D97706';
  const muted = variant === 'light' ? 'rgba(254,253,251,0.55)' : '#78716C';

  // The clipboard icon SVG (32×32 design space, scales via width/height)
  const Icon = () => (
    <svg
      width={s.icon}
      height={s.icon}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Clipboard body */}
      <rect
        x="5"
        y="6"
        width="22"
        height="24"
        rx="2.5"
        stroke={ink}
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
        fill={amber}
      />
      {/* Clip ring */}
      <circle cx="16" cy="4.5" r="1.5" fill={amber} />
      {/* Checkmark (amber) */}
      <polyline
        points="10,16 14,20.5 22,12"
        stroke={amber}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Text lines (ink) */}
      <line x1="9.5" y1="23.5" x2="22.5" y2="23.5" stroke={ink} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="9.5" y1="26.5" x2="18"   y2="26.5" stroke={ink} strokeWidth="1.8" strokeLinecap="round" />
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
    <span className={`inline-flex items-center gap-2.5 select-none ${className}`} aria-label="DockIt">
      <Icon />
      <span className="flex flex-col leading-none">
        <span
          style={{ fontSize: s.text, color: ink, fontWeight: 700, letterSpacing: '-0.01em', fontFamily: 'var(--font-display, inherit)' }}
        >
          Dock<span style={{ color: amber }}>It</span>
        </span>
        <span
          style={{ fontSize: s.sub, color: muted, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-display, inherit)', fontWeight: 500, marginTop: 2 }}
        >
          Compliance · Simplified
        </span>
      </span>
    </span>
  );
}
