import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDocument } from '../hooks/useFirestore';

function isObj(v) { return v && typeof v === 'object'; }

function OutlineChip({ children }) {
  return (
    <span className="w-9 h-9 rounded-full inline-flex items-center justify-center text-[13px] font-semibold border-2 border-[#2c60ce] text-[#2c60ce]">
      {children}
    </span>
  );
}

function Avatar({ name, src }) {
  const initial = (name && name[0]) || '?';
  return (
    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 border border-[#e6eaf2] flex items-center justify-center">
      {src ? (
        <img src={src} alt={name||'avatar'} className="w-full h-full object-cover" />
      ) : (
        <span className="text-sm text-gray-600 font-semibold">{initial}</span>
      )}
    </div>
  );
}

const fmtOB = (over, ball) => `${Number(over)||0}.${Number(ball)||0}`;
const fmtOversFromBalls = (balls)=>{ if (!Number.isFinite(balls)) return '0.0'; const o=Math.floor(balls/6), bb=balls%6; return `${o}.${bb}`; };

export default function CurrentPlay({ matchId = 'current-match' }) {
  const navigate = useNavigate();
  const { data: match, loading } = useDocument('matches', matchId, { enabled: !!matchId });
  if (loading || !match) return null;

  // Build batter and bowler stats from innings
  const tKey = match.battingTeam === 'team2' ? 'team2' : 'team1';
  const inns = Array.isArray(match.innings) ? match.innings.slice().reverse() : [];
  const inn = inns.find(i => i?.teamKey === tKey) || null;
  const batting = Array.isArray(inn?.batting) ? inn.batting : [];
  const bowling = Array.isArray(inn?.bowling) ? inn.bowling : [];

  const roster = [ ...(Array.isArray(match?.team1?.players)? match.team1.players: []), ...(Array.isArray(match?.team2?.players)? match.team2.players: []) ];
  const avatarFor = (pidOrName) => {
    const p = roster.find(p => (p.id===pidOrName || p.playerId===pidOrName || p.name===pidOrName));
    return p?.avatar || null;
  };

  const findBatter = (id) => batting.find(b => (b.playerId === id || b.id === id || b.name === id));
  const striker = match.currentStrikerId ? findBatter(match.currentStrikerId) : null;
  const non = match.currentNonStrikerId ? findBatter(match.currentNonStrikerId) : null;
  const bowler = match.currentBowlerId ? bowling.find(b => (b.playerId === match.currentBowlerId || b.id === match.currentBowlerId || b.name === match.currentBowlerId)) : null;

  // Recent balls (last 6)
  const recent = Array.isArray(match.recentBalls) ? match.recentBalls.slice(-6) : [];
  const chipVal = (x) => {
    const v = String(x||'').toUpperCase();
    if (v === '.' || v === '•' || v === '0') return '•';
    return v;
  };

  return (
    <div className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mt-3 space-y-3">
      {/* Batsman section (matched to Bowler section styling) */}
      <div>
        <div className="flex items-center justify-between px-1 mb-1">
          <div className="text-md font-semibold text-[#111]">Batsman</div>
          <a
            href={`/team-sheet/${matchId || 'current-match'}/${(match.battingTeam === 'team2') ? 'team2' : 'team1'}`}
            className="text-[12px] text-[#9ca4ab]"
          >
            See all
          </a>
        </div>
        <div className="bg-white rounded-2xl shadow-[0_6px_15px_0_rgba(0,0,0,0.05)] p-3">
          <div className="flex flex-col gap-3">
            {[striker, non].filter(Boolean).map((row, idx) => {
              const isStriker = idx === 0;
              const name = (row && row.name) || (isStriker ? match.currentStrikerName : match.currentNonStrikerName) || '—';
              const runs = isObj(row) ? (row.runs || 0) : 0;
              const balls = isObj(row) ? (row.balls || 0) : 0;
              const pid = isObj(row) ? (row.playerId || row.id || row.name) : (isStriker ? match.currentStrikerId || match.currentStrikerName : match.currentNonStrikerId || match.currentNonStrikerName);
              const avatar = avatarFor(pid);
              return (
                <div key={`${name}-${idx}`} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar name={name} src={avatar} />
                    <div>
                      <div className="text-[16px] font-semibold text-[#111] leading-tight truncate max-w-[140px]">{name}</div>
                      <div className="text-[14px] text-[#9ca4ab]">Batsman</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="leading-tight">
                      <span className="text-[18px] font-bold text-[#111]">{runs}{isStriker ? '*' : ''}</span>
                      <span className="text-[13px] text-[#9ca4ab]"> ({balls})</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {[striker, non].filter(Boolean).length === 0 && (
              <div className="text-center text-sm text-gray-500">No batsmen at the crease</div>
            )}
          </div>
        </div>
      </div>

  {/* Bowler section */}
      <div>
        <div className="flex items-center justify-between px-1 mb-1">
          <div className="text-[13px] font-semibold text-[#111]">Bowler</div>
          <a href="/players" className="text-[12px] text-[#9ca4ab]">See all</a>
        </div>
        <div className="bg-white rounded-2xl shadow-[0_6px_15px_0_rgba(0,0,0,0.05)] p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar name={(bowler&&bowler.name)||match.currentBowlerName} src={avatarFor(bowler?.playerId || bowler?.id || bowler?.name || match.currentBowlerId || match.currentBowlerName)} />
              <div>
                <div className="text-[14px] font-semibold text-[#111] leading-tight">{(bowler&&bowler.name) || match.currentBowlerName || '—'}</div>
                <div className="text-[12px] text-[#9ca4ab]">Bowler</div>
              </div>
            </div>
            <div className="text-right">
              {isObj(bowler) ? (
                <div className="leading-tight">
                  <span className="text-[18px] font-bold text-[#111]">{(bowler.runsConceded||0)}/{(bowler.wickets||0)}</span>
                  <span className="text-[13px] text-[#9ca4ab]"> ({fmtOversFromBalls(bowler.balls)} Overs)</span>
                </div>
              ) : (
                <div className="text-[16px] font-semibold text-[#111] leading-tight">—</div>
              )}
            </div>
          </div>
          {recent.length>0 && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {recent.map((x, i) => (
                <OutlineChip key={`rb-${i}`}>{chipVal(x)}</OutlineChip>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
