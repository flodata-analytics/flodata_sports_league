import React from 'react';

// Consistent, centered loader across the whole page by default.
// Props:
// - className: extra classes (centering persists)
// - fullScreen: bool (default true) — when true, centers within viewport height
// - minHeightClass: override min-height utility when not fullScreen
export default function VideoLoader({ className = '', fullScreen = true, minHeightClass }) {
  const base = 'w-full flex items-center justify-center';
  const size = fullScreen ? 'min-h-screen' : (minHeightClass || 'min-h-[70vh]');
  return (
    <div className={`${base} ${size} ${className}`}>
      <div className="w-10 h-10 border-2 border-gray-300 border-t-[#2c60ce] rounded-full animate-spin" aria-label="Loading" role="status" />
    </div>
  );
}
