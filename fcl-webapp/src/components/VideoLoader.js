import React from 'react';

// Simple default loader: small ring spinner
export default function VideoLoader({ className = '' }) {
  return (
    <div className={`w-full min-h-[40vh] flex items-center justify-center ${className}`}>
      <div className="w-8 h-8 border-2 border-gray-300 border-t-[#2c60ce] rounded-full animate-spin" aria-label="Loading" role="status" />
    </div>
  );
}
