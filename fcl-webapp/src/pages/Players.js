
import React, { useMemo, useState } from 'react';
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

  return (
    <div className="bg-[#f8f8f8] min-h-screen w-screen flex flex-col overflow-x-hidden" style={{ minHeight: '100vh' }}>
      <div className="flex-1 flex flex-col items-center pb-20">
        <div className="w-full max-w-5xl mx-auto px-2 md:px-6 py-2">
          {/* Leaderboard hero header */}
          <div className="rounded-2xl overflow-hidden mb-5 shadow-[0_6px_15px_0_rgba(0,0,0,0.08)]">
            <div className="relative bg-[#2d509a]">
              <div className="px-5 py-6 md:px-8 md:py-8 flex items-center gap-4 md:gap-6">
                {/* Trophy icon (inline SVG to avoid external asset issues) */}
                <div className="shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-yellow-300">
                    <path d="M8 21h8m-7-4h6a3 3 0 003-3v-4h1a2 2 0 002-2V6h-3V4H6v2H3v2a2 2 0 002 2h1v4a3 3 0 003 3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 8l.588 1.176 1.298.189-.943.92.223 1.291L12 11.01l-1.166.766.223-1.29-.944-.92 1.299-.19L12 8z" fill="currentColor"/>
                  </svg>
                </div>
                <div className="flex-1 text-white">
                  {/* <div className="text-sm uppercase tracking-widest opacity-90">Leaderboard</div> */}
                  <div className="text-2xl md:text-3xl pl-6 font-extrabold leading-tight">Player Rankings</div>
                  <div className="mt-2 text-white/90 text-md pl-6">Overall performance</div>
                </div>
                {/* Rules button */}
                <div className="ml-auto mt-0">
                  <button
                    onClick={() => setShowRules(true)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/15 text-white border border-white/30 hover:bg-white/25 transition"
                    aria-label="Show scoring rules"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-9-3a1 1 0 112 0 1 1 0 01-2 0zm2 3a1 1 0 10-2 0v4a1 1 0 102 0v-4z" clipRule="evenodd" />
                    </svg>
                    <span className="hidden sm:inline">Rules</span>
                  </button>
                </div>
              </div>
              {/* small curved bottom to mimic card artwork */}
              <div className="h-2 bg-white"/>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-4 max-w-md mx-auto w-full">
            <div className="relative group">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#2c60ce]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
              </svg>
              <input
                value={search}
                onChange={(e)=> setSearch(e.target.value)}
                placeholder="Search player by name..."
                className="w-full pl-11 pr-3 py-2 rounded-xl border border-[#cfd8ea] bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2c60ce]/40 text-sm"
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
              <div className="sm:hidden px-4 py-2 text-[18px] bg-gray-400 text-[#ffff] grid grid-cols-[44px,1fr,64px] gap-2 border-b border-[#eef2f6]">
                <div>Rank</div>
                <div>Player</div>
                <div className="text-right pr-6">Points</div>
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
                    return (
                      <div key={safeKey} className={`relative px-4 py-3 ${unavailable ? 'opacity-60' : 'cursor-pointer hover:bg-[#f9fbff]'}`} onClick={()=> !unavailable && navigate(`/player/${encodeURIComponent(id)}`)}>
                        <div className="grid grid-cols-[44px,1fr,64px] items-center gap-2 pr-8">
                          {/* Rank column */}
                          <div className="flex items-center justify-start">
                            <div className="w-8 font-semibold text-[#2c60ce] tabular-nums">{String(p._rank).padStart(2,'0')}</div>
                          </div>
                          {/* Player column */}
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-100 border border-[#e6eaf2] flex items-center justify-center shrink-0">
                              <img src={avatar} alt={name} className="w-full h-full object-cover" />
                              {badge && (
                                <img src={badge} alt={`Rank ${p._rank}`} className="absolute -right-1 -bottom-1 w-5 h-5" />
                              )}
                              {frameForRank(p._rank) && (
                                <img src={frameForRank(p._rank)} alt="frame" className="pointer-events-none absolute inset-0 w-full h-full object-contain" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-[#111] ">{name}</div>
                            </div>
                          </div>
                          {/* Points column */}
                          <div className="text-right text-[16px] text-[#111] font-semibold tabular-nums">{points}</div>
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
                    return (
                      <div key={id} className="flex items-center gap-4 px-5 py-3 hover:bg-[#fafcff] cursor-pointer" onClick={()=> navigate(`/player/${encodeURIComponent(id)}`)}>
                        <div className="w-10 text-[#2c60ce] font-semibold tabular-nums">{String(p._rank).padStart(2,'0')}</div>
                        <div className="relative w-11 h-11 rounded-full overflow-hidden bg-gray-100 border border-[#e6eaf2] flex items-center justify-center">
                          <img src={avatar} alt={name} className="w-full h-full object-cover" />
                          {badge && <img src={badge} alt={`Rank ${p._rank}`} className="absolute -right-1 -bottom-1 w-5 h-5" />}
                          {frameForRank(p._rank) && (
                            <img src={frameForRank(p._rank)} alt="frame" className="pointer-events-none absolute inset-0 w-full h-full object-contain" />
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
          {error && <div className="text-red-500 text-center">Error loading players</div>}
          {Array.isArray(filteredPlayers) && filteredPlayers.length === 0 && !loading && (
            <div className="text-gray-400 text-center">No players match "{search}"</div>
          )}
        </div>
      </div>
      {/* Rules modal */}
      {showRules && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowRules(false)} />
          <div className="relative bg-white w-[92vw] max-w-xl rounded-2xl shadow-xl border border-[#e6eaf2] p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-semibold">Scoring Rules (Dream11-style)</div>
              <button onClick={() => setShowRules(false)} className="p-1 rounded hover:bg-gray-100" aria-label="Close rules">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="text-sm text-gray-700 space-y-2">
              <div className="font-semibold text-[#13306F]">Batting</div>
              <ul className="list-disc pl-5 space-y-1">
                <li>+1 per run</li>
                <li>+1 per boundary (4), +2 per six</li>
                <li>+5 for a half-century (50+), +10 for a century (100+)</li>
                <li>-2 for duck (if not a bowler; role-based)</li>
              </ul>
              <div className="font-semibold text-[#13306F] mt-3">Bowling</div>
              <ul className="list-disc pl-5 space-y-1">
                <li>+25 per wicket</li>
                <li>+5 bonus for 3-wicket haul, +10 bonus for 5-wicket haul</li>
                <li>+8 per maiden over</li>
                <li>+0.5 per dot ball</li>
              </ul>
              <div className="font-semibold text-[#13306F] mt-3">Rates</div>
              <ul className="list-disc pl-5 space-y-1">
                <li>Strike rate contributes positively</li>
                <li>Economy rate penalizes if high, rewards if low</li>
              </ul>
              <div className="text-xs text-gray-500 mt-2">Note: Current scoring is computed from aggregate stats; per-match rules will refine further.</div>
            </div>
          </div>
        </div>
      )}
      <BottomNav />
    </div>
  );
}