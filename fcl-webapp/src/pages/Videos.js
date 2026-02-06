import React from 'react';

export default function Videos() {
  return (
    <div className="bg-black min-h-screen -mt-16 w-screen flex flex-col items-center justify-center pt-0 px-4 fixed pb-0" style={{ minHeight: '100vh' }}>
      <div className="text-center">
        <div className="text-gray-400 text-lg mb-2">No videos available now</div>
      </div>
    </div>
  );
}
