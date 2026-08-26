import { motion } from 'framer-motion';

/**
 * SeamlessStrokeText — Renders standard HTML text with a premium outline-draw
 * and fill-reveal animation on mount using Framer Motion.
 * 
 * Supports inline text highlighting. Highlights animate to the accent color
 * instead of the standard ink text color.
 */
export default function SeamlessStrokeText({ text, highlight, className = '' }) {
  const highlightStart = highlight ? text.indexOf(highlight) : -1;
  const highlightEnd = highlightStart !== -1 ? highlightStart + highlight.length : -1;

  const words = text.split(' ');
  let absoluteCharIndex = 0;

  // Pre-process words and characters to map highlight state
  const wordsData = words.map((word) => {
    const chars = Array.from(word).map((char) => {
      const isHighlighted = highlightStart !== -1 && 
                            absoluteCharIndex >= highlightStart && 
                            absoluteCharIndex < highlightEnd;
      
      const charObj = {
        char,
        isHighlighted,
        index: absoluteCharIndex
      };
      
      absoluteCharIndex++;
      return charObj;
    });

    // Account for the space between words
    absoluteCharIndex++; 
    
    return {
      word,
      chars
    };
  });

  // Detect prefers-reduced-motion
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
    : false;

  const containerVars = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.02, // faster stagger since it's a longer sentence now
      },
    },
  };

  const charVars = {
    hidden: { 
      opacity: 0, 
      y: 6,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: [0.215, 0.61, 0.355, 1], // easeOutCubic
      },
    },
  };

  if (prefersReducedMotion) {
    if (!highlight) {
      return <span className={`inline ${className}`}>{text}</span>;
    }
    const parts = text.split(highlight);
    return (
      <span className={`inline ${className}`}>
        {parts[0]}
        <span className="text-accent">{highlight}</span>
        {parts[1]}
      </span>
    );
  }

  return (
    <motion.span
      variants={containerVars}
      initial="hidden"
      animate="visible"
      className={`inline ${className}`}
    >
      {wordsData.map((w, wIdx) => (
        <span key={wIdx} className="inline-block whitespace-nowrap mr-[0.22em] last:mr-0">
          {w.chars.map((c, cIdx) => (
            <motion.span
              key={cIdx}
              variants={charVars}
              className="inline-block"
              style={{
                color: 'transparent',
                WebkitTextStroke: '1.5px #D97706',
              }}
              animate={{
                color: c.isHighlighted ? '#D97706' : '#1C1917',
                WebkitTextStroke: '1.5px transparent',
              }}
              transition={{
                delay: c.index * 0.02 + 0.5,
                duration: 0.45,
                ease: 'easeOut',
              }}
            >
              {c.char === ' ' ? '\u00A0' : c.char}
            </motion.span>
          ))}
        </span>
      ))}
    </motion.span>
  );
}
