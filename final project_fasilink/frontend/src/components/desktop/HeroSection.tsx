import React from 'react';

export default function HeroSection() {
  return (
    <section className="w-full bg-white text-slate-900 flex flex-col md:flex-row items-stretch rounded-2xl my-5 shadow-lg overflow-hidden">

      {/* Left Side: Content Area */}
      <div className="relative z-20 w-full md:w-1/2 px-5 py-10 sm:px-8 md:pl-14 flex flex-col justify-center">
        <h1 className="text-3xl sm:text-4xl md:text-4xl font-bold tracking-tight leading-tight text-slate-900">
          Find Anything in FasilLink
        </h1>
        
        <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-slate-700 mt-2">
          Smart Search. Better Results.
        </h2>
        
        <p className="text-sm sm:text-sm md:text-base text-slate-500 mt-5 max-w-md leading-relaxed">
          Discover homes, cars, events and more with our AI powered recommendations.
        </p>
      </div>

      {/* Right Side: Fasil Castle Image Layer */}
      <div className="w-full md:w-1/2 h-48 md:h-auto flex-shrink-0 relative">
        {/* Horizontal Gradient on desktop to fade into left content */}
        <div className="absolute left-0 top-0 bottom-0 w-24 md:w-36 bg-gradient-to-r from-white/100 to-transparent pointer-events-none hidden md:block" />

        {/* Vertical Gradient on small screens to soften bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-white/100 via-transparent to-transparent md:hidden pointer-events-none" />

        <img
          src="/fasil%20image.jpg"
          alt="Fasilides Castle, Gondar"
          className="w-full h-full object-cover object-center opacity-80 md:opacity-100"
        />
      </div>

    </section>
  );
}
