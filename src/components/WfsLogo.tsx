import React from 'react';

interface WfsLogoProps {
  className?: string;
  variant?: 'red' | 'white';
}

export const WfsLogo: React.FC<WfsLogoProps> = ({ className = 'h-9 w-auto', variant = 'red' }) => {
  return (
    <div className={`inline-flex items-center justify-center select-none ${className}`}>
      <img
        src="/wfs-logo.png"
        alt="WFS - A SATS Company"
        className={`h-full w-auto max-h-11 object-contain ${variant === 'white' ? 'brightness-0 invert' : ''}`}
        loading="eager"
        decoding="sync"
      />
    </div>
  );
};


