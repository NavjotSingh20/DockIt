import { useEffect, useState } from 'react';

export default function ComplianceRing({ score = 0, size = 140, strokeWidth = 10, color: colorOverride }) {
  const [displayed, setDisplayed] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * radius;
  const [offset, setOffset] = useState(circ);

  const autoColor = score >= 80 ? '#6B8F71' : score >= 60 ? '#D97706' : score >= 40 ? '#CA8A04' : '#C2410C';
  const color = colorOverride || autoColor;
  const grade = score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D';

  useEffect(() => {
    // 1. Animate SVG circle stroke with smooth cubic-bezier transition
    const targetOffset = circ - (score / 100) * circ;
    const strokeTimer = setTimeout(() => {
      setOffset(targetOffset);
    }, 40);

    // 2. Animate counter number smoothly using ease-out cubic
    let startTimestamp = null;
    const duration = 650; // ms
    let frameId;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // easeOutCubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(easeProgress * score));

      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      }
    };

    frameId = requestAnimationFrame(step);
    return () => {
      clearTimeout(strokeTimer);
      cancelAnimationFrame(frameId);
    };
  }, [score, circ]);

  const isCompact = size <= 96;

  return (
    <div className="relative inline-flex items-center justify-center select-none" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E7E0D5"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.65s cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
        <div
          className={`${isCompact ? 'text-xl font-bold' : 'text-3xl font-bold'} font-mono leading-none tracking-tight`}
          style={{ color }}
        >
          {displayed}
        </div>
        <div className={`${isCompact ? 'text-[9px]' : 'text-[10px]'} font-semibold font-display uppercase tracking-wider text-ink-muted leading-none mt-1`}>
          Grade {grade}
        </div>
      </div>
    </div>
  );
}
