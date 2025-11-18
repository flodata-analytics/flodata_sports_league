import React from 'react';

export default function AuctionPage() {
  // Top nav: 64px, Bottom nav: 56px
  return (
    <div
      className="flex flex-col items-center justify-center "
      style={{ minHeight: 'calc(100vh - 150px - 60px)' }}
    >
      <div className="w-full flex flex-col items-center justify-center max-w-md px-4">
        <img
          src="/BidAnimation.gif"
          className="w-[12rem] h-auto  rounded-2xl"
        />
        <div className="text-center mt-0">
          {/* <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-[#f3f7ff] text-[#2c60ce] border border-[#cfd8ea] mr-2">Auction</span> */}
          <span className="text-gray-500 text-lg space-y-5  font-medium">Auction Starting Soon!</span>
        </div>
      </div>
    </div>
  );
}