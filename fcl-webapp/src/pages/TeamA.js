import React from "react";

// Local asset URLs (from /public/teams/)
const imgImage8 = "/teams/imgImage8.png";
const imgImage48 = "/teams/imgImage48.png";
const imgHome = "/teams/imgHome.png";
const imgPlayersIcon = "/teams/imgPlayersIcon.png";
const imgFrame590 = "/teams/imgFrame590.png";
const imgCategory = "/teams/imgCategory.png";
const imgInjuredPlusIcon = "/teams/imgInjuredPlusIcon.png";

function PlayerCard({ name, role, img, highlight, injured, extra }) {
  return (
    <div
      className={`bg-white h-[51px] relative flex items-center rounded-[8px] w-full px-2 ${highlight ? "opacity-60" : ""}`}
      style={{ marginBottom: 8 }}
    >
      <div className="flex items-center gap-[15px]">
        <div className="bg-white border border-[#bbbbbb] rounded-full w-10 h-10 flex items-center justify-center overflow-hidden">
          <img src={img} alt={name} className="object-cover w-full h-full" />
        </div>
        <div className="flex flex-col items-start justify-center w-[70px]">
          <span className="font-medium text-[#111111] text-[14px] leading-[24px] tracking-[0.07px]">
            {name} {extra && <span className="text-[10px] text-[#e89a2d]">{extra}</span>}
          </span>
          <span className="font-normal text-[#9ca4ab] text-[10px] leading-[17px] tracking-[0.05px]">
            {role} {injured && <span className="text-[#ff3b30] ml-1">Injured</span>}
          </span>
        </div>
        {injured && (
          <img src={imgInjuredPlusIcon} alt="Injured" className="w-3 h-3 ml-2" />
        )}
      </div>
    </div>
  );
}

function FilterButton({ label, selected }) {
  return (
    <button
      className={`px-3 py-2 rounded-[8px] border text-[14px] font-normal ${selected ? "bg-[#2c60ce] border-[#1044b4] text-white" : "border-[#d9dce2] text-[#595959] bg-white"}`}
      style={{ minWidth: 60 }}
    >
      {label}
    </button>
  );
}

export default function TeamA() {
  return (
    <div className="bg-[#f8f8f8] min-h-screen relative">
      {/* Header */}
      <div className="bg-white shadow sticky top-0 w-[393px] mx-auto z-10" style={{ maxWidth: 393, height: 117 }}>
        <div className="flex items-center h-full px-5 justify-between">
          <button className="text-[22px] text-[#111111] font-sans">&#x1F870;</button>
          <span className="font-bold text-[17px] text-[#111111]">Team A</span>
          <span style={{ width: 32 }}></span>
        </div>
      </div>
      {/* Filters */}
      <div className="bg-white shadow w-[393px] mx-auto sticky top-[117px] z-10 flex gap-2 px-5 py-3" style={{ maxWidth: 393 }}>
        <FilterButton label="All (16)" selected />
        <FilterButton label="Bat (3)" />
        <FilterButton label="Bowl (4)" />
        <FilterButton label="AR (9)" />
      </div>
      {/* Players grid */}
      <div className="flex flex-row gap-4 justify-center pt-6 pb-[70px] w-full">
        {/* Left column */}
        <div className="flex flex-col gap-2 w-[176px]">
          <PlayerCard name="Vaibhav" role="All-Rounder" img={imgImage8} extra="(c)" />
          <PlayerCard name="Vishal" role="All-Rounder" img={imgImage8} />
          <PlayerCard name="Jeetu" role="Batsman" img={imgImage8} extra="(wk)" />
          <PlayerCard name="Rishabh" role="Batsman" img={imgImage8} />
          <PlayerCard name="Shubham" role="All-Rounder" img={imgImage8} />
          <PlayerCard name="Rajat" role="Bowler" img={imgImage8} />
          <PlayerCard name="Ayush" role="Bowler" img={imgImage8} />
          <PlayerCard name="Shubhankit" role="All-Rounder" img={imgImage8} />
        </div>
        {/* Right column */}
        <div className="flex flex-col gap-2 w-[176px]">
          <PlayerCard name="KV" role="All-Rounder" img={imgImage8} />
          <PlayerCard name="Vibhu" role="All-Rounder" img={imgImage8} />
          <PlayerCard name="Megha" role="Batsman" img={imgImage48} />
          <PlayerCard name="Himanshi" role="Bowler" img={imgImage48} />
          <PlayerCard name="Ankita" role="Bowler" img={imgImage48} />
          <PlayerCard name="Sagar" role="AR" img={imgImage8} highlight injured />
          <PlayerCard name="Rohit" role="All-Rounder" img={imgImage8} />
          <PlayerCard name="Ankit" role="All-Rounder" img={imgImage8} />
        </div>
      </div>
      {/* Bottom navigation bar */}
      <div className="bg-[#11151d] flex items-center justify-between fixed bottom-0 left-1/2 -translate-x-1/2 w-[393px] h-[70px] px-4" style={{ maxWidth: 393 }}>
        <div className="flex flex-col items-center">
          <img src={imgHome} alt="Home" className="w-6 h-6 mb-1" />
          <span className="text-[#808191] text-[10px]">Home</span>
        </div>
        <div className="flex flex-col items-center">
          <img src={imgPlayersIcon} alt="Players" className="w-6 h-6 mb-1" />
          <span className="text-white text-[10px]">Players</span>
        </div>
        <div className="flex flex-col items-center">
          <img src={imgFrame590} alt="Auction" className="w-6 h-6 mb-1" />
          <span className="text-[#808191] text-[10px]">Auction</span>
        </div>
        <div className="flex flex-col items-center">
          <img src={imgCategory} alt="Profile" className="w-6 h-6 mb-1" />
          <span className="text-[#808191] text-[10px]">Profile</span>
        </div>
      </div>
    </div>
  );
}
