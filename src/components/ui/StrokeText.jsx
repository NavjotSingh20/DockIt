import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import './StrokeText.css';

/**
 * StrokeText — renders text as an SVG with stroke-drawing + fill-reveal animation.
 * 
 * Props:
 *  - text: string to render
 *  - strokeColor: color for the stroke outline
 *  - fillColor: color for the fill reveal
 *  - strokeWidth: width of the stroke
 *  - drawDuration: seconds to complete stroke drawing
 *  - fillDelay: delay before fill starts (after stroke)
 *  - stagger: seconds between each character animation
 *  - ease: GSAP easing function
 *  - trigger: 'mount' | 'hover' | 'scroll' | 'loop'
 *  - fillMode: 'wipe' | 'fade' | 'none'
 *  - fontSize: number (px)
 *  - fontWeight: number
 *  - letterSpacing: number (px, can be negative)
 *  - fontFamily: string (CSS font-family)
 *  - className: additional class on wrapper
 */
export default function StrokeText({
  text = 'Hello',
  strokeColor = '#D97706',
  fillColor = '#1C1917',
  strokeWidth = 1.5,
  drawDuration = 1.6,
  fillDelay = 0.2,
  stagger = 0.05,
  ease = 'power2.out',
  trigger = 'mount',
  fillMode = 'wipe',
  fontSize = 48,
  fontWeight = 700,
  letterSpacing = -1,
  fontFamily = '"Space Grotesk", system-ui, sans-serif',
  className = '',
}) {
  const svgRef = useRef(null);
  const [dims, setDims] = useState({ width: 0, height: 0, chars: [] });
  const tlRef = useRef(null);

  // Measure text to calculate SVG viewBox and character positions
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Create off-screen canvas for measurement
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;

    let totalWidth = 0;
    const charData = [];

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const metrics = ctx.measureText(char);
      const charWidth = metrics.width + letterSpacing;

      charData.push({
        char,
        x: totalWidth,
        width: charWidth,
      });

      totalWidth += charWidth;
    }

    // Remove trailing letterSpacing
    totalWidth -= letterSpacing;

    const height = fontSize * 1.2;
    setDims({ width: totalWidth, height, chars: charData });

    // If reduced motion, skip animation setup
    if (prefersReducedMotion) return;

    // Wait for render, then animate
    const raf = requestAnimationFrame(() => {
      const svg = svgRef.current;
      if (!svg) return;

      const textEls = svg.querySelectorAll('.stroke-text-char');
      if (!textEls.length) return;

      // Calculate approximate path length for dasharray
      textEls.forEach((el) => {
        const len = el.textContent.trim() === '' ? 0 : fontSize * 3;
        el.style.strokeDasharray = len;
        el.style.strokeDashoffset = len;
        el.style.fillOpacity = 0;
      });

      const tl = gsap.timeline({ paused: true });

      // Phase 1: stroke draw
      tl.to(textEls, {
        strokeDashoffset: 0,
        duration: drawDuration,
        stagger,
        ease,
      });

      // Phase 2: fill reveal
      if (fillMode === 'wipe') {
        tl.to(
          textEls,
          {
            fillOpacity: 1,
            duration: drawDuration * 0.5,
            stagger: stagger * 0.6,
            ease: 'power1.inOut',
          },
          `-=${drawDuration * 0.3 - fillDelay}`
        );
      } else if (fillMode === 'fade') {
        tl.to(
          textEls,
          {
            fillOpacity: 1,
            duration: drawDuration * 0.6,
            stagger: stagger * 0.5,
            ease: 'power1.in',
          },
          `+=${fillDelay}`
        );
      }

      tlRef.current = tl;

      if (trigger === 'mount') {
        tl.play();
      }
    });

    return () => {
      cancelAnimationFrame(raf);
      if (tlRef.current) {
        tlRef.current.kill();
        tlRef.current = null;
      }
    };
  }, [text, strokeColor, fillColor, strokeWidth, drawDuration, fillDelay, stagger, ease, trigger, fillMode, fontSize, fontWeight, letterSpacing, fontFamily]);

  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const baselineY = dims.height * 0.82; // approx baseline for font rendering

  return (
    <span className={`stroke-text-container ${className}`} aria-label={text}>
      <svg
        ref={svgRef}
        className="stroke-text-svg"
        viewBox={`0 0 ${dims.width || 100} ${dims.height || 50}`}
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-hidden="true"
        style={{ width: dims.width || 'auto', maxWidth: '100%' }}
      >
        {dims.chars.map((c, i) => (
          <text
            key={i}
            className="stroke-text-char"
            x={c.x}
            y={baselineY}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            style={{
              fontSize: `${fontSize}px`,
              fontWeight,
              fontFamily,
              fillOpacity: prefersReducedMotion ? 1 : 0,
              strokeDashoffset: prefersReducedMotion ? 0 : undefined,
            }}
          >
            {c.char === ' ' ? '\u00A0' : c.char}
          </text>
        ))}
      </svg>
    </span>
  );
}
