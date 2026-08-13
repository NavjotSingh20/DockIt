import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * ScrollFloat — animates each character into position as the user scrolls.
 * Uses GSAP ScrollTrigger for smooth, scroll-driven per-character animation.
 * Respects prefers-reduced-motion.
 */
export default function ScrollFloat({
  children,
  animationDuration = 1,
  ease = 'back.inOut(2)',
  scrollStart = 'center bottom+=50%',
  scrollEnd = 'bottom bottom-=40%',
  stagger = 0.03,
  containerClassName = '',
  textClassName = '',
}) {
  const containerRef = useRef(null);
  const textRef = useRef(null);

  useEffect(() => {
    // Respect prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const el = textRef.current;
    if (!el) return;

    // Split text into individual character spans
    const text = el.textContent;
    el.innerHTML = '';

    const chars = [];
    for (const char of text) {
      const span = document.createElement('span');
      span.textContent = char === ' ' ? '\u00A0' : char;
      span.style.display = 'inline-block';
      span.style.willChange = 'transform, opacity';
      el.appendChild(span);
      chars.push(span);
    }

    // Set initial state
    gsap.set(chars, {
      opacity: 0,
      y: 30,
    });

    // Create the scroll-triggered animation
    const trigger = ScrollTrigger.create({
      trigger: containerRef.current,
      start: scrollStart,
      end: scrollEnd,
      scrub: true,
      onUpdate: () => {}, // keep alive
    });

    gsap.to(chars, {
      opacity: 1,
      y: 0,
      duration: animationDuration,
      ease,
      stagger,
      scrollTrigger: {
        trigger: containerRef.current,
        start: scrollStart,
        end: scrollEnd,
        scrub: true,
      },
    });

    return () => {
      // Cleanup all ScrollTrigger instances for this element
      ScrollTrigger.getAll().forEach((st) => {
        if (st.trigger === containerRef.current) st.kill();
      });
    };
  }, [animationDuration, ease, scrollStart, scrollEnd, stagger]);

  return (
    <div ref={containerRef} className={containerClassName}>
      <span ref={textRef} className={textClassName}>
        {children}
      </span>
    </div>
  );
}
