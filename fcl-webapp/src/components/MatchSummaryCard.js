import React from 'react';
import TeamLogo from './TeamLogo';

export default function MatchSummaryCard({ match }) {
  const teamOvers = (teamKey) => {
    try {
      if (match.battingTeam === teamKey) {
        const o = Number(match.currentOver) || 0;
        const b = Number(match.currentBall) || 0;
        return `${o}.${b}`;
      }
      const inns = Array.isArray(match.innings) ? match.innings : [];
      for (let i = inns.length - 1; i >= 0; i--) {
        if (inns[i]?.teamKey === teamKey && inns[i]?.total?.overs != null) {
          return inns[i].total.overs;
        }
      }
      return String(match[teamKey]?.overs || 0);
    } catch (e) {
      return String(match[teamKey]?.overs || 0);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow p-4 mt-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col items-center w-2/5">
          <TeamLogo team={{...match.team1, key:'team1'}} size="md" />
          <div className="mt-2 text-sm text-gray-700 font-medium truncate max-w-[140px] text-center">{match.team1?.name || 'Team A'}</div>
          <div className="mt-1 text-xl font-bold">{match.team1?.runs || 0}/{match.team1?.wickets || 0}</div>
          <div className="text-xs text-gray-500">({teamOvers('team1')} ov)</div>
        </div>
        <div className="w-1/5 flex flex-col items-center">
          <span className="text-gray-400 font-semibold">V/S</span>
        </div>
        <div className="flex flex-col items-center w-2/5">
          <TeamLogo team={{...match.team2, key:'team2'}} size="md" />
          <div className="mt-2 text-sm text-gray-700 font-medium truncate max-w-[140px] text-center">{match.team2?.name || 'Team B'}</div>
          <div className="mt-1 text-xl font-bold">{match.team2?.runs || 0}/{match.team2?.wickets || 0}</div>
          <div className="text-xs text-gray-500">({teamOvers('team2')} ov)</div>
        </div>
      </div>
      {/* Player of the Match (only for completed matches) */}
      {String(match?.status || '').toLowerCase() === 'completed' && (
        (() => {
          const mom = match?.awards?.manOfTheMatch || match?.awards?.playerOfTheMatch;
          const name = typeof mom === 'string' ? mom : (mom?.name || '');
          if (!name) return null;
          const avatar = typeof mom === 'object' ? (mom?.avatar || mom?.photoUrl || '') : '';
          return (
            <div className="mt-3 pt-3 ">
              {/* <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Player of the Match</div> */}
              <div className="flex items-center gap-3">
                {/* <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-200 border border-gray-200 flex items-center justify-center">
                  
                </div> */}
                {/* <div className="text-sm text-[#111] font-medium">{name}</div> */}
              </div>
            </div>
          );
        })()
      )}
    </div>
  );
}
