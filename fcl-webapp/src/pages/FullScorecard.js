import React, { useEffect, useMemo, useState } from 'react';
import TeamLogo from '../components/TeamLogo';
import { useParams, Link } from 'react-router-dom';
import { useDocument, useCollection } from '../hooks/useFirestore';
import LiveScoreboard from '../components/LiveScoreboard';
import MatchSummaryCard from '../components/MatchSummaryCard';
import VideoLoader from '../components/VideoLoader';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import { getPlayerAvatar } from '../utils/getPlayerAvatar';

export default function FullScorecard() {
  const { matchId } = useParams();
  const { data: match, loading, error } = useDocument('matches', matchId || 'current-match', { poll: false });
  const { data: teams } = useCollection('teams', 'name');
  const teamsByName = useMemo(() => {
    const map = new Map();
    (teams || []).forEach(t => {
      const name = (t?.name || '').trim().toLowerCase();
      const url = t?.logoUrl || t?.logo || t?.flag || '';
      if (name && url && !map.has(name)) map.set(name, url);
    });
    return map;
  }, [teams]);
  const withLogoByName = (team) => {
    try {
      if (!team) return team;
      if (team.logoUrl || team.logo || team.flag) return team;
      const nm = (team.name || '').trim().toLowerCase();
      if (!nm) return team;
      const url = teamsByName.get(nm);
      return url ? { ...team, logoUrl: url } : team;
    } catch { return team; }
  };
  const [selectedTeam, setSelectedTeam] = useState('team1');
  // Hooks must run before any early returns
  const teamsDecided = useMemo(() => {
    const t1 = Array.isArray(match?.team1?.players) && match.team1.players.length > 0;
    const t2 = Array.isArray(match?.team2?.players) && match.team2.players.length > 0;
    return !!(t1 && t2);
  }, [match]);

  // Initialize toggle to current batting team or team1
  useEffect(() => {
    if (!match) return;
    const t = match.battingTeam === 'team2' ? 'team2' : 'team1';
    setSelectedTeam(t);
  }, [match]);

  if (loading) return <VideoLoader className="py-10" />;
  if (error) return <div className="text-center py-10 text-red-500">Failed to load scorecard: {String(error.message || error)}</div>;
  if (!match) return <div className="text-center py-10 text-gray-500">No match found.</div>;
  const tossText = (() => {
    try {
      if (!match?.toss?.winner || !match?.toss?.decision) return '';
      const teamName = match.toss.winner === 'team1' ? (match.team1?.name || 'Team 1') : (match.team2?.name || 'Team 2');
      const action = match.toss.decision === 'bat' ? 'bat' : 'bowl';
      return `${teamName} won the toss and chose to ${action}.`;
    } catch { return ''; }
  })();

  const dateText = (()=>{
    const d = match?.date;
    if (!d) return '';
    if (typeof d === 'string') return d;
    if (d?.toDate) { try { return d.toDate().toDateString(); } catch { return ''; } }
    if (typeof d?.seconds === 'number') return new Date(d.seconds*1000).toDateString();
    return '';
  })();

  return (
    <div className="min-h-screen bg-gray-50 md:py-[1rem] pb-24 md:pb-4">
      {/* Mobile: Full Scorecard title at top, no navbar space */}
      <div className="md:hidden sticky top-0 bg-white shadow-sm z-50 px-4 py-3 flex items-center gap-2">
        <Link to="/" className="inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2c60ce]" aria-label="Back to Home">
          <ChevronLeftIcon className="w-6 h-6 text-[#2c60ce]" />
        </Link>
        <h1 className="text-xl font-bold">Full Scorecard</h1>
      </div>
      
      <div className="max-w-2xl mx-auto px-4 md:pt-4">
        {/* Desktop: Full Scorecard title with back button */}
        <div className="hidden md:flex mb-4 items-center gap-2">
          <Link to="/" className="inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2c60ce]" aria-label="Back to Home">
            <ChevronLeftIcon className="w-6 h-6 text-[#2c60ce]" />
          </Link>
          <h1 className="text-2xl font-bold">Full Scorecard</h1>
        </div>
        {/* Use the same top card as Home */}
        {(['live','break'].includes((match.status||'').toLowerCase())) && (
          <div className="mb-4">
            <LiveScoreboard matchId={matchId || 'current-match'} disableLink hideBatBowl showTeamRosters={false} teamsByName={teamsByName} className="-mt-8" />
          </div>
        )}
        {(match.status||'').toLowerCase() === 'completed' && (
          <div className="mb-4">
            <MatchSummaryCard match={{...match, team1: withLogoByName(match.team1), team2: withLogoByName(match.team2)}} />
            {/* Player of the Match — Figma-styled responsive card */}
            {(() => {
              const mom = match?.awards?.manOfTheMatch || match?.awards?.playerOfTheMatch;
              if (!mom) return null;
              const name = typeof mom === 'string' ? mom : (mom?.name || '');
              const avatar = typeof mom === 'object' ? (mom?.avatar || mom?.photoUrl || '') : '';
              const team = typeof mom === 'object' ? (mom?.team || '') : '';
              const role = typeof mom === 'object' ? (mom?.role || '') : '';
              // derive batting/bowling string like "58(43) - 2-20(4,0)"
              let scoreLine = '';
              try {
                const pid = (typeof mom === 'object') ? (mom.id || mom.playerId || mom.pid || mom.player || null) : null;
                const pname = name;
                const inns = Array.isArray(match.innings) ? match.innings : [];
                let batEntry = null;
                let bowlEntry = null;
                for (const inn of inns) {
                  if (!batEntry && Array.isArray(inn?.batting)) {
                    const found = inn.batting.find(b => (pid && (b.playerId === pid || b.id === pid)) || (!pid && b.name === pname));
                    if (found) batEntry = found;
                  }
                  if (!bowlEntry && Array.isArray(inn?.bowling)) {
                    const foundB = inn.bowling.find(bw => (pid && (bw.playerId === pid || bw.id === pid)) || (!pid && bw.name === pname));
                    if (foundB) bowlEntry = foundB;
                  }
                  if (batEntry && bowlEntry) break;
                }
                if (batEntry) {
                  const br = Number(batEntry.runs) || 0;
                  const bb = Number(batEntry.balls) || 0;
                  scoreLine = `${br}(${bb})`;
                }
                if (bowlEntry) {
                  const wk = Number(bowlEntry.wickets) || 0;
                  const rc = Number(bowlEntry.runsConceded || bowlEntry.runs || 0) || 0;
                  const balls = Number(bowlEntry.balls) || 0;
                  const overs = `${Math.floor(balls/6)}.${balls%6}`;
                  const md = (Number(bowlEntry.maidens) || Number(bowlEntry.m) || 0);
                  const bstr = `${wk}-${rc}(${overs}${md!=null ? ','+md : ''})`;
                  scoreLine = scoreLine ? `${scoreLine} - ${bstr}` : bstr;
                }
              } catch (e) { scoreLine = '' }
              return (
                <div className="w-full max-w-2xl mx-auto mt-4 mb-2 px-3 sm:px-0">
                  <div className="bg-[#E7ECF7] rounded-2xl text-black overflow-hidden shadow-lg">
                    <div className="flex items-center gap-4 p-4 sm:p-5">
                      <div className="flex-shrink-0">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 border-white bg-white flex items-center justify-center">
                          {avatar ? (
                            <img src={avatar} alt={name} className="w-full h-full  object-cover" />
                          ) : (
                            <span className="text-white text-xl font-bold">{name?.charAt(0)}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col justify-between">
                            <div className="text-lg sm:text-xl font-semibold leading-tight truncate">{name}</div>
                            {team && <div className="text-sm opacity-90 truncate">{team}</div>}
                          {/* optional small badge */}
                          <div className="text-xs text-gray-500 sm:text-sm bg-white/20 py-1 rounded-full font-semibold">Player of the Match</div>
                        </div>
                        {role && <div className="mt-2 text-sm opacity-90">{role}</div>}
                        {scoreLine && (
                          <div className="mt-2 text-sm font-semibold text-gray-800">{scoreLine}</div>
                        )}
                        {/* Example stat row (responsive) - adjust if you have stat data */}
                        {mom?.stats && (
                          <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                            {Object.entries(mom.stats).map(([k,v]) => (
                              <div key={k} className="text-white/90">
                                <div className="font-bold">{v}</div>
                                <div className="opacity-80 text-xs">{k}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
        {(match.status||'').toLowerCase() === 'upcoming' && (
          <div className="bg-white rounded-[18px] mt-4 w-full max-w-md mx-auto shadow-[0_6px_15px_0_rgba(0,0,0,0.05)] p-0 flex flex-col gap-0 h-[167px] border-2 border-[#2c60ce] mb-4">
            <div className="flex items-center justify-between px-5 pt-4 pb-1">
              <span className="text-[#2c60ce] text-[13px] font-semibold">{dateText}</span>
              <span className="text-[#9ca4ab] text-[13px] font-medium">{match.time || (match.startTime || match.dateTime || match.date || '').toString().slice(11,16) || '--:--'}</span>
            </div>
            <div className="flex items-center justify-between px-5 py-2">
              <div className="flex flex-col items-center w-[90px]">
                <TeamLogo team={{...withLogoByName(match.team1), key:'team1'}} size="md" className="mb-1" />
                <span className="font-semibold text-[13px] text-[#111] text-center truncate w-full">{match.team1?.name || 'Team 1'}</span>
              </div>
              <div className="flex flex-col items-center w-[40px]">
                <span className="text-[#2c60ce] font-bold text-[2rem] mb-1">vs</span>
              </div>
              <div className="flex flex-col items-center w-[90px]">
                <TeamLogo team={{...withLogoByName(match.team2), key:'team2'}} size="md" className="mb-1" />
                <span className="font-semibold text-[13px] text-[#111] text-center truncate w-full">{match.team2?.name || 'Team 2'}</span>
              </div>
            </div>
            <div className="flex items-center justify-between px-5 pb-4 pt-1">
              <span className="text-[#9ca4ab] text-[13px] font-medium truncate max-w-[60%]">{match.venue || ''}</span>
              <span className="text-[#2c60ce] text-[13px] font-semibold">Overs: {match.totalOvers || 20}</span>
            </div>
          </div>
        )}
        {/* Last 10 balls activity */}
        {Array.isArray(match.recentBalls) && match.recentBalls.length > 0 && (
          <div className="w-full max-w-2xl mx-auto mt-4 mb-4">
            <div className="text-sm font-semibold text-gray-800 mb-1">Last 10 balls</div>
            <div className="flex gap-1.5 sm:gap-2 flex-nowrap sm:flex-wrap overflow-x-auto whitespace-nowrap pb-1 items-center">
              {(() => {
                const rb = match.recentBalls || [];
                // Reconstruct per-ball over index by walking backwards from currentOver/currentBall
                const overIdx = new Array(rb.length).fill(null);
                const curOver = (typeof match.currentOver === 'number') ? match.currentOver : 0;
                const curBall = (typeof match.currentBall === 'number') ? match.currentBall : 0;
                let over = curOver;
                let ballInOver = curBall; // number of legal balls already in current over
                const isLegal = (x) => {
                  if (x === 'W' || x === '0' || x === '•' || x === '.' || x === '1' || x === '2' || x === '3' || x === '4' || x === '6') return true;
                  if (typeof x === 'string' && (x.startsWith('B:') || x.startsWith('Lb:'))) return true;
                  return false;
                };
                // Walk backwards and assign over numbers
                for (let i = rb.length - 1; i >= 0; i--) {
                  const b = rb[i];
                  if (isLegal(b)) {
                    // If ballInOver is 0, that means the last recorded state was start of a new over -> this ball belonged to previous over
                    if (ballInOver === 0) {
                      over = Math.max(0, over - 1);
                      ballInOver = 5; // last legal ball index in that over
                      overIdx[i] = over;
                      ballInOver = ballInOver; // consumed below
                      // consume this legal ball
                      ballInOver = ballInOver - 1;
                    } else {
                      overIdx[i] = over;
                      ballInOver = ballInOver - 1;
                    }
                  } else {
                    // extras don't change ballInOver
                    overIdx[i] = over;
                  }
                }

                const start = Math.max(0, rb.length - 10);
                return rb.slice(start).map((b, j) => {
                  const idx = start + j; // index in full recentBalls
                  let value = b;
                  if (typeof b === 'string') {
                    if (b.startsWith('Nb:')) { const v=b.split(':')[1]; value = v?`Nb+${v}`:'Nb'; }
                    else if (b.startsWith('Wd:')) { const v=b.split(':')[1]; value = v?`Wd+${v}`:'Wd'; }
                    else if (b.startsWith('B:')) { const v=b.split(':')[1]; value = v?`B+${v}`:'B'; }
                    else if (b.startsWith('Lb:')) { const v=b.split(':')[1]; value = v?`Lb+${v}`:'Lb'; }
                    else if (b==='0'||b==='•'||b==='.') value='•';
                  } else if (b === '0') value='•';

                  const chip = (
                    <div key={`ball-${idx}`} className="bg-white border border-[#e6eaf2] rounded-full h-7 px-2 min-w-[1.75rem] flex items-center justify-center shadow-sm">
                      <span className="font-semibold text-gray-900 text-xs sm:text-sm leading-none whitespace-nowrap">{value}</span>
                    </div>
                  );

                  // Determine if we should render a separator after this ball (i.e., over boundary between idx and idx+1)
                  const isBoundary = (idx < rb.length - 1) && (overIdx[idx] !== null) && (overIdx[idx+1] !== null) && (overIdx[idx] !== overIdx[idx+1]);
                  return (
                    <React.Fragment key={`frag-${idx}`}>
                      {chip}
                      {isBoundary && (
                        <div className="px-2 text-gray-400 font-semibold">|</div>
                      )}
                    </React.Fragment>
                  );
                });
              })()}
            </div>
          </div>
        )}
        {/* Team toggle and innings view */}
  <div className="w-full max-w-2xl mx-auto mt-4">
          {/* Sticky segmented control for switching teams */}
          <div className="sticky top-16 z-40 -mx-4 px-4 py-2 bg-gray-50/90 backdrop-blur supports-[backdrop-filter]:bg-gray-50/70">
            <div role="tablist" aria-label="Select team innings" className="w-full bg-white border border-[#e6eaf2] rounded-2xl p-1 flex">
              <button
                role="tab"
                aria-selected={selectedTeam==='team1'}
                className={`flex-1 h-12 rounded-xl text-base font-semibold transition-colors duration-150 focus:outline-none ${selectedTeam==='team1' ? 'bg-[#2c60ce] text-white shadow' : 'text-gray-600'}`}
                onClick={() => setSelectedTeam('team1')}
              >
                Team Blue
              </button>
              <button
                role="tab"
                aria-selected={selectedTeam==='team2'}
                className={`flex-1 h-12 rounded-xl text-base font-semibold transition-colors duration-150 focus:outline-none ${selectedTeam==='team2' ? 'bg-[#2c60ce] text-white shadow' : 'text-gray-600'}`}
                onClick={() => setSelectedTeam('team2')}
              >
                Team White
              </button>
            </div>
          </div>

          {(() => {
            const inns = Array.isArray(match.innings) ? match.innings : [];
            const inn = inns.find(i => i?.teamKey === selectedTeam);
            const teamObj = match[selectedTeam] || {};
            const teamName = teamObj.name || (selectedTeam === 'team1' ? 'Team Blue' : 'Team White');
            const total = inn?.total || { runs: 0, wickets: 0, overs: '0.0' };
            const played = (Array.isArray(inn?.batting) ? inn.batting.filter(b => (b.balls > 0 || b.runs > 0 || b.isOnStrike || b.isNonStrike || b.isOut)) : []);
            const started = !!inn && played.length > 0;
            const rosterPlayers = Array.isArray(teamObj.players) ? teamObj.players : [];
            const playedNames = new Set(Array.isArray(inn?.batting) ? inn.batting.map(b => b.name) : []);
            const yetToBat = rosterPlayers.filter(p => !playedNames.has(p.name));

            const rr = (()=>{
              const [o, b] = String(total.overs||'0.0').split('.');
              const overs = (parseInt(o)||0) + ((parseInt(b)||0)/6);
              return overs>0 ? ((total.runs||0)/overs).toFixed(2) : '-';
            })();
            const ex = (inn?.total && inn.total.extras) ? inn.total.extras : { byes: 0, legByes: 0, wides: 0, noBalls: 0, penalties: 0 };
            const extras = (ex.byes||0) + (ex.legByes||0) + (ex.wides||0) + (ex.noBalls||0) + (ex.penalties||0);

            return (
              <div className="bg-white rounded-2xl shadow-[0_6px_15px_0_rgba(0,0,0,0.05)] border border-[#e6eaf2] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="font-semibold text-[#111]">{teamName} Innings</div>
                  <div className="font-bold text-[#2c60ce]">{total.runs}-{total.wickets} ({total.overs} Ov)</div>
                </div>

                {!started && (
                  <div className="px-4 pb-4 text-sm text-gray-600">
                    <div className="mb-3">Inning is not started yet.</div>
                    {yetToBat.length > 0 && (
                      <div>
                        <div className="font-semibold text-gray-800 mb-2">Yet to bat</div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {yetToBat.map((p, idx) => {
                            const rounded = (idx % 2 === 0)
                              ? 'rounded-l-2xl rounded-r-none'
                              : 'rounded-r-2xl rounded-l-none';
                            return (
                            <div
                              key={p.id || p.playerId || idx}
                              className={`flex items-center gap-3 border border-[#e1e5ee] shadow-sm px-3 py-2 ${rounded} overflow-hidden`}
                              style={{ background: 'linear-gradient(90deg, #FFFFFF 0%, rgba(72,122,229,0.10) 100%)' }}
                            >
                              <div className={`w-12 h-12 rounded-full overflow-hidden flex items-center justify-center border-2 ${selectedTeam==='team1' ? 'border-[#2c60ce] bg-blue-50' : 'border-gray-400 bg-gray-50'}`}>
                                <img src={getPlayerAvatar(p)} alt={p.name} className="w-full h-full object-cover" />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-semibold text-sm text-gray-900 truncate">{p.name}</span>
                                {p.gender && <span className="text-xs text-gray-500">{p.gender}</span>}
                              </div>
                            </div>
                          );})}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {started && (
                  <div className="px-4 pb-4">
                    <table className="min-w-full text-xs sm:text-sm border border-[#eef2f6] rounded-lg overflow-hidden mb-2">
                      <thead>
                        <tr className="bg-[#f7f9fc] text-gray-700">
                          <th className="px-2 py-2 text-left font-semibold">Batsman</th>
                          <th className="px-2 py-2 font-semibold">R</th>
                          <th className="px-2 py-2 font-semibold">B</th>
                          <th className="px-2 py-2 font-semibold">4s</th>
                          <th className="px-2 py-2 font-semibold">6s</th>
                          <th className="px-2 py-2 font-semibold">SR</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#eef2f6]">
                        {(() => {
                          function getDismissal(b) {
                            if (!b.isOut) return 'not out';
                            if (!b.howOut) return 'Out';
                            if (b.howOut.type === 'bowled') return `b ${b.howOut.bowler}`;
                            if (b.howOut.type === 'caught') return `c ${b.howOut.fielder} b ${b.howOut.bowler}`;
                            if (b.howOut.type === 'lbw') return `lbw b ${b.howOut.bowler}`;
                            if (b.howOut.type === 'run out') return `run out (${b.howOut.fielder})`;
                            if (b.howOut.type === 'stumped') return `st ${b.howOut.fielder} b ${b.howOut.bowler}`;
                            if (b.howOut.type === 'retired') return 'retired';
                            return b.howOut.type;
                          }
                          return played.map((b, i) => (
                            <tr key={i} className="hover:bg-[#fafcff]">
                              <td className="px-2 py-2 font-medium text-[#111]">
                                {b.name}
                                <div className="text-[11px] text-gray-500 font-normal">{getDismissal(b)}</div>
                              </td>
                              <td className="px-2 py-2 text-center">{b.runs || 0}</td>
                              <td className="px-2 py-2 text-center">{b.balls || 0}</td>
                              <td className="px-2 py-2 text-center">{b.fours || 0}</td>
                              <td className="px-2 py-2 text-center">{b.sixes || 0}</td>
                              <td className="px-2 py-2 text-center">{(b.balls>0 ? ((b.runs||0)*100/(b.balls||1)) : 0).toFixed(1)}</td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>

                    <div className="text-[13px] text-gray-700 mb-1">Extras: <span className="font-semibold">{extras}</span> <span className="text-gray-500">(b {ex.byes||0}, lb {ex.legByes||0}, w {ex.wides||0}, nb {ex.noBalls||0}, p {ex.penalties||0})</span></div>
                    <div className="text-[13px] text-gray-800 mb-2">Total: <span className="font-semibold">{total.runs}-{total.wickets}</span> <span className="text-gray-500">({total.overs} Overs, RR: {rr})</span></div>
                    {Array.isArray(inn?.fow) && inn.fow.length>0 && (
                      <div className="text-[13px] text-gray-700 mb-2">Wicket fall: {inn.fow.map(x => `${x.score}-${x.wicket}`).join(', ')}</div>
                    )}

                    {yetToBat.length > 0 && (
                      <div className="mt-4">
                        <div className="font-semibold text-gray-800 mb-2">Yet to bat</div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {yetToBat.map((p, idx) => {
                            const rounded = (idx % 2 === 0)
                              ? 'rounded-l-2xl rounded-r-none'
                              : 'rounded-r-2xl rounded-l-none';
                            return (
                            <div
                              key={p.id || p.playerId || idx}
                              className={`flex items-center gap-3 border border-[#e1e5ee] shadow-sm px-3 py-2 ${rounded} overflow-hidden`}
                              style={{ background: 'linear-gradient(90deg, #FFFFFF 0%, rgba(72,122,229,0.10) 100%)' }}
                            >
                              <div className={`w-12 h-12 rounded-full overflow-hidden flex items-center justify-center border-2 ${selectedTeam==='team1' ? 'border-[#2c60ce] bg-blue-50' : 'border-gray-400 bg-gray-50'}`}>
                                <img src={getPlayerAvatar(p)} alt={p.name} className="w-full h-full object-cover" />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-semibold text-sm text-gray-900 truncate">{p.name}</span>
                                {p.gender && <span className="text-xs text-gray-500">{p.gender}</span>}
                              </div>
                            </div>
                          );})}
                        </div>
                      </div>
                    )}

                    {/* Bowling for this innings */}
                    <div className="mt-4">
                      <h3 className="text-sm font-semibold mb-1">Bowling</h3>
                      <table className="min-w-full text-xs sm:text-sm border border-[#eef2f6] rounded-lg overflow-hidden mb-2">
                        <thead>
                          <tr className="bg-[#f7f9fc] text-gray-700">
                            <th className="px-2 py-2 text-left font-semibold">Bowler</th>
                            <th className="px-2 py-2 font-semibold">O</th>
                            <th className="px-2 py-2 font-semibold">R</th>
                            <th className="px-2 py-2 font-semibold">W</th>
                            <th className="px-2 py-2 font-semibold">4s</th>
                            <th className="px-2 py-2 font-semibold">6s</th>
                            <th className="px-2 py-2 font-semibold">Econ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#eef2f6]">
                          {Array.isArray(inn?.bowling) && inn.bowling.map((b, i) => (
                            <tr key={i} className="hover:bg-[#fafcff]">
                              <td className="px-2 py-2 font-medium">{b.name}</td>
                              <td className="px-2 py-2 text-center">{Math.floor((b.balls||0)/6) + '.' + ((b.balls||0)%6)}</td>
                              <td className="px-2 py-2 text-center">{b.runsConceded || 0}</td>
                              <td className="px-2 py-2 text-center">{b.wickets || 0}</td>
                              <td className="px-2 py-2 text-center">{b.foursConceded || 0}</td>
                              <td className="px-2 py-2 text-center">{b.sixesConceded || 0}</td>
                              <td className="px-2 py-2 text-center">{(() => { const ov = (b.balls||0)/6; return ov>0 ? (b.runsConceded/ov).toFixed(2) : '-'; })()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Team Sheets at the end */}
        {teamsDecided && (
          <div className="w-full max-w-2xl mx-auto mt-6 mb-4">
            <div className="flex flex-col gap-6">
              {/* Team Blue Roster */}
              <div className="flex-1 bg-white rounded-2xl shadow-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#2c60ce] inline-block"></span>
                    <h3 className="font-semibold text-lg text-[#2c60ce] tracking-wide">Team Blue</h3>
                  </div>
                  <Link
                    to={`/team-sheet/${matchId || 'current-match'}/team1`}
                    className="px-3 py-1 text-sm rounded-full border border-[#cfd8ea] text-[#2c60ce] bg-white hover:bg-[#f3f7ff]"
                  >
                    See more
                  </Link>
                </div>
                {Array.isArray(match.team1?.players) && match.team1.players.length > 0 ? (
                  <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
                    {match.team1.players.map((p, idx) => (
                      <div key={p.id || p.playerId || idx} className={`flex flex-col items-center min-w-[80px] max-w-[90px] bg-[#f7faff] rounded-xl shadow border border-[#e3e8f0] px-3 py-2 mx-1`}>
                        <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center mb-1 border-2 border-[#2c60ce]">
                          <img src={getPlayerAvatar(p)} alt={p.name} className="w-full h-full object-cover" />
                        </div>
                        <span className="font-semibold text-sm text-gray-900 text-center truncate w-full">{p.name}</span>
                        {p.gender && <span className="text-xs text-[#2c60ce] mt-0.5">{p.gender}</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-400">Team is not declared yet.</div>
                )}
              </div>
              {/* Team White Roster */}
              <div className="flex-1 bg-white rounded-2xl shadow-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#e11922] inline-block"></span>
                    <h3 className="font-semibold text-lg text-[#e11922] tracking-wide">Team White</h3>
                  </div>
                  <Link
                    to={`/team-sheet/${matchId || 'current-match'}/team2`}
                    className="px-3 py-1 text-sm rounded-full border border-[#f3d6d6] text-[#e11922] bg-white hover:bg-[#fff0f0]"
                  >
                    See more
                  </Link>
                </div>
                {Array.isArray(match.team2?.players) && match.team2.players.length > 0 ? (
                  <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
                    {match.team2.players.map((p, idx) => (
                      <div key={p.id || p.playerId || idx} className={`flex flex-col items-center min-w-[80px] max-w-[90px] bg-[#fff7f7] rounded-xl shadow border border-[#f3d6d6] px-3 py-2 mx-1`}>
                        <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center mb-1 border-2 border-[#e11922]">
                          <img src={getPlayerAvatar(p)} alt={p.name} className="w-full h-full object-cover" />
                        </div>
                        <span className="font-semibold text-sm text-gray-900 text-center truncate w-full">{p.name}</span>
                        {p.gender && <span className="text-xs text-[#e11922] mt-0.5">{p.gender}</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-400">Team is not declared yet.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
