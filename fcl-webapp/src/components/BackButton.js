import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function BackButton({ className = '', style = {}, label = 'Back' }) {
  const navigate = useNavigate();
  return (
    <button
      className={`flex items-center gap-2 text-brand-primary hover:text-brand-primaryDark font-medium py-2 px-2 rounded focus:outline-none focus:ring-2 focus:ring-brand-primary ${className}`}
      style={style}
      onClick={() => navigate(-1)}
      aria-label={label}
    >
      {/* Chevron Left SVG (lucide) */}
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-left-icon lucide-chevron-left w-6 h-6">
        <path d="m15 18-6-6 6-6" />
      </svg>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
