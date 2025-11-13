import React from 'react';
import TeamLogo from '../components/TeamLogo';
import { useNavigate, useParams } from 'react-router-dom';
import { useDocument, useCollection } from '../hooks/useFirestore';


function PlayerCard({ p, accent = '#2c60ce', onClick, unavailable = false, teamKey }) {
  const wk = (p.type || '').toLowerCase().includes('wk') || (p.role || '').toLowerCase().includes('wk');
  const c = (p.extra || '').toLowerCase().includes('c');
  // Set bg color based on teamKey
  const bg = teamKey === 'team1' ? '#E7ECF7' : '#fff';
  return (
    <div
      className={`flex items-center rounded-[16px] border   px-4 py-3 min-h-[68px] cursor-pointer transition-transform hover:scale-[1.02] ${unavailable ? 'opacity-60 pointer-events-none' : ''}`}
      onClick={onClick}
      style={{ background: bg }}
    >
      <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center bg-gray-100 border border-[#e6eaf2] mr-4">
        {p.avatar || p.imgUrl ? (
          <img src={p.avatar || p.imgUrl} alt={p.name} className="object-cover bg-white w-full h-full" />
        ) : (
          <span className="text-gray-500 font-semibold text-xl">{(p.name||'?')[0]}</span>
        )}
      </div>
      <div className="flex flex-col flex-1 min-w-0 justify-center">
        <div className="flex items-center gap-1 flex-wrap">
          <span className={`font-semibold text-[15px] leading-[22px] tracking-[0.07px] truncate ${wk ? 'text-[#eba747]' : 'text-[#111111]'}`}>{p.name}</span>
          {c && <span className="inline-flex items-center px-2 py-[2px] rounded-full text-[10px] font-semibold ml-1 bg-[#fff8e1] text-[#e89a2d]">(C)</span>}
          {wk && <span className="inline-flex items-center px-2 py-[2px] rounded-full text-[10px] font-semibold ml-1 bg-[#e6f7ff] border border-[#eba747] text-[#eba747]">(wk)</span>}
          {unavailable && (
            <span className="inline-flex items-center px-2 py-[2px] rounded-full text-[10px] font-semibold ml-1 bg-[#ffe8e8] text-[#d92d20] border border-[#f3d6d6]">Unavailable</span>
          )}
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <span className={`font-normal text-[12px] leading-[16px] tracking-[0.05px] ${wk ? 'text-[#eba747]' : 'text-[#9ca4ab]'}`}>{p.type || p.role || 'Player'}</span>
        </div>
      </div>
    </div>
  );
}

export default function TeamSheet() {
  const navigate = useNavigate();
  const { matchId, teamKey } = useParams();
  const { data: match, loading, error } = useDocument('matches', matchId || 'current-match', { poll: false });
  const { data: allPlayers } = useCollection('players', 'name');

  const team = match?.[teamKey] || {};
  const players = Array.isArray(team.players) ? team.players : [];
  const teamName = team?.name || (teamKey === 'team2' ? 'Team White' : 'Team Blue');
  const todayStr = React.useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${da}`;
  }, []);
  const unavailableSet = React.useMemo(() => {
    const s = new Set();
    if (Array.isArray(allPlayers)) {
      allPlayers.forEach(p => {
        const list = Array.isArray(p?.unavailableDates) ? p.unavailableDates : [];
        if (list.includes(todayStr)) {
          const key = p.id || p.playerId || p.name;
          if (key) s.add(String(key));
        }
      });
    }
    return s;
  }, [allPlayers, todayStr]);
  const isUnavailable = (p) => {
    const key = p.id || p.playerId || p.name;
    return key ? unavailableSet.has(String(key)) : false;
  };

  const inningsForTeam = React.useMemo(() => {
    const inns = Array.isArray(match?.innings) ? match.innings : [];
    return inns.find(i => i?.teamKey === teamKey) || null;
  }, [match, teamKey]);

  const inningsStarted = React.useMemo(() => {
    const inn = inningsForTeam;
    if (!inn) return false;
    const bats = Array.isArray(inn.batting) ? inn.batting : [];
    return bats.some(b => (b.balls > 0 || b.runs > 0 || b.isOnStrike || b.isNonStrike || b.isOut));
  }, [inningsForTeam]);

  // current batsmen (for the selected team)
  const currentBatters = React.useMemo(() => {
    const inn = inningsForTeam;
    if (!inn) return [];
    const bats = Array.isArray(inn.batting) ? inn.batting : [];
    const s = bats.find(b => b.isOnStrike);
    const n = bats.find(b => b.isNonStrike);
    const list = [s, n].filter(Boolean);
    // fallback: if none flagged, pick top two by balls faced
    if (list.length === 0) {
      const sorted = bats.slice().sort((a,b) => (b.balls||0) - (a.balls||0));
      return sorted.slice(0, 2);
    }
    return list;
  }, [inningsForTeam]);

  // Early returns come AFTER all hooks (including useMemo) to satisfy rules-of-hooks
  if (loading) return <div className="p-6">Loading team…</div>;
  if (error) return <div className="p-6 text-red-600">{String(error.message || error)}</div>;
  if (!match) return <div className="p-6">Match not found</div>;

  return (
    <div className="bg-[#f8f8f8] min-h-screen relative overflow-y-auto">
      {/* Header */}
      <div className="bg-white shadow sticky top-0 w-full z-10">
        <div className="flex items-center h-16 px-5 justify-between max-w-md mx-auto">
          <button className="text-[22px] text-[#111111] font-sans" onClick={() => navigate(-1)} aria-label="Back">&#x1F870;</button>
          <span className="font-bold text-[17px] text-[#111111]">{teamName}</span>
          <span style={{ width: 32 }}></span>
        </div>
      </div>
      {/* Removed team toggle; show only the selected team's list */}


      {/* Body */}

      <div className="pt-6 pb-20 flex justify-center">
        <div className="max-w-md w-full px-4">
          {(!players.length || !inningsStarted) && (
            <div className="text-gray-500 text-center w-full mb-2"></div>
          )}
          {players.length > 0 && (
            <div className="grid grid-cols-2 gap-x-5 gap-y-5 ">
              {players.map((p, idx) => (
                <PlayerCard
                  key={p.id || p.playerId || idx}
                  p={p}
                  unavailable={isUnavailable(p)}
                  teamKey={teamKey}
                  onClick={() => {
                    const pid = p.id || p.playerId || p.name;
                    if (pid) navigate(`/player/${encodeURIComponent(pid)}`);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom filler to avoid clipping */}
      <div className="h-8"></div>
    </div>
  );
}
