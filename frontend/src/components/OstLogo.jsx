import React from 'react';

/**
 * OST Soundbox Official Brand Logo & Icon Component
 */
export default function OstLogo({ className = 'w-8 h-8', showText = false, textClassName = 'text-base font-extrabold tracking-tight text-slate-900 dark:text-white', subtitle = null }) {
  return (
    <div className="inline-flex items-center gap-2.5 select-none">
      {/* Brand Icon SVG */}
      <div className={`relative shrink-0 flex items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 text-white shadow-md shadow-emerald-600/20 ring-1 ring-white/20 overflow-hidden ${className}`}>
        <svg 
          viewBox="0 0 32 32" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg" 
          className="w-full h-full p-1.5 drop-shadow-xs"
        >
          <defs>
            <linearGradient id="ostGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="100%" stopColor="#e2e8f0" stopOpacity="0.9" />
            </linearGradient>
          </defs>

          {/* Soundbox Body Base */}
          <rect x="4" y="8" width="13" height="16" rx="3.5" fill="url(#ostGrad)" />
          
          {/* Speaker Sound Grille & Center Cone */}
          <circle cx="10.5" cy="16" r="3.5" fill="#047857" />
          <circle cx="10.5" cy="16" r="1.5" fill="#ffffff" />
          
          {/* Top Status LED Indicator */}
          <circle cx="10.5" cy="10.5" r="1" fill="#10b981" />

          {/* Broadcast Sound Wave 1 (Inner Arc) */}
          <path 
            d="M20 12C21.33 13.2 22 14.55 22 16C22 17.45 21.33 18.8 20 20" 
            stroke="#ffffff" 
            strokeWidth="2.2" 
            strokeLinecap="round" 
          />

          {/* Broadcast Sound Wave 2 (Outer Arc) */}
          <path 
            d="M24 8.5C26.5 10.8 28 13.3 28 16C28 18.7 26.5 21.2 24 23.5" 
            stroke="#ffffff" 
            strokeWidth="2.2" 
            strokeLinecap="round" 
            strokeOpacity="0.85"
          />
        </svg>
      </div>

      {/* Brand Name Text */}
      {showText && (
        <div className="min-w-0 flex-1 leading-none">
          <div className={`font-black flex items-center gap-1 ${textClassName}`}>
            <span>OST Soundbox</span>
          </div>
          {subtitle && (
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              {subtitle}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
