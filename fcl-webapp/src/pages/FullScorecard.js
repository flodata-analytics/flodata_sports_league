import React, { useEffect, useMemo, useState } from 'react';
import TeamLogo from '../components/TeamLogo';
import { useParams, useNavigate } from 'react-router-dom';
import { useDocument, useCollection } from '../hooks/useFirestore';
import LiveScoreboard from '../components/LiveScoreboard';
import FullScoreHeaderCard from '../components/FullScoreHeaderCard';
import MatchSummaryCard from '../components/MatchSummaryCard';
import VideoLoader from '../components/VideoLoader';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import { getPlayerAvatar } from '../utils/getPlayerAvatar';

export default function FullScorecard() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { data: match, loading, error } = useDocument('matches', matchId || 'current-match', { poll: false });
  const { data: allPlayers } = useCollection('players', 'name');
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
      return `${teamName} won the toss and choose to ${action} first.`;
    } catch { return ''; }
  })();

  // Chase info (same logic as on Home via LiveScoreboard)
  const chaseInfo = (() => {
    try {
      const inns = Array.isArray(match?.innings) ? match.innings : [];
      const battingKey = match?.battingTeam === 'team2' ? 'team2' : 'team1';
      if (!inns.length || !match?.battingTeam) return null;
      const firstInnings = inns.find(i => i && i.teamKey && i.teamKey !== battingKey) || inns[0];
      if (!firstInnings || !firstInnings.total) return null;
      if (firstInnings.teamKey === battingKey) return null; // only show in second innings
      const target = match?.targetRuns || ((parseInt(firstInnings.total.runs) || 0) + 1);
      const current = (match?.[battingKey]?.runs) || 0;
      const need = Math.max(0, target - current);
      const totalOvers = parseInt(match?.totalOvers) || 20;
      const ballsBowled = (parseInt(match?.currentOver)||0) * 6 + (parseInt(match?.currentBall)||0);
      const ballsRemaining = Math.max(0, totalOvers*6 - ballsBowled);
      const rrr = ballsRemaining > 0 ? (need / (ballsRemaining/6)) : 0;
      return { battingKey, target, need, ballsRemaining, rrr };
    } catch { return null; }
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
    <div className="min-h-screen bg-gray-50  pb-24 md:pb-4">
      {/* Mobile: Full Scorecard title at top, no navbar space */}
      <div className="md:hidden sticky top-0 bg-white shadow-sm z-50 px-4 py-3 flex items-center gap-2">
        <button onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/', { replace: true }))} className="inline-flex items-center justify-center w-9 h-9" aria-label="Back to Home">
          <ChevronLeftIcon className="w-6 h-6 text-[#2c60ce]" />
        </button>
        <h1 className="text-xl font-semibold">Full Scorecard</h1>
      </div>
      
      <div className="max-w-2xl mx-auto px-4 md:pt-4">
        {/* Desktop: Full Scorecard title with back button */}
        <div className="hidden md:flex mb-4 items-center gap-2">
          <button onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/', { replace: true }))} className="inline-flex items-center justify-center w-9 h-9 focus:outline-none" aria-label="Back to Home">
            <ChevronLeftIcon className="w-6 h-6 text-[#2c60ce]" />
          </button>
          <h1 className="text-2xl font-bold">Full Scorecard</h1>
        </div>
        {/* Full Scorecard top section: Figma replica component */}
        {(['live','break'].includes((match.status||'').toLowerCase())) && (
          <>
            <div className="mb-4 mt-4">
              <FullScoreHeaderCard match={match} teamsByName={teamsByName} />
            </div>
            {/* Toss info (reused styling from Home/LiveScoreboard) */}
            {tossText && (
              <div className="relative w-full mt-3 md:max-w-2xl">
                <div className="rounded-[0.7rem] overflow-hidden bg-white mx-auto border border-[#e6eaf2] shadow-sm px-4 py-2 flex items-center justify-center gap-2">
                  <span className="text-sm text-gray-600">{tossText}</span>
                </div>
              </div>
            )}
            {/* Chase info (Target / Need / RRR) */}
            {chaseInfo && (
              <div className="relative w-full" style={{marginTop:12}}>
                <div className="bg-white rounded-[0.7rem] shadow p-3 flex items-center justify-between md:max-w-2xl mx-auto">
                  <div className="text-sm text-gray-800">
                    Target <span className="font-semibold">{chaseInfo.target}</span>
                  </div>
                  <div className="text-sm text-gray-800">
                    Need <span className="font-semibold">{chaseInfo.need}</span> runs off <span className="font-semibold">{chaseInfo.ballsRemaining}</span> balls
                  </div>
                  <div className="text-sm  text-gray-600">RRR <span className='font-semibold text-[#1f2937] '>{chaseInfo.rrr.toFixed(2)}</span> </div>
                </div>
              </div>
            )}
          </>
        )}
        {(match.status||'').toLowerCase() === 'completed' && (
          <div className="">
            <div className="mt-4 w-full">
              <FullScoreHeaderCard match={match} teamsByName={teamsByName} />
            </div>
            {/* Player of the Match — Figma-styled responsive card */}
            {(() => {
              const mom = match?.awards?.manOfTheMatch || match?.awards?.playerOfTheMatch;
              if (!mom) return null;
              const name = typeof mom === 'string' ? mom : (mom?.name || '');
              // Resolve avatar: prefer explicit URL on award object, else try to lookup in team rosters
              const avatar = (() => {
                const explicit = (typeof mom === 'object') ? (mom?.avatar || mom?.photoUrl || mom?.photo || '') : '';
                if (explicit) return explicit;
                const pid = (typeof mom === 'object') ? (mom.id || mom.playerId || mom.pid || mom.player || null) : null;
                const pname = name;
                const teamPlayers = [ ...(match?.team1?.players || []), ...(match?.team2?.players || []) ];
                if (Array.isArray(teamPlayers) && teamPlayers.length > 0) {
                  const found = teamPlayers.find(p => (pid && ((p.id && p.id === pid) || (p.playerId && p.playerId === pid))) || (!pid && (p.name === pname || p.playerName === pname)));
                  if (found) return getPlayerAvatar(found);
                }
                if (Array.isArray(allPlayers)) {
                  const foundDb = allPlayers.find(p => {
                    if (pid) return (p.id === pid || p.playerId === pid);
                    const pn = String(p.name || '').trim();
                    return pn && pname && pn.toLowerCase() === String(pname).toLowerCase();
                  });
                  if (foundDb) return getPlayerAvatar(foundDb);
                }
                return '';
              })();
              const team = typeof mom === 'object' ? (mom?.team || '') : '';
              const role = typeof mom === 'object' ? (mom?.role || '') : '';
              // derive batting/bowling performance strings and not-out star
              let batText = '';
              let bowlText = '';
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
                  const star = (batEntry.isOut === false || String(batEntry.status||'').toLowerCase().includes('not out')) ? '*' : '';
                  batText = `${br}${star} (${bb})`;
                }
                if (bowlEntry) {
                  const wk = Number(bowlEntry.wickets) || 0;
                  const rc = Number(bowlEntry.runsConceded || bowlEntry.runs || 0) || 0;
                  const balls = Number(bowlEntry.balls) || 0;
                  const overs = `${Math.floor(balls/6)}.${balls%6}`;
                  bowlText = `${wk}-${rc} (${overs})`;
                }
              } catch (e) { batText = ''; bowlText = ''; }
              return (
                <div className="w-full bg-[#E7ECF7] max-w-2xl mx-auto mt-4 mb-2 px-3 sm:px-0 rounded-2xl">
                  <div className=" text-black overflow-hidden">
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
                          <div className="text-xs text-gray-500 sm:text-sm  py-1 rounded-full font-semibold">Player of the Match</div>
                        </div>
                        {role && <div className="mt-2 text-sm opacity-90">{role}</div>}
                        {(batText || bowlText) && (
                          <div className="mt-2 flex items-center text-sm font-semibold text-gray-800">
                            {batText && <span>{batText}</span>}
                            {batText && bowlText && <img src="/Dot.svg" alt="·" className="w-2 h-2 mx-2" />}
                            {bowlText && <span>{bowlText}</span>}
                          </div>
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
          <div className="bg-white rounded-[20px] mt-4 w-full max-w-md mx-auto shadow-[0_6px_15px_0_rgba(0,0,0,0.05)] p-4 sm:p-5 flex flex-col gap-3 h-auto sm:h-[200px] md:h-[200px] lg:h-[200px] border-1 mb-4">
            <div className="flex items-center justify-between px-0">
              <span className="text-[#4b5563] text-[12px] md:text-[15px] font-regular tracking-wide">{dateText}</span>
              {match.venueMapUrl ? (
                <a
                  href={match.venueMapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-white border border-gray-100 shadow-sm px-3 py-1 rounded-md text-[12px] md:text-[13px] text-[#4b5563] hover:text-[#1a4fb8]"
                  onClick={(e) => { e.stopPropagation(); }}
                >
                    <img src="/locationIcon.svg" alt="Location" className="w-4 h-4" />
                    <span className="truncate max-w-[160px]">{match.venue || 'View Map'}</span>
                </a>
              ) : (
                <div className="inline-flex items-center gap-2 bg-white border border-gray-100 shadow-sm px-3 py-1 rounded-md text-[12px] md:text-[13px] text-[#9ca4ab]">
                  <img src="/Location.svg" alt="Location" className="w-4 h-4" />
                  <span className="truncate max-w-[160px]">{match.venue || ''}</span>
                </div>
              )}
            </div>
            <div className="border-b border-[#eef2f6] w-full" />
            <div className="flex items-center justify-between px-0 py-3">
              <div className="flex flex-col items-center w-[86px] -mt-2 md:-mt-1">
                <TeamLogo team={{...withLogoByName(match.team1), key:'team1'}} size={40} className="mb-1" />
                <span className="font-semibold text-base md:text-lg text-[#111] text-center whitespace-nowrap overflow-hidden w-full">{match.team1?.name || 'Team 1'}</span>
              </div>
              <div className="flex flex-col justify-center items-center w-[48px]">
                <span className="text-[#2c60ce] font-bold text-[28px] md:text-[34px] leading-none">v/s</span>
              </div>
              <div className="flex flex-col items-center w-[86px] -mt-2 md:-mt-1">
                <TeamLogo team={{...withLogoByName(match.team2), key:'team2'}} size={40} className="mb-1" />
                <span className="font-semibold text-base md:text-lg text-[#111] text-center whitespace-nowrap overflow-hidden w-full">{match.team2?.name || 'Team 2'}</span>
              </div>
            </div>
            {/* <div className='border border-gray-50 w-full mx-auto'/> */}
            {/* <div className="flex items-center justify-between px-0 pb-1 pt-1 text-sm">
              <span className="text-[#9ca4ab] text-[13px] font-medium">{match.time || (match.startTime || match.dateTime || match.date || '').toString().slice(11,16) || '--:--'}</span>
              <span className="text-[#2c60ce] text-[13px] font-semibold">Overs: {match.totalOvers || 20}</span>
            </div> */}
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
                {match.team1?.name || 'Team 1'}
              </button>
              <button
                role="tab"
                aria-selected={selectedTeam==='team2'}
                className={`flex-1 h-12 rounded-xl text-base font-semibold transition-colors duration-150 focus:outline-none ${selectedTeam==='team2' ? 'bg-[#2c60ce] text-white shadow' : 'text-gray-600'}`}
                onClick={() => setSelectedTeam('team2')}
              >
                {match.team2?.name || 'Team 2'}
              </button>
            </div>
          </div>

          {(() => {
            const inns = Array.isArray(match.innings) ? match.innings : [];
            const inn = inns.find(i => i?.teamKey === selectedTeam);
            const teamObj = match[selectedTeam] || {};
            const teamName = teamObj.name || (selectedTeam === 'team1' ? (match.team1?.name || 'Team 1') : (match.team2?.name || 'Team 2'));
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
                            const isLeft = (idx % 2 === 0);
                            const rounded = isLeft
                              ? 'rounded-l-2xl rounded-r-none'
                              : 'rounded-r-2xl rounded-l-none';
                            const gradient = isLeft
                              ? 'linear-gradient(90deg, rgba(72,122,229,0.10) 0%, #FFFFFF 100%)'
                              : 'linear-gradient(90deg, #FFFFFF 0%, rgba(72,122,229,0.10) 100%)';
                            return (
                            <div
                              key={p.id || p.playerId || idx}
                              className={`flex items-center gap-3 border border-[#e1e5ee] shadow-sm px-3 py-2 ${rounded} overflow-hidden`}
                              style={{ background: gradient }}
                            >
                              <div className={`w-12 h-12 rounded-full overflow-hidden flex items-center justify-center border-2 ${selectedTeam==='team1' ? 'border-[#2c60ce] bg-blue-50' : 'border-gray-400 bg-gray-50'}`}>
                                <img src={getPlayerAvatar(p)} alt={p.name} className="w-full h-full object-cover" />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-semibold text-sm text-gray-900 truncate">{p.name}</span>
                                {(p.role || p.playerRole || p.specialization) && (
                                  <span className="text-xs text-gray-500">{p.role || p.playerRole || p.specialization}</span>
                                )}
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
                        <tr className="bg-[#f7f9fc] text-left text-gray-700 ">
                          <th className="px-2 py-2 text-left font-semibold">Batsman</th>
                          <th className="px-2 py-2 text-left font-semibold">R</th>
                          <th className="px-2 py-2 text-left font-semibold">B</th>
                          <th className="px-2 py-2 text-left font-semibold">4s</th>
                          <th className="px-2 py-2 text-left font-semibold">6s</th>
                          <th className="px-2 py-2 text-left font-semibold">SR</th>
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
                              <td className="px-2 py-2 text-left">{b.runs || 0}</td>
                              <td className="px-2 py-2 text-left">{b.balls || 0}</td>
                              <td className="px-2 py-2 text-left">{b.fours || 0}</td>
                              <td className="px-2 py-2 text-left">{b.sixes || 0}</td>
                              <td className="px-2 py-2 text-left">{(b.balls>0 ? ((b.runs||0)*100/(b.balls||1)) : 0).toFixed(1)}</td>
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
                            const isLeft = (idx % 2 === 0);
                            const rounded = isLeft
                              ? 'rounded-l-2xl rounded-r-none'
                              : 'rounded-r-2xl rounded-l-none';
                            const gradient = isLeft
                              ? 'linear-gradient(90deg, rgba(72,122,229,0.10) 0%, #FFFFFF 100%)'
                              : 'linear-gradient(90deg, #FFFFFF 0%, rgba(72,122,229,0.10) 100%)';
                            return (
                            <div
                              key={p.id || p.playerId || idx}
                              className={`flex items-center gap-3 border border-[#e1e5ee] shadow-sm px-3 py-2 ${rounded} overflow-hidden`}
                              style={{ background: gradient }}
                            >
                              <div className={`w-12 h-12 rounded-full overflow-hidden flex items-center justify-center border-2 ${selectedTeam==='team1' ? 'border-[#2c60ce] bg-blue-50' : 'border-gray-400 bg-gray-50'}`}>
                                <img src={getPlayerAvatar(p)} alt={p.name} className="w-full h-full object-cover" />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-semibold text-sm text-gray-900 truncate">{p.name}</span>
                                {(p.role || p.playerRole || p.specialization) && (
                                  <span className="text-xs text-gray-500">{p.role || p.playerRole || p.specialization}</span>
                                )}
                              </div>
                            </div>
                          );})}
                        </div>
                      </div>
                    )}

                    {/* Bowling for this innings */}
                    <div className="mt-4">
                      <h3 className="text-sm font-semibold mb-1">Bowling</h3>
                      <table className="min-w-full text-xs sm:text-sm border border-[#eef2f6] rounded-lg overflow-hidden mb-2 ">
                        <thead>
                          <tr className="bg-[#f7f9fc] text-gray-700">
                            <th className="px-2 py-2 text-left font-semibold">Bowler</th>
                            <th className="px-2 py-2 text-left font-semibold">O</th>
                            <th className="px-2 py-2 text-left font-semibold">R</th>
                            <th className="px-2 py-2 text-left font-semibold">W</th>
                            <th className="px-2 py-2 text-left font-semibold">4s</th>
                            <th className="px-2 py-2 text-left font-semibold">6s</th>
                            <th className="px-2 py-2 text-left font-semibold">Econ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#eef2f6]">
                          {Array.isArray(inn?.bowling) && inn.bowling.map((b, i) => (
                            <tr key={i} className="hover:bg-[#fafcff]">
                              <td className="px-2 py-2 text-left font-medium">{b.name}</td>
                              <td className="px-2 py-2 text-left">{Math.floor((b.balls||0)/6) + '.' + ((b.balls||0)%6)}</td>
                              <td className="px-2 py-2 text-left">{b.runsConceded || 0}</td>
                              <td className="px-2 py-2 text-left">{b.wickets || 0}</td>
                              <td className="px-2 py-2 text-left">{b.foursConceded || 0}</td>
                              <td className="px-2 py-2 text-left">{b.sixesConceded || 0}</td>
                              <td className="px-2 py-2 text-left">{(() => { const ov = (b.balls||0)/6; return ov>0 ? (b.runsConceded/ov).toFixed(2) : '-'; })()}</td>
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
              {/* Team 1 — Playing XI */}
              <div className="flex-1 rounded-2xl">
                <div className="flex items-center gap-2 mb-3 w-full">
                  <div className="text-sm sm:text-base font-semibold text-[#2c60ce]">{match.team1?.name || 'Team 1'}</div>
                  <img src="/Dot.svg" alt="·" className="w-2 h-2" />
                  <div className="text-sm text-gray-600">Playing XI</div>
                </div>
                {Array.isArray(match.team1?.players) && match.team1.players.length > 0 ? (
                  <>
                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 snap-x snap-mandatory md:grid md:grid-cols-3 lg:grid-cols-4 md:gap-4 md:overflow-visible">
                      {match.team1.players.map((p, idx) => (
                        <div
                          key={p.id || p.playerId || idx}
                          className="min-w-[134px] min-h-[160px] sm:min-w-[160px] md:min-w-0 flex-shrink-0 pt-6 bg-[#e7ecf7] rounded-2xl border border-[#e3e8f0] px-4 py-2 flex flex-col items-center text-center snap-start"
                        >
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden flex items-center justify-center mb-2 ring-2 ring-gray-300 bg-white">
                            <img src={getPlayerAvatar(p)} alt={p.name} className="w-full h-full object-cover" />
                          </div>
                          <div title={p.name} className="font-semibold text-sm sm:text-base text-gray-900 truncate w-full">{((p.name||'').split(' ')[0]) || p.name || 'Player'}</div>
                          <div className="text-[11px] sm:text-xs text-gray-500 mt-1">{p.role || p.type || p.playerRole || p.specialization || 'Player'}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3">
                      <a
                        href={`/team-sheet/${matchId || 'current-match'}/team1`}
                        className="block w-full text-center rounded-xl border border-[#cfd8ea] text-[#2c60ce] py-2 hover:bg-[#f3f7ff]"
                      >
                        See All
                      </a>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-gray-400">Team is not declared yet.</div>
                )}
              </div>

              {/* Team 2 — Playing XI */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <div className="text-sm sm:text-base font-semibold text-[#e11922]">{match.team2?.name || 'Team 2'}</div>
                  <img src="/Dot.svg" alt="·" className="w-2 h-2" />
                  <div className="text-sm text-gray-600">Playing XI</div>
                </div>
                {Array.isArray(match.team2?.players) && match.team2.players.length > 0 ? (
                  <>
                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 snap-x snap-mandatory md:grid md:grid-cols-3 lg:grid-cols-4 md:gap-4 md:overflow-visible">
                      {match.team2.players.map((p, idx) => (
                        <div
                          key={p.id || p.playerId || idx}
                          className="min-w-[134px] min-h-[160px] pt-6 sm:min-w-[160px] md:min-w-0 flex-shrink-0 bg-[#fff7f7] rounded-2xl border border-[#f3d6d6] px-4 py-2 flex flex-col items-center text-center snap-start"
                        >
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden flex items-center justify-center mb-2 ring-2 ring-[#e11922] bg-white">
                            <img src={getPlayerAvatar(p)} alt={p.name} className="w-full h-full object-cover" />
                          </div>
                          <div title={p.name} className="font-semibold text-sm sm:text-base text-gray-900 truncate w-full">{((p.name||'').split(' ')[0]) || p.name || 'Player'}</div>
                          <div className="text-[11px] sm:text-xs text-gray-500 mt-1">{p.role || p.type || p.playerRole || p.specialization || 'Player'}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3">
                      <a
                        href={`/team-sheet/${matchId || 'current-match'}/team2`}
                        className="block w-full text-center rounded-xl border border-[#f3d6d6] text-[#e11922] py-2 hover:bg-[#fff0f0]"
                      >
                        See All
                      </a>
                    </div>
                  </>
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
