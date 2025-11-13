import React from 'react';

export default function HeroVideo({ src = '/Live MAtches-unscreen.gif', className = '' }) {
  return (
    <div
      className={`w-full rounded-2xl overflow-hidden mb-4 bg-transparent ${className}`}
      style={{ backgroundColor: 'transparent' }}
    >
      <img
        src={'/Live-MAtches.gif'}

        // autoPlay
        // muted
        // loop
        // playsInline
        // className="w-full h-40 sm:h-52 md:h-64 object-cover bg-transparent"
      />
    </div>
  );
}
