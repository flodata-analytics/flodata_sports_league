import React from 'react';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import { getPlayerAvatar } from '../utils/getPlayerAvatar';
import { useNavigate, useParams } from 'react-router-dom';
import { useDocument, useCollection } from '../hooks/useFirestore';
import VideoLoader from '../components/VideoLoader';


function PlayerCard({ p, onClick, unavailable = false, teamKey }) {
  const avatar = getPlayerAvatar(p);
  const bg = teamKey === 'team1' ? 'bg-[#e7ecf7]' : 'bg-[#fff7f7]';
  const ring = teamKey === 'team1' ? 'ring-[#2c60ce]' : 'ring-[#e11922]';
  return (
    <div
      className={`flex flex-col items-center text-center ${bg} rounded-2xl border border-[#e6eaf2] px-4 py-3 cursor-pointer transition hover:shadow-sm ${unavailable ? 'opacity-60 pointer-events-none' : ''}`}
      onClick={onClick}
    >
      <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden flex items-center justify-center mb-2 ring-2 ${ring} bg-white`}>
        {avatar ? (
          <img src={avatar} alt={p.name} className="object-cover w-full h-full" />
        ) : (
          <span className="text-gray-500 font-semibold text-xl">{(p.name||'?')[0]}</span>
        )}
      </div>
      <div className="font-semibold text-sm text-gray-900 truncate w-full">{p.name}</div>
      <div className="text-[11px] text-gray-500 mt-1">{p.role || p.type || 'Player'}</div>
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
  if (loading) return <VideoLoader className="py-10" />;
  if (error) return <div className="p-6 text-red-600">{String(error.message || error)}</div>;
  if (!match) return <div className="p-6">Match not found</div>;

  return (
    <div className="bg-[#f8f8f8] min-h-screen relative overflow-y-auto py-[21px] px-[21px]">
      {/* Header (fixed at top to occupy navbar space) */}
      <div className="bg-white shadow fixed top-0 left-0 right-0 w-full z-50">
        <div className="flex items-center h-16 px-5 max-w-md mx-auto">
          <button onClick={() => navigate(-1)} aria-label="Back" className="inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 focus:outline-none">
            <ChevronLeftIcon className="w-6 h-6 text-[#2c60ce]" />
          </button>
          <span className="font-semibold text-[17px] text-[#111111] ml-3">Playing XI - {teamName}</span>
          <span style={{ width: 32 }}></span>
        </div>
      </div>
      {/* Removed team toggle; show only the selected team's list */}


      {/* Body */}

      <div className="-pt-16 pb-20 flex justify-center">
        <div className="max-w-3xl w-full -pt-10">
          {(!players.length || !inningsStarted) && (
            <div className="text-gray-500 text-center w-full mb-0"></div>
          )}
          {players.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-2">
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
