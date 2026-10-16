import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface HomepageListingRailProps {
  title: string;
  description: string;
  viewAllHref: string;
  children: React.ReactNode;
}

const HomepageListingRail: React.FC<HomepageListingRailProps> = ({
  title,
  description,
  viewAllHref,
  children,
}) => {
  const railRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    setCanScrollLeft(rail.scrollLeft > 2);
    setCanScrollRight(rail.scrollWidth - rail.clientWidth - rail.scrollLeft > 2);
  }, []);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return undefined;

    updateScrollButtons();
    rail.addEventListener('scroll', updateScrollButtons, { passive: true });
    const resizeObserver = new ResizeObserver(updateScrollButtons);
    resizeObserver.observe(rail);

    return () => {
      rail.removeEventListener('scroll', updateScrollButtons);
      resizeObserver.disconnect();
    };
  }, [updateScrollButtons]);

  const scrollRail = (direction: 'left' | 'right') => {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({
      left: direction === 'left' ? -rail.clientWidth * 0.8 : rail.clientWidth * 0.8,
      behavior: 'smooth',
    });
  };

  return (
    <section className="rounded-[28px] border border-white/90 bg-white/90 p-4 shadow-[0_16px_44px_rgba(37,31,83,0.07)] sm:p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#6C3BFF]">{title}</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{description}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={viewAllHref}
            className="mr-1 rounded-lg px-2 py-2 text-sm font-semibold text-[#5630C6] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C3BFF]"
          >
            View all
          </Link>
          <button
            type="button"
            onClick={() => scrollRail('left')}
            disabled={!canScrollLeft}
            aria-label={`Scroll ${title.toLowerCase()} left`}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-[#6C3BFF] hover:text-[#5630C6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C3BFF] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollRail('right')}
            disabled={!canScrollRight}
            aria-label={`Scroll ${title.toLowerCase()} right`}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-[#6C3BFF] hover:text-[#5630C6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C3BFF] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div
        ref={railRef}
        className="homepage-listing-rail flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3"
        aria-label={`${title} listings`}
      >
        {children}
      </div>
    </section>
  );
};

export default HomepageListingRail;
