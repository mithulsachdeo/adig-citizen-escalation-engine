import React from "react";

// Decorative side-gutter watermarks flanking the content on /check.
// Pinned fixed to the viewport gutters, hidden below 1024px, pure server component.
export function GutterWatermarks() {
  return (
    <div aria-hidden="true" className="adig-gutter-watermarks">
      {/* Left gutter: neutral mascot silhouette, bottom-anchored */}
      <div className="adig-gutter-watermark adig-gutter-watermark--left">
        <svg
          className="adig-gutter-watermark__mascot"
          viewBox="0 0 280 360"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g fill="currentColor">
            {/* Cape */}
            <path d="M80 120 L50 280 Q 140 300 230 280 L200 120 Z" />

            {/* Left arm */}
            <rect x="90" y="160" width="24" height="70" rx="12" transform="rotate(20 102 160)" />
            <circle cx="80" cy="225" r="14" />

            {/* Body */}
            <rect x="100" y="140" width="80" height="120" rx="30" />

            {/* Legs & feet */}
            <rect x="115" y="240" width="20" height="60" rx="10" />
            <rect x="145" y="240" width="20" height="60" rx="10" />
            <path d="M110 290 h30 a10 10 0 0 1 10 10 v0 a0 0 0 0 1 0 0 h-40 a0 0 0 0 1 0 0 v-10 a10 10 0 0 1 10 -10 z" />
            <path d="M140 290 h30 a10 10 0 0 1 10 10 v0 a0 0 0 0 1 0 0 h-40 a0 0 0 0 1 0 0 v-10 a10 10 0 0 1 10 -10 z" />

            {/* Head */}
            <circle cx="140" cy="100" r="45" />

            {/* Right arm & bolt */}
            <rect x="160" y="150" width="24" height="80" rx="12" transform="rotate(-40 160 150)" />
            <circle cx="215" cy="105" r="16" />
            <path d="M225 30 L205 70 h20 L210 120 L245 60 h-20 L235 30 Z" />
          </g>
        </svg>
      </div>

      {/* Right gutter: lightning-bolt silhouette, vertically centered */}
      <div className="adig-gutter-watermark adig-gutter-watermark--right">
        <svg
          className="adig-gutter-watermark__bolt"
          viewBox="205 30 40 90"
          preserveAspectRatio="none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M225 30 L205 70 h20 L210 120 L245 60 h-20 L235 30 Z"
            fill="currentColor"
          />
        </svg>
      </div>
    </div>
  );
}
