import React from 'react';

interface WfsLogoProps {
  className?: string;
  variant?: 'red' | 'white';
}

export const WfsLogo: React.FC<WfsLogoProps> = ({ className = 'h-8 w-auto', variant = 'red' }) => {
  const color = variant === 'white' ? '#FFFFFF' : '#E31B23';

  return (
    <div className={`inline-flex flex-col justify-center select-none ${className}`}>
      <svg
        viewBox="0 0 310 135"
        className="h-full w-auto"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Text "wfs" in bold red typography */}
        <g fill={color}>
          {/* Lowercase 'w' */}
          <path
            d="M16 26 L38 90 L60 26 L82 26 L104 90 L126 26 L150 26 L120 110 L96 110 L74 51 L52 110 L28 110 L0 26 Z"
          />

          {/* Lowercase 'f' */}
          <path
            d="M164 42 L164 26 L186 26 L186 42 L208 42 L208 60 L186 60 L186 110 L164 110 L164 60 L150 60 L150 42 Z"
          />
          {/* Top curve of 'f' */}
          <path
            d="M186 26 C186 12 196 2 212 2 L222 2 L222 20 L212 20 C206 20 202 23 202 30 L202 42 L186 42 Z"
          />

          {/* Lowercase 's' */}
          <path
            d="M252 26 C271 26 283 36 285 50 L263 54 C261 46 255 43 249 43 C241 43 235 46 235 53 C235 60 242 63 255 68 C275 75 286 83 286 97 C286 112 271 120 251 120 C231 120 217 110 215 94 L237 89 C238 98 245 102 252 102 C261 102 267 97 267 91 C267 83 259 79 245 74 C227 67 216 60 216 46 C216 33 231 26 252 26 Z"
          />
        </g>

        {/* Subtext "A SATS COMPANY" */}
        <text
          x="4"
          y="132"
          fill={color}
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontWeight="800"
          fontSize="22"
          letterSpacing="4.2"
        >
          A SATS COMPANY
        </text>
      </svg>
    </div>
  );
};
