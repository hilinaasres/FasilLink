import React, { useRef } from 'react';

interface HorizontalRowProps {
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}

export default function HorizontalRow({ children, className = '', ariaLabel }: HorizontalRowProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollerRef.current;
    if (!el) return;
    const offset = Math.max(el.clientWidth * 0.7, 320);
    el.scrollBy({ left: dir === 'left' ? -offset : offset, behavior: 'smooth' });
  };

  return (
    <div className={`relative ${className}`}>
      <button
        aria-label={ariaLabel ? `${ariaLabel} scroll left` : 'Scroll left'}
        onClick={() => scroll('left')}
        className="row-arrow left absolute left-1 top-1/2 -translate-y-1/2 z-20 bg-white/90 hover:bg-white text-neutral-700 rounded-full p-2 shadow-md"
      >
        ‹
      </button>

      <div ref={scrollerRef} className="items-row flex gap-6 overflow-x-auto py-4 px-8 snap-x snap-mandatory scrollbar-hidden">
        {children}
      </div>

      <button
        aria-label={ariaLabel ? `${ariaLabel} scroll right` : 'Scroll right'}
        onClick={() => scroll('right')}
        className="row-arrow right absolute right-1 top-1/2 -translate-y-1/2 z-20 bg-white/90 hover:bg-white text-neutral-700 rounded-full p-2 shadow-md"
      >
        ›
      </button>
    </div>
  );
}
