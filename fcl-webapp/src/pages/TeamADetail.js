import React from "react";
import { useParams, useNavigate } from 'react-router-dom';
import { useCollection, useDocument } from '../hooks/useFirestore';

// Local asset URLs (from /public/teams/)
const imgImage8 = "/teams/imgImage8.png";
const imgImage48 = "/teams/imgImage48.png";
const imgHome = "/Home Not Selected.svg";
const imgPlayersIcon = "/Leaderboard Icon Not Selected (1).svg";
const imgFrame590 = "/Auction Not Selected.svg";
const imgCategory = "/Video Library Not Selected.svg";
const imgInjuredPlusIcon = "/teams/imgInjuredPlusIcon.png";

function PlayerCard({ name, role, img, highlight, injured, extra }) {
  // Highlight: C (captain), wk (wicketkeeper), and injured as pill badges
  const isCaptain = extra && (extra.toLowerCase().includes('c'));
  const isWicketkeeper = extra && (extra.toLowerCase().includes('wk'));
  // Figma pill badge styles
  const badgeBase = 'inline-flex items-center px-2 py-[2px] rounded-full text-[10px] font-semibold ml-1';
  const captainBadge = `${badgeBase} bg-[#fff8e1] text-[#e89a2d] `;
  const wkBadge = `${badgeBase} bg-[#e6f7ff] text-[#2c60ce] border border-[#2c60ce]`;
  const highlightClass = injured
    ? 'bg-[#0000] border'
    : isCaptain
    ? 'bg-[#fff8e1] border border-[#e89a2d]'
    : isWicketkeeper
    ? 'bg-[#e6f7ff] border border-[#2c60ce]'
    : 'bg-white border border-[#bbbbbb]';
  // Color for wicketkeeper name and role
  const wicketkeeperColor = '#eba747';
  const isWkRole = (role || '').toLowerCase().includes('wicketkeeper') || (role || '').toLowerCase() === 'wk';
  return (
    <div
      className={`h-[51px] relative flex items-center rounded-[8px] w-full px-2 ${highlightClass}`}
      style={{ marginBottom: 8 }}
    >
      <div className="flex items-center gap-[15px]">
        <div className="bg-white rounded-full w-10 h-10 flex items-center justify-center overflow-hidden border-none">
          <img src={img} alt={name} className="object-cover w-full h-full" />
        </div>
        <div className="flex flex-col items-start justify-center w-[110px]">
          <div className="flex items-center gap-1">
            <span className={`font-medium text-[13px] leading-[20px] tracking-[0.07px] ${isWicketkeeper ? 'text-[#eba747]' : 'text-[#111111]'}`}>{name}</span>
            {injured && (
              <span className="flex items-center justify-center w-4 h-4 rounded-full border border-[#ff3b30] bg-white ml-1">
                <img src="/injured.png" alt="Injured" className="w-3 h-3" />
              </span>
            )}
            {isCaptain && <span className={captainBadge}>(C)</span>}
            {isWicketkeeper && <span className={wkBadge} style={{color: wicketkeeperColor, borderColor: wicketkeeperColor}}>(wk)</span>}
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className={`font-normal text-[9px] leading-[15px] tracking-[0.05px] ${isWkRole ? 'text-[#eba747]' : 'text-[#9ca4ab]'}`}>{role}</span>
            {injured && <span className="text-[#ff3b30] font-semibold ml-1 text-[9px]">Injured</span>}
          </div>
        </div>
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

export default function TeamADetail() {
  const { teamId } = useParams();
  const { data: players, loading, error } = useCollection('players', null, [
    { field: 'teamId', operator: '==', value: teamId }
  ]);
  const { data: team, loading: teamLoading } = useDocument('teams', teamId);
  const navigate = useNavigate();
  // Filter state
  const [filter, setFilter] = React.useState('all');
  // Filtering logic
  const filteredPlayers = React.useMemo(() => {
    if (!players) return [];
    if (filter === 'all') return players;
    if (filter === 'bat') return players.filter(p => (p.type || '').toLowerCase().includes('bat'));
    if (filter === 'bowl') return players.filter(p => (p.type || '').toLowerCase().includes('bowl'));
    if (filter === 'ar') return players.filter(p => (p.type || '').toLowerCase().includes('all'));
    return players;
  }, [players, filter]);
  // Split for two columns
  const leftCol = filteredPlayers.filter((_, i) => i % 2 === 0);
  const rightCol = filteredPlayers.filter((_, i) => i % 2 === 1);
  return (
    <div className="bg-[#f8f8f8] min-h-screen h-screen relative overflow-y-auto">
      {/* Header */}
      <div className="bg-white shadow sticky top-0 w-[393px] mx-auto z-10" style={{ maxWidth: 393, height: 117 }}>
        <div className="flex items-center h-full px-5 justify-between">
          <button className="text-[22px] text-[#111111] font-sans">&#x1F870;</button>
          <span className="font-bold text-[17px] text-[#111111]">
            {teamLoading ? 'Loading...' : (team?.name || 'Team')}
          </span>
          <span style={{ width: 32 }}></span>
        </div>
      </div>
      {/* Filters */}
      <div className="bg-white shadow w-[393px] mx-auto sticky top-[117px] z-10 flex gap-2 px-5 py-3" style={{ maxWidth: 393 }}>
        <button onClick={() => setFilter('all')}><FilterButton label={`All (${players ? players.length : 0})`} selected={filter==='all'} /></button>
        <button onClick={() => setFilter('bat')}><FilterButton label="Bat" selected={filter==='bat'} /></button>
        <button onClick={() => setFilter('bowl')}><FilterButton label="Bowl" selected={filter==='bowl'} /></button>
        <button onClick={() => setFilter('ar')}><FilterButton label="AR" selected={filter==='ar'} /></button>
      </div>
      {/* Players grid */}
      <div className="flex flex-row 4 justify-center pt-6 pb-[70px] w-full">
        {loading && <div className="text-gray-400 text-center">Loading players...</div>}
        {error && <div className="text-red-500 text-center">Error loading players</div>}
        {filteredPlayers.length === 0 && !loading && !error && <div className="text-gray-400 text-center">No players found</div>}
        {filteredPlayers.length > 0 && (
          <>
            <div className="flex flex-col gap-2 w-[176px]">
              {leftCol.map((player) => (
                <div key={player.id} onClick={() => navigate(`/player/${encodeURIComponent(player.id)}`)} style={{cursor:'pointer'}}>
                  <PlayerCard
                    name={player.name}
                    role={player.type}
                    img={player.imgUrl || imgImage8}
                    highlight={player.highlight}
                    injured={player.injured}
                    extra={player.extra}
                  />
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2 w-[176px]">
              {rightCol.map((player) => (
                <div key={player.id} onClick={() => navigate(`/player/${encodeURIComponent(player.id)}`)} style={{cursor:'pointer'}}>
                  <PlayerCard
                    name={player.name}
                    role={player.type}
                    img={player.imgUrl || imgImage8}
                    highlight={player.highlight}
                    injured={player.injured}
                    extra={player.extra}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      {/* Bottom navigation bar */}
      <div className="bg-[#11151d] flex items-center justify-between fixed bottom-0 left-1/2 -translate-x-1/2 w-[393px] h-[70px] px-4" style={{ maxWidth: 393 }}>
        <div className="flex flex-col items-center cursor-pointer" onClick={() => navigate('/') }>
          <img src={imgHome} alt="Home" className="w-6 h-6 mb-1" />
          <span className="text-[#808191] text-[10px]">Home</span>
        </div>
        <div className="flex flex-col items-center cursor-pointer" onClick={() => navigate('/players') }>
          <img src={imgPlayersIcon} alt="Players" className="w-6 h-6 mb-1" />
          <span className="text-white text-[10px]">Players</span>
        </div>
        <div className="flex flex-col items-center cursor-pointer" onClick={() => navigate('/auction') }>
          <img src={imgFrame590} alt="Auction" className="w-6 h-6 mb-1" />
          <span className="text-[#808191] text-[10px]">Auction</span>
        </div>
        <div className="flex flex-col items-center cursor-pointer" onClick={() => navigate('/videos') }>
          {/* Play icon for Videos tab */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-1"><circle cx="12" cy="12" r="12" fill="#222"/><polygon points="10,8 16,12 10,16" fill="#fff"/></svg>
          <span className="text-[#808191] text-[10px]">Videos</span>
        </div>
      </div>

    </div>
  );
}

