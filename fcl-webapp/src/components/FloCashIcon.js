// This is a React component wrapper for the FloCash SVG icon.
// Place this file in src/components/FloCashIcon.js
import React from 'react';

// Renders the Auction/FloCash icon; when active, applies a filter to appear white
export default function FloCashIcon({ className, active, style }) {
  return (
    <img
      src="/FloCash.svg"
      alt="Auction"
      className={className || 'w-6 h-6'}
      style={{
        // Make the logo appear white when active via CSS filters
        filter: active ? 'brightness(0) invert(1)' : undefined,
        ...style,
      }}
    />
  );
}
