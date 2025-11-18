// This is a React component wrapper for the FloCash SVG icon.
// Place this file in src/components/FloCashIcon.js
import React from 'react';

// Use newly added Auction SVGs. When `active` is true, show the selected variant.
export default function FloCashIcon({ className, active, style }) {
  const selectedSrc = '/Auction Selected.svg';
  const notSelectedSrc = '/Auction Not Selected.svg';
  return (
    <img
      src={active ? selectedSrc : notSelectedSrc}
      alt="Auction"
      className={className || 'w-6 h-6'}
      style={{
        ...style,
      }}
    />
  );
}
