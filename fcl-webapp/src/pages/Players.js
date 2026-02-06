
import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCollection } from '../hooks/useFirestore';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import BottomNav from '../components/BottomNav';
import { getPlayerAvatar } from '../utils/getPlayerAvatar';
import { calculateDream11Points, playerDocToStats } from '../utils/dream11Points';

export default function Players() {
  const navigate = useNavigate();
  const { data: players, loading, error } = useCollection('players', 'name');
  const { userProfile } = useAuth();
  const [busyId, setBusyId] = useState(null);
  const [showRules, setShowRules] = useState(false);
  const [search, setSearch] = useState('');

  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${da}`;
  }, []);

  const isUnavailableToday = (p) => {
    const list = Array.isArray(p?.unavailableDates) ? p.unavailableDates : [];
    if (list.includes(todayStr)) return true;
    // legacy single flag support
    if (p?.unavailable && (p.unavailable === true || p.unavailable?.date === todayStr)) return true;
    return false;
  };

  const toggleAvailability = async (player) => {
    if (!player?.id) return;
    try {
      setBusyId(player.id);
      const ref = doc(db, 'players', player.id);
      const marked = isUnavailableToday(player);
      if (marked) {
        await updateDoc(ref, { unavailableDates: arrayRemove(todayStr) });
      } else {
        await updateDoc(ref, { unavailableDates: arrayUnion(todayStr) });
      }
    } finally {
      setBusyId(null);
    }
  };
  // Build ranked players array using fantasy points
  const rankedPlayers = useMemo(() => {
    const arr = Array.isArray(players) ? players : [];
    const enriched = arr.map(p => ({
      ...p,
      _points: calculateDream11Points(playerDocToStats(p)),
    }));
    enriched.sort((a,b)=> (b._points - a._points) || String(a.name||'').localeCompare(String(b.name||'')));
    return enriched.map((p, idx) => ({ ...p, _rank: idx + 1 }));
  }, [players]);

  const filteredPlayers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rankedPlayers;
    return rankedPlayers.filter(p => String(p.name||'').toLowerCase().includes(term));
  }, [rankedPlayers, search]);

  const badgeForRank = (rank) => {
    if (rank === 1) return '/BatchGolden.svg';
    if (rank === 2) return '/BatchSilver.svg';
    if (rank === 3) return '/BatchBronze.svg';
    return null;
  };
  const frameForRank = (rank) => {
    if (rank === 1) return '/FrameGold.png';
    if (rank === 2) return '/FrameSilver.png';
    if (rank === 3) return '/FrameBronzze.png'; // note: file name in public has double 'z'
    return null;
  };

  useEffect(() => {
    // Support both explicit show and toggle events from Navbar.
    const showHandler = () => setShowRules(true);
    const toggleHandler = () => setShowRules((s) => !s);
    window.addEventListener('showRules', showHandler);
    window.addEventListener('toggleRules', toggleHandler);
    return () => {
      window.removeEventListener('showRules', showHandler);
      window.removeEventListener('toggleRules', toggleHandler);
    };
  }, []);

  return (
    <div className="bg-[#f8f8f8] min-h-screen w-screen flex flex-col overflow-x-hidden" style={{ minHeight: '100vh' }}>
      <div className="flex-1 flex flex-col items-center pb-20 bg-white">
        <div className="w-full max-w-5xl mx-auto px-4 md:px-6 py-2 bg-white">
          {/* Page header is provided by global Navbar; no local header here */}

          {/* Listen for Navbar rules button (global) — handled in component hook */}

          {/* Search Bar */}
          <div className="mb-4 max-w-md mx-auto w-full h-full">
            <div className="relative group  mt-3 ">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#2c60ce]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
              </svg>
              <input
                value={search}
                onChange={(e)=> setSearch(e.target.value)}
                placeholder="Search player by name..."
                className="w-full pl-11 pr-3 py-2 rounded-xl border h-12 border-[#cfd8ea] bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2c60ce]/40 text-sm"
              />
              {search && (
                <button
                  type="button"
                  onClick={()=> setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  aria-label="Clear search"
                >×</button>
              )}
            </div>
          </div>

          {/* Rankings / Players List */}
          {Array.isArray(filteredPlayers) && filteredPlayers.length > 0 && (
            <div className="bg-white rounded-2xl shadow-[0_6px_15px_0_rgba(0,0,0,0.05)] border border-[#e6eaf2] overflow-hidden mb-8">
              {/* <div className="px-4 py-3 flex items-center justify-between border-b border-[#eef2f6]"> */}
                {/* <div className="text-lg font-semibold flex items-center w-full justify-center">Top Players</div> */}
              {/* </div> */}
              {/* Mobile: header + stacked list */}
              {/* Header row on mobile: Rank | Player | Points */}
              <div className="sm:hidden text-left px-4 py-2 text-[18px] bg-[#f4f4f4] text-[#111111] grid grid-cols-[44px,1fr,64px] gap-2 border-b border-[#eef2f6]">
                <div className='text-black text-[14px] font-regular'>Rank</div>
                <div className='text-black text-[14px] font-regular ml-11 pl-1'>Player</div>
                <div className="text-right pr-3 text-black text-[14px] font-regular">Points</div>
              </div>
              <div className="sm:hidden divide-y divide-[#eef2f6]">
                {filteredPlayers.map((p, i) => {
                    const id = p?.id ?? `player-${p._idx}`;
                    const safeKey = `${id}-${i}`; // rank index stable by filtered ordering
                    const name = (p?.name && String(p.name)) || 'Unknown Player';
                    const points = Math.round(p._points || 0);
                    const avatar = getPlayerAvatar(p);
                    const unavailable = isUnavailableToday(p);
                    const badge = badgeForRank(p._rank);
                    const frame = frameForRank(p._rank);
                    return (
                      <div key={safeKey} className={`relative px-4 py-3 ${unavailable ? 'opacity-60' : 'cursor-pointer hover:bg-[#f9fbff]'}`} onClick={()=> !unavailable && navigate(`/player/${encodeURIComponent(id)}`)}>
                        <div className="grid grid-cols-[44px,1fr,64px] items-center gap-2 pr-8">
                          {/* Rank column */}
                          <div className="flex items-center justify-start">
                            <div className="w-[14px] text-[14px] font-medium  ml-2  text-[#111]  tabular-nums">{String(p._rank).padStart(2,'0')}</div>
                          </div>
                          {/* Player column */}
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`relative w-9 h-9 rounded-full overflow-hidden bg-gray-100 ${frame ? '' : 'border border-[#e6eaf2]'} flex items-center justify-center shrink-0`}>
                              <img src={avatar} alt={name} className="w-full h-full object-cover" />
                              {/* {badge && (
                                <img src={badge} alt={`Rank ${p._rank}`} className="absolute -right-1 -bottom-1 w-5 h-5" />
                              )} */}
                              {frame && (
                                <img src={frame} alt="frame" className="pointer-events-none absolute inset-0 w-full h-full object-contain" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-[14px] text-[#111]  ">{name}</div>
                            </div>
                          </div>
                          {/* Points column */}
                          <div className="text-right text-[16px]  text-[#2c60ce] font-semibold tabular-nums">{points}</div>
                        </div>
                        {/* Chevron arrow at far right */}
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#2c60ce]">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="w-5 h-5">
                            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      </div>
                    );
                  })}
              </div>
              {/* Desktop/Tablet: table */}
              <div className="hidden sm:block overflow-x-auto">
                <div className="divide-y divide-[#eef2f6]">
                  {filteredPlayers.map((p,i) => {
                    const id = p?.id ?? `player-${i}`;
                    const name = String(p?.name||'Unknown Player');
                    const avatar = getPlayerAvatar(p);
                    const points = Math.round(p._points||0);
                    const badge = badgeForRank(p._rank);
                    const frame = frameForRank(p._rank);
                    return (
                      <div key={id} className="flex items-center gap-4 px-5 py-3 hover:bg-[#fafcff] cursor-pointer" onClick={()=> navigate(`/player/${encodeURIComponent(id)}`)}>
                        <div className="w-10 text-[#2c60ce] font-semibold tabular-nums">{String(p._rank).padStart(2,'0')}</div>
                        <div className={`relative w-11 h-11 rounded-full overflow-hidden bg-gray-100 ${frame ? '' : 'border border-[#e6eaf2]'} flex items-center justify-center`}>
                          <img src={avatar} alt={name} className="w-full h-full object-cover" />
                          {badge && <img src={badge} alt={`Rank ${p._rank}`} className="absolute -right-1 -bottom-1 w-5 h-5" />}
                          {frame && (
                            <img src={frame} alt="frame" className="pointer-events-none absolute inset-0 w-full h-full object-contain" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-[#111] truncate">{name}</div>
                          <div className="text-[11px] text-[#586172]">Points: {points}</div>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="w-5 h-5 text-[#2c60ce]">
                          <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          {loading && <div className="text-gray-400 text-center">Loading players...</div>}
          {/* {error && <div className="text-red-500 text-center">Error loading players</div>} */}
          {Array.isArray(filteredPlayers) && filteredPlayers.length === 0 && !loading && (
            <div className="text-gray-400 text-center">No players match "{search}"</div>
          )}
        </div>
      </div>
      {/* Rules modal */}
      {showRules && (
        <div className="fixed inset-0 z-[1100] flex items-start justify-center pt-20 overflow-auto">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowRules(false)} />
          <div className="relative bg-white w-[92vw] max-w-xl rounded-2xl shadow-xl border border-[#e6eaf2] p-5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 8rem)' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-semibold">Scoring Rules</div>
              <button onClick={() => setShowRules(false)} className="p-1 rounded hover:bg-gray-100" aria-label="Close rules">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="text-sm text-gray-700 space-y-3">
              <div>
                <div className="font-semibold text-[#13306F]">Batting</div>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Runs: +1 point per run</li>
                  <li>Boundary Bonus: +1 per four, +2 per six</li>
                  <li>Milestones (highest in an innings): +4 for 30+, +8 for 50+, +16 for 100+</li>
                  <li>Strike Rate (min 10 balls): +6 &gt; 170; +4 &gt; 150; +2 ≥ 130; −2 &lt; 70; −4 &lt; 60; −6 &lt; 50</li>
                  <li>Duck: −2 (applies to batters, keepers, all‑rounders; not pure bowlers; requires per‑match data)</li>
                </ul>
              </div>

              <div>
                <div className="font-semibold text-[#13306F]">Bowling</div>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Wicket: +25 each</li>
                  <li>Bowled/LBW Bonus: +8 each (if recorded)</li>
                  <li>Hauls (best in an innings): +4 for 3W, +8 for 4W, +16 for 5W</li>
                  <li>Maiden Over: +12</li>
                  <li>Dot Ball: +0.5 each</li>
                  <li>Economy (min 2 overs): +6 &lt;5; +4 &lt;6; +2 &lt;7; −2 ≥10; −4 ≥11; −6 ≥12</li>
                </ul>
              </div>

              <div>
                <div className="font-semibold text-[#13306F]">Fielding</div>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Catch (Caught Out): +8</li>
                  <li>3 Catches in a match: +4 bonus (once)</li>
                  <li>Wicketkeeper Stumping: +12</li>
                  <li>Run‑Out (Direct Hit): +12</li>
                  <li>Run‑Out (Assist/Throw or Receiver): +6 (each assisting fielder)</li>
                </ul>
              </div>

              <div className="text-xs text-gray-500">
                Notes:
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>Points are calculated automatically from match stats; rankings update live on the Players page.</li>
                  <li>Some events (duck, LBW/Bowled bonus) apply when per‑innings data is available.</li>
                  <li>Weights are tuned to avoid bias across roles: batters benefit from runs/SR/milestones, bowlers from wickets/economy/maidens, and all players from fielding contributions.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
      <BottomNav />
    </div>
  );
}