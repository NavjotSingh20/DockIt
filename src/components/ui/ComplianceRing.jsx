import { useEffect, useState } from 'react';

export default function ComplianceRing({ score, size = 140, strokeWidth = 10, color: colorOverride }) {
  const [displayed, setDisplayed] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (displayed / 100) * circ;

  const autoColor = score >= 80 ? '#6B8F71' : score >= 60 ? '#D97706' : score >= 40 ? '#CA8A04' : '#C2410C';
  const color = colorOverride || autoColor;
  const grade = score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D';

  useEffect(() => {
    let frame;
    const animate = () => {
      setDisplayed((prev) => {
        if (prev < score) { frame = requestAnimationFrame(animate); return Math.min(prev + 1, score); }
        return prev;
      });
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E7E0D5" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.1s linear' }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-3xl font-black font-display" style={{ color }}>{displayed}</div>
        <div className="text-xs font-bold font-display text-ink-faint">Grade {grade}</div>
      </div>
    </div>
  );
}
