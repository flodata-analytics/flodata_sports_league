import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDocument, useCollection } from '../hooks/useFirestore';
import { useAuth } from '../context/AuthContext';
import CelebrationOverlay from './CelebrationOverlay';
import VideoLoader from './VideoLoader';
import TeamLogo from './TeamLogo';
import './no-scrollbar.css';
import { ClockIcon, FireIcon, PlayCircleIcon, PauseCircleIcon, ChevronRightIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { getPlayerAvatar } from '../utils/getPlayerAvatar';

// Figma assets
const imgBadges01 = "/imgBadges01.png";
const imgImage9 = "/imgImage9.png";
const imgCricketBat011 = "/imgCricketBat011.svg";
const imgFrame571 = "/imgFrame571.jpg";
const imgIconamoonArrowUp2Thin = "/imgIconamoonArrowUp2Thin.svg";


function LiveScoreboard({ matchId = 'current-match', disableLink = false, hideBatBowl = false, showTeamRosters = false, teamsByName = new Map(), className = '', showResult = false, resultText = '', showCelebration = true }) {
  const { data: match, loading, error, refetch } = useDocument('matches', matchId, { poll: false });
  const { data: allPlayers } = useCollection('players', 'name');
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const location = useLocation();
  const isFullScorecardRoute = String(location.pathname || '').startsWith('/scorecard');
  // Full-scorecard layout constants (adjustable to match Figma)
  // Logo: 40px on mobile (w-10 = 2.5rem = 40px), larger on md
  const FULL_LOGO_CLASSES = 'w-10 h-10 md:w-14 md:h-14';
  // Card min-height: tuned for Figma proportions (responsive)
  const FULL_CARD_HEIGHT_CLASSES = 'min-h-[180px] md:min-h-[220px]';
  const [celeEvent, setCeleEvent] = useState(null);
  const prevLastBallRef = useRef(null);
  const [openTeamModal, setOpenTeamModal] = useState(null); // 'team1' | 'team2' | null

  // Determine whether the innings has started (used to hide/show sections on Home)
  const inningsStarted = useMemo(() => {
    try {
      if (!match) return false;
      const tKey = match.battingTeam === 'team2' ? 'team2' : 'team1';
      const inns = Array.isArray(match.innings) ? match.innings : [];
      const inn = inns.find(i => i?.teamKey === tKey) || null;
      const bats = Array.isArray(inn?.batting) ? inn.batting : [];
      return bats.some(b => (b.balls > 0 || b.runs > 0 || b.isOnStrike || b.isNonStrike || b.isOut));
    } catch { return false; }
  }, [match]);

  // Team sheet visibility: only show rosters when both teams are decided (players listed)
  const teamsDecided = useMemo(() => {
    const t1 = Array.isArray(match?.team1?.players) && match.team1.players.length > 0;
    const t2 = Array.isArray(match?.team2?.players) && match.team2.players.length > 0;
    return !!(t1 && t2);
  }, [match]);

  // Detect new ball outcomes to trigger animations/sounds
  useEffect(() => {
    if (!match || !Array.isArray(match.recentBalls)) return;
    const last = match.recentBalls[match.recentBalls.length - 1];
    const prev = prevLastBallRef.current;
    prevLastBallRef.current = last;
    if (last === prev) return;

    // Create unique event ID using matchId + ball index to track shown celebrations
    const eventId = `${matchId}_${match.recentBalls.length - 1}_${last}`;
    const shownKey = 'celebrationsShown';
    
    // Check if this event was already shown
    try {
      const shown = JSON.parse(localStorage.getItem(shownKey) || '[]');
      if (shown.includes(eventId)) return; // Already shown, skip
      
      // Add to shown list and store (keep only last 50 events to avoid bloat)
      shown.push(eventId);
      if (shown.length > 50) shown.shift();
      localStorage.setItem(shownKey, JSON.stringify(shown));
    } catch {}

    const normHowOut = () => {
      // Prefer explicit lastWicket info if present
      const t = (match.lastWicket && (match.lastWicket.type || match.lastWicket.kind)) || '';
      if (t) return String(t).toLowerCase();
      try {
        const tKey = match.battingTeam === 'team2' ? 'team2' : 'team1';
        const inns = Array.isArray(match.innings) ? match.innings.slice().reverse() : [];
        const inn = inns.find(i => i?.teamKey === tKey) || null;
        const list = Array.isArray(inn?.batting) ? inn.batting.slice().reverse() : [];
        const dis = list.find(b => b?.out || b?.howOut || (typeof b?.status === 'string' && b.status.toLowerCase().includes('out')));
        const h = dis?.howOut || dis?.status || '';
        return String(h).toLowerCase();
      } catch { return ''; }
    };

    if (last === '4') {
      setCeleEvent({ kind: 'four' });
    } else if (last === '6') {
      setCeleEvent({ kind: 'six' });
    } else if (last === 'W') {
      const h = normHowOut();
      const map = [
        ['bowled','bowled'],
        ['caught','caught'],
        ['lbw','lbw'],
        ['run out','run out'],
        ['stumped','stumped'],
        ['hit wicket','hit wicket'],
      ];
      const sub = (map.find(([k]) => h.includes(k)) || [null, 'default'])[1];
      setCeleEvent({ kind: 'wicket', subkind: sub });
    }
  }, [match, matchId]);

  // Allow other parts of the app to trigger a special celebration
  useEffect(() => {
    const handler = (e) => {
      const d = e?.detail || {};
      if (!d.kind) return;
      setCeleEvent({ kind: d.kind, title: d.title });
    };
    window.addEventListener('celebrate', handler);
    return () => window.removeEventListener('celebrate', handler);
  }, []);

  // Inject blink CSS for live/start dot if not present (keeps behavior consistent with FullScoreHeaderCard)
  React.useEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.getElementById('fs-blink-style')) return;
    const s = document.createElement('style');
    s.id = 'fs-blink-style';
    s.innerHTML = `
      @keyframes fs-blink { 0% { opacity: 1 } 50% { opacity: 0.25 } 100% { opacity: 1 } }
      .fs-blink { animation: fs-blink 1.4s linear infinite; display: inline-block; }
    `;
    document.head.appendChild(s);
  }, []);

  // Hooks must run before any early returns
  // Compute today's date string
  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${da}`;
  }, []);

  // Compute unavailable players for today
  const unavailableSet = useMemo(() => {
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
    const key = p?.id || p?.playerId || p?.name;
    return key ? unavailableSet.has(String(key)) : false;
  };

  if (loading) {
    return <VideoLoader />;
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        Error loading match data: {error.message}
      </div>
    );
  }
  if (!match) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold text-gray-600">No live match available</h3>
        <p className="text-gray-500 mt-2">Check back later for live updates!</p>
      </div>
    );
  }
  const getMatchStatus = () => {
    if (match.status === 'live') return { text: 'LIVE', color: 'bg-red-500', icon: PlayCircleIcon };
    if (match.status === 'break') return { text: 'BREAK', color: 'bg-yellow-500', icon: PauseCircleIcon };
    if (match.status === 'completed') return { text: 'COMPLETED', color: 'bg-gray-500', icon: null };
    return { text: 'UPCOMING', color: 'bg-blue-500', icon: ClockIcon };
  };
  const status = getMatchStatus();
  const StatusIcon = status.icon;
  const tossText = (() => {
    try {
      if (!match?.toss?.winner || !match?.toss?.decision) return '';
      const teamName = match.toss.winner === 'team1' ? (match.team1?.name || 'Team 1') : (match.team2?.name || 'Team 2');
      const action = match.toss.decision === 'bat' ? 'bat' : 'bowl';
      return `${teamName} won the toss and choose to ${action} first.`;
    } catch { return ''; }
  })();

  // Compute chase info for second innings
  const chaseInfo = (() => {
    try {
      const inns = Array.isArray(match.innings) ? match.innings : [];
      const battingKey = match.battingTeam === 'team2' ? 'team2' : 'team1';
      if (!inns.length || !match.battingTeam) return null;
      // Determine first innings as the one by the opposite team
      const firstInnings = inns.find(i => i && i.teamKey && i.teamKey !== battingKey) || inns[0];
      if (!firstInnings || !firstInnings.total) return null;
      // Only show in second innings
      if (firstInnings.teamKey === battingKey) return null;
      const target = match.targetRuns || ((parseInt(firstInnings.total.runs) || 0) + 1);
      const current = (match[battingKey]?.runs) || 0;
      const need = Math.max(0, target - current);
      const totalOvers = parseInt(match.totalOvers) || 20;
      const ballsBowled = (parseInt(match.currentOver)||0) * 6 + (parseInt(match.currentBall)||0);
      const ballsRemaining = Math.max(0, totalOvers*6 - ballsBowled);
      const rrr = ballsRemaining > 0 ? (need / (ballsRemaining/6)) : 0;
      return { battingKey, target, need, ballsRemaining, rrr };
    } catch { return null; }
  })();

  const teamOvers = (teamKey) => {
    try {
      // If this team is currently batting, display live over progress
      if (match.battingTeam === teamKey) {
        const o = Number(match.currentOver) || 0;
        const b = Number(match.currentBall) || 0;
        return `${o}.${b}`;
      }
      // Otherwise, try to read from innings totals for that team
      const inns = Array.isArray(match.innings) ? match.innings : [];
      for (let i = inns.length - 1; i >= 0; i--) {
        if (inns[i]?.teamKey === teamKey && inns[i]?.total?.overs != null) {
          return inns[i].total.overs;
        }
      }
      // Fallback to legacy per-team overs if present
      return String(match[teamKey]?.overs || 0);
    } catch (e) {
      return String(match[teamKey]?.overs || 0);
    }
  };

  // Using shared TeamLogo component across the app

  

  const chipForBall = (b) => {
    const common = 'w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border border-gray-300';
    if (b === 'W') return <div className={`${common} bg-red-50 text-red-600 border-red-200`}>W</div>;
    if (b === '4') return <div className={`${common} bg-green-50 text-green-700 border-green-200`}>4</div>;
    if (b === '6') return <div className={`${common} bg-purple-50 text-purple-700 border-purple-200`}>6</div>;
    if (b === '0' || b === '•' || b === '.') return <div className={`${common} text-gray-600`}>•</div>;
    return <div className={`${common} text-gray-700`}>{b}</div>;
  };

  // Extract current striker/non-striker runs/balls from current innings if available
  const currentBatStats = (() => {
    try {
      const tKey = match.battingTeam === 'team2' ? 'team2' : 'team1';
      const inns = Array.isArray(match.innings) ? match.innings.slice().reverse() : [];
      const inn = inns.find(i => i?.teamKey === tKey) || null;
      const list = Array.isArray(inn?.batting) ? inn.batting : [];
      const find = (id) => list.find(b => (b.playerId === id || b.id === id || b.name === id));
      const s = match.currentStrikerId ? find(match.currentStrikerId) : null;
      const n = match.currentNonStrikerId ? find(match.currentNonStrikerId) : null;
      // Fallback to names directly on match when innings not present
      const striker = s
        ? { name: s.name || s.playerId, runs: s.runs || 0, balls: s.balls || 0, role: 'Batsman' }
        : (match.currentStrikerName ? { name: match.currentStrikerName, runs: 0, balls: 0, role: 'Batsman' } : null);
      const non = n
        ? { name: n.name || n.playerId, runs: n.runs || 0, balls: n.balls || 0, role: 'Batsman' }
        : (match.currentNonStrikerName ? { name: match.currentNonStrikerName, runs: 0, balls: 0, role: 'Batsman' } : null);
      return { striker, non };
    } catch { return { striker: null, non: null }; }
  })();

  const currentBowlerStats = (() => {
    try {
      const tKey = match.battingTeam === 'team2' ? 'team2' : 'team1';
      const inns = Array.isArray(match.innings) ? match.innings.slice().reverse() : [];
      const inn = inns.find(i => i?.teamKey === tKey) || null;
      const list = Array.isArray(inn?.bowling) ? inn.bowling : [];
      const bw = match.currentBowlerId ? list.find(b => (b.playerId === match.currentBowlerId || b.id === match.currentBowlerId || b.name === match.currentBowlerId)) : null;
      const fmtOvers = (balls)=>{ if (!Number.isFinite(balls)) return '0.0'; const o=Math.floor(balls/6), bb=balls%6; return `${o}.${bb}`; };
      if (bw) return { name: bw.name || bw.playerId, runs: bw.runsConceded || 0, wkts: bw.wickets || 0, overs: fmtOvers(bw.balls) };
      if (match.currentBowlerName) return { name: match.currentBowlerName, runs: 0, wkts: 0, overs: '0.0' };
      return null;
    } catch { return null; }
  })();

  const withLogoByName = (team) => {
    try {
      if (!team) return team;
      if (team.logoUrl || team.logo || team.flag) return team;
      const nm = (team.name || '').trim().toLowerCase();
      if (!nm) return team;
      const url = teamsByName instanceof Map ? teamsByName.get(nm) : (teamsByName && teamsByName[nm]);
      return url ? { ...team, logoUrl: url } : team;
    } catch { return team; }
  };

  // Determine winner key for completed matches ('team1'|'team2'|null)
  const winnerKey = (() => {
    try {
      if (!match) return null;
      if (match.winner) {
        if (typeof match.winner === 'string') {
          if (match.winner === 'team1' || match.winner === 'team2') return match.winner;
        } else if (typeof match.winner === 'object') {
          const wname = (match.winner.name || match.winner.teamName || '').toString().trim();
          if (wname) {
            if ((match.team1 && match.team1.name && match.team1.name.toString() === wname)) return 'team1';
            if ((match.team2 && match.team2.name && match.team2.name.toString() === wname)) return 'team2';
          }
        }
      }
      const t1 = Number(match.team1?.runs) || 0;
      const t2 = Number(match.team2?.runs) || 0;
      if (t1 > t2) return 'team1';
      if (t2 > t1) return 'team2';
      return null;
    } catch { return null; }
  })();

  return (
    <div className={`w-full flex flex-col items-center ${className || ''}`}>
      {showCelebration && <CelebrationOverlay event={celeEvent} onDone={() => setCeleEvent(null)} />}
      {match?.isSuperOver && (
        <div className="w-full md:max-w-2xl mb-2">
          <div className="mx-auto bg-gradient-to-r from-[#ff512f] to-[#dd2476] text-white font-semibold tracking-wide rounded-lg shadow px-4 py-2 text-center text-sm md:text-base animate-pulse">
            SUPER OVER IN PROGRESS
          </div>
        </div>
      )}
      {/* Result and Awards */}
      {/* {match.status === 'completed' && (
        <div className="w-full max-w-xs sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mt-4">
          {match.result && <div className="text-center text-green-700 font-semibold mb-1">{match.result}</div>}
          {match.awards?.manOfTheMatch && (
            <div className="text-center text-gray-700 text-sm">Man of the Match: <span className="font-medium">{match.awards.manOfTheMatch}</span></div>
          )}
        </div>
      )} */}
      {/* Scorecard Card */}
        <div className="relative w-full md:max-w-2xl " style={{marginTop: isFullScorecardRoute ? 0 : 48}}>
          <div className={`relative bg-[#fefefe] mx-auto ${isFullScorecardRoute ? 'rounded-[20px] border border-[#e6eaf2]' : 'rounded-[17.664px]'} shadow-[0_6px_15px_0_rgba(0,0,0,0.05)] ${isFullScorecardRoute ? FULL_CARD_HEIGHT_CLASSES + ' px-0 py-0' : 'h-[195px]'} flex ${isFullScorecardRoute ? 'items-start justify-start' : 'items-center justify-center'} w-full overflow-clip ${disableLink ? '' : 'cursor-pointer'}`}
            onClick={disableLink ? undefined : () => navigate(`/scorecard/${matchId || 'current-match'}`)}>
          {/* Live badge or Starting Soon - Figma exact: overlap top border, centered */}
          {(() => {
            const isLive = (match.status === 'live' || match.isSuperOver);
            const isToday = (() => {
              const d = match?.date;
              if (!d) return false;
              const toMs = (val) => {
                if (typeof val === 'string') { const t = Date.parse(val); return Number.isFinite(t) ? t : 0; }
                if (typeof val === 'number') return val;
                if (typeof val === 'object') {
                  if (typeof val.seconds === 'number') return val.seconds*1000;
                  if (val.toDate) { try { return val.toDate().getTime(); } catch { return 0; } }
                }
                return 0;
              };
              const ms = toMs(d); if (!ms) return false;
              const today = new Date(); today.setHours(0,0,0,0);
              const target = new Date(ms); target.setHours(0,0,0,0);
              return today.getTime() === target.getTime();
            })();
            const showSoon = (!isLive && String(match?.status||'').toLowerCase()==='upcoming' && isToday);
            if (!(isLive || showSoon)) return null;
            return (
              <div className="absolute left-1/2 -top-1 z-20 flex items-center justify-center" style={{transform:'translateX(-50%)'}}>
                {isLive ? (
                  <div className="relative flex items-center justify-center" style={{width:80, height:32}}>
                    <img src="/LiveBg.svg" alt="Live" className="absolute top-0 left-1 w-full h-full" />
                    <span className="flex items-center justify-center w-full h-full mt-0 text-white font-semibold text-[16px] relative z-10">
                      <span className="text-center mr-1 text-white text-[18px] fs-blink" style={{lineHeight:'0'}}>&bull;</span>Live
                    </span>
                  </div>
                ) : (
                  <div className="bg-gray-100 text-gray-700 rounded-full px-3 py-1 flex items-center gap-1 text-[14px] font-medium shadow border border-gray-200" style={{minWidth:64,height:28}}>
                    <span className="text-center mr-1 text-gray-700 text-[14px] fs-blink" style={{lineHeight:'0'}}>&bull;</span>Starting soon...
                  </div>
                )}
              </div>
            );
          })()}
          {/* Date & Venue inside the live card (top-left date, top-right venue) */}
          <div className="absolute  top-3 left-5 right-4 z-10 flex items-center justify-between pointer-events-none">
            <span className="text-[12px] md:text-[15px] font-regular tracking-wide text-[#4b5563]">{(() => {
                try {
                  const d = match?.date;
                  if (!d) return '';
                  let ts = 0;
                  if (typeof d === 'number') ts = d;
                  else if (typeof d === 'string') { const p = Date.parse(d); ts = isNaN(p) ? 0 : p; }
                  else if (typeof d === 'object') { if (typeof d.seconds === 'number') ts = d.seconds*1000; else if (d.toDate) { try { ts = d.toDate().getTime(); } catch(e){ ts = 0; } } }
                  if (!ts) return '';
                  const dt = new Date(ts); const day = dt.getDate(); const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; const mon = monthNames[dt.getMonth()]||''; const yr = dt.getFullYear(); return `${day} ${mon} ${yr}`;
                } catch(e) { return ''; }
              })()}</span>
            <div className="pointer-events-auto -pt-2 ">
              {match?.venueMapUrl ? (
                <a href={match.venueMapUrl} target="_blank" rel="noopener noreferrer" className="text-[12px]  md:text-[15px] font-regular tracking-wide text-[#4b5563] hover:text-[#1a4fb8] bg-white/0 px-1 py-0.5 rounded" onClick={(e) => e.stopPropagation()}>
                  <img src="/Location.svg" alt="Location" className="inline-block w-4 h-4 mr-1 align-text-bottom" /> {match.venue || 'View Map'}
                </a>
              ) : (
                <span className="text-[12px] md:text-[15px] font-medium tracking-wide text-[#4b5563] truncate max-w-[50%]">{match?.venue || ''}</span>
              )}



              {/* <div className='w-full border border-gray-100 mx-auto'/> */}
            </div>
          </div>
          <div className={`bg-white w-full h-auto ${isFullScorecardRoute ? 'pt-6 md:pt-8' : ''}`}>
            {/* Divider under date/venue to match upcoming card */}
            <div className={`${isFullScorecardRoute ? 'mt-9 -mb-2' : 'mt-7 -mb-5'}  w-full border-t border-gray-100 mx-auto md:mx-5`}></div>

          <div className={`flex ${isFullScorecardRoute ? 'items-start justify-between px-5 md:px-6' : 'items-center justify-center'} gap-8 w-full ${isFullScorecardRoute ? '' : 'max-w-md mx-auto'}`}>

            {/* Team A */}
            <div className={`flex flex-col items-center w-[90px] ${isFullScorecardRoute ? 'mt-0' : 'mt-6'} gap-1 mb-2`}>
              <TeamLogo
                team={{...withLogoByName(match.team1), key:'team1'}}
                size={isFullScorecardRoute ? 'responsive' : 'sm'}
                className={`mb-1 ${isFullScorecardRoute ? `mt-0 ${FULL_LOGO_CLASSES}` : 'mt-4'}`}
              />
              <div className="flex flex-col items-start gap-0 w-full">
                <p className={`${isFullScorecardRoute ? 'font-semibold text-lg md:text-xl' : 'font-semibold text-[14px] md:text-[15px]'} text-[#111] w-full text-center truncate`}>{match.team1?.name || 'Team A'}</p>
                <div className="flex items-center gap-1 justify-center w-full">
                  <div className="flex items-center mb-4 gap-1 whitespace-nowrap">
                    <span className={`${isFullScorecardRoute ? 'text-[#2c60ce] font-semibold text-[16px] md:text-[32px]' : 'text-[#2c60ce] font-semibold text-[16px]'}`}>{match.team1?.runs || 0}/{match.team1?.wickets || 0}</span>
                    <span className={`${isFullScorecardRoute ? 'text-[#9ca4ab] text-sm md:text-base' : 'text-[#9ca4ab] text-[13px] md:text-[13px]'} flex items-center`}>({teamOvers('team1')} ov)
                      {showResult ? (
                        <img src="./trophy.svg" alt="trophy" className="w-[14px] h-[14px] ml-1 inline-block align-middle" />
                      ) : (match.battingTeam === 'team1' && (
                        <img src={imgCricketBat011} alt="bat" className="w-[18px] h-[18px] ml-1 inline-block align-middle" />
                      ))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            {/* V/S */}
            <div className={`flex flex-col items-center justify-center ${isFullScorecardRoute ? 'w-auto flex-1' : 'w-1/4 min-w-[60px] h-10'} ${(!isFullScorecardRoute && String(match?.status||'').toLowerCase() === 'upcoming') ? 'mt-[50%]' : ''}`}>
              <p className={`${isFullScorecardRoute ? 'font-bold text-[#2c60ce] text-[40px] md:text-[48px] leading-none' : 'font-bold text-[#2c60ce] text-[24px] leading-none'}`}>V/S</p>
            </div>
            {/* Team B */}
            <div className={`flex flex-col items-center w-[90px] gap-1 mb-2 ${isFullScorecardRoute ? 'mt-0' : 'mt-6'}`}>
              <TeamLogo
                team={{...withLogoByName(match.team2), key:'team2'}}
                size={isFullScorecardRoute ? 'responsive' : 'sm'}
                className={`mb-1 ${isFullScorecardRoute ? `mt-0 ${FULL_LOGO_CLASSES}` : 'mt-4'}`}
              />
              <div className="flex flex-col items-start gap-0 w-full">
                <p className={`${isFullScorecardRoute ? 'font-semibold text-lg md:text-xl' : 'font-semibold text-[14px] md:text-[15px]'} text-[#111] w-full text-center truncate`}>{match.team2?.name || 'Team B'}</p>
                <div className="flex items-center gap-1 justify-center w-full">
                  <div className="mb-2 flex items-center gap-1 whitespace-nowrap">
                    <span className={`${isFullScorecardRoute ? 'text-[#2c60ce] font-semibold text-[16px] md:text-[32px]' : 'text-[#2c60ce] font-medium text-[16px]'}`}>{match.team2?.runs || 0}/{match.team2?.wickets || 0}</span>
                    <span className={`${isFullScorecardRoute ? 'text-[#9ca4ab] text-sm md:text-base' : 'text-[#9ca4ab] text-[13px] md:text-[14px]'} flex items-center`}>({teamOvers('team2')} ov)
                      {showResult ? (
                        <img src="/trophy.svg" alt="trophy" className="w-[14px] h-[14px] ml-1 inline-block align-middle" />
                      ) : (match.battingTeam === 'team2' && (
                        <img src={imgCricketBat011} alt="bat" className="w-[18px] h-[18px] ml-1 inline-block align-middle" />
                      ))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            {/* Cricket bat icon */}
            {/* Bat icon moved to batting team's overs */}
          </div>
          {showResult && resultText && (
            <div className="w-full max-w-md mx-auto mt-3 text-center">
              <div className='border border-grey-400 m-5 mb-4'></div>
              <div className="text-green-700 font-semibold">{resultText}</div>
            </div>
          )}

          </div>
        </div>
      </div>


      {/* Toss info */}
      {tossText && match.status !== 'completed' && (
        <div className="relative w-full mt-3 md:max-w-2xl">
          <div className="rounded-[0.7rem] overflow-hidden bg-white mx-auto border border-[#e6eaf2] shadow-sm px-4 py-2 flex items-center justify-center gap-2">
            <span className="text-sm text-gray-600">{tossText}</span>
          </div>
        </div>
      )}


  {/* Chase Info */}
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

      

  {/* Batsman section (hidden when innings not started) */}
  {!hideBatBowl && inningsStarted && (
        <div className="relative w-full md:max-w-2xl" style={{marginTop:32}}>
          <div className="flex items-center justify-between w-full  mx-auto h-6 mb-0">
            <span className="font-medium text-[16px] text-black">Batsman</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); navigate(`/scorecard/${matchId || 'current-match'}`); }}
              className="flex items-center group"
            >
              <span className="font-normal text-[#888] text-[14px] group-hover:underline">See more</span>
              <span className="flex items-center ml-1" style={{transform:'rotate(90deg)'}}>
                <img src={imgIconamoonArrowUp2Thin} alt="arrow" className="w-[24px] h-[18px]" />
              </span>
            </button>
          </div>
          <div
            className="bg-[#fefefe] rounded-[17.664px] shadow-[0_6px_15px_0_rgba(0,0,0,0.05)] p-4 mt-4 flex flex-col gap-2 w-full max-w-md mx-auto cursor-pointer md:max-w-2xl"
            onClick={() => navigate(`/scorecard/${matchId || 'current-match'}`)}
          >
            <div className="flex flex-col gap-[20px] w-full">
              {[currentBatStats.striker, currentBatStats.non].filter(Boolean).map((p, idx) => {
                const isStriker = idx === 0;
                // Resolve avatar from players collection when possible
                const resolveAvatar = (pl) => {
                  try {
                    if (!pl) return imgFrame571;
                    // If object already looks like a full player with avatar/gender
                    if (pl.avatar || pl.gender || pl.id || pl.playerId) return getPlayerAvatar(pl);
                    // Otherwise try to find by name in allPlayers
                    if (Array.isArray(allPlayers)) {
                      const found = allPlayers.find(x => (x.name || '').toString().trim().toLowerCase() === (pl.name || '').toString().trim().toLowerCase());
                      if (found) return getPlayerAvatar(found);
                    }
                    return imgFrame571;
                  } catch { return imgFrame571; }
                };

                const avatarSrc = resolveAvatar(p);

                return (
                  <div key={idx} className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-[15px]">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-[#bbbbbb] flex items-center justify-center">
                        <img src={avatarSrc} alt={p.name} className="w-full h-full object-cover rounded-full" />
                      </div>
                      <div className="flex flex-col items-start w-20">
                        <p className="font-medium text-[#111] text-[16px] leading-[24.3px] w-full whitespace-nowrap">{(() => {
                          try {
                            if (Array.isArray(allPlayers)) {
                              const found = allPlayers.find(x => (x.name||'').toLowerCase() === (p.name||'').toLowerCase());
                              const jn = found?.jerseyNumber || found?.jerseyNo || found?.jersey;
                              return jn ? ` ${p.name}` : p.name;
                            }
                          } catch {}
                          return p.name;
                        })()}</p>
                        <p className="font-normal text-[#9ca4ab] text-[12px] leading-[17.7px] w-full">All-Rounder</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <p className="font-medium text-[#111] text-[20px]">{p.runs}{isStriker ? '*' : ''}</p>
                      <p className="font-normal text-[#9ca4ab] text-[14px]">({p.balls})</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bowler section */}
      {!hideBatBowl && (
        <div className="relative w-full max-w-2xl" style={{marginTop:32}}>
          <div className="max-w-2xl flex items-center justify-between w-full  mx-auto h-6 mb-0">
            <span className="font-medium  text-[16px] text-black">Bowler</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); navigate(`/scorecard/${matchId || 'current-match'}`); }}
              className="flex items-center group"
            >
              <span className="font-normal text-[#888] text-[14px] group-hover:underline">See more</span>
              <span className=" flex items-center ml-1" style={{transform:'rotate(90deg)'}}>
                <img src={imgIconamoonArrowUp2Thin} alt="arrow" className="w-[24px] h-[18px]" />
              </span>
            </button>
          </div>
          <div className="bg-[#fefefe] rounded-[17.664px] shadow-[0_6px_15px_0_rgba(0,0,0,0.05)] p-4 mt-4 flex flex-col gap-4 w-full max-w-md mx-auto md:max-w-2xl" onClick={() => navigate(`/scorecard/${matchId || 'current-match'}`)}>
            {!inningsStarted ? (
              <div className="w-full flex items-center justify-center py-4">
                <p className="text-center text-gray-400 text-base sm:text-lg md:text-xl">Inning is about to start.</p>
              </div>
            ) : (
            currentBowlerStats && (
              <>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-[15px]">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-[#bbbbbb] flex items-center justify-center">
                      {(() => {
                        try {
                          // try to find bowler in players collection by name
                          let avatar = imgFrame571;
                          if (Array.isArray(allPlayers)) {
                            const found = allPlayers.find(x => (x.name||'').toString().trim().toLowerCase() === (currentBowlerStats.name||'').toString().trim().toLowerCase());
                            if (found) avatar = getPlayerAvatar(found);
                          }
                          return <img src={avatar} alt={currentBowlerStats.name} className="w-full h-full object-cover rounded-full" />;
                        } catch { return <img src={imgFrame571} alt={currentBowlerStats.name} className="w-full h-full object-cover rounded-full" />; }
                      })()}
                    </div>
                    <div className="flex flex-col items-start w-20">
                      <p className="whitespace-nowrap font-medium text-[#111] text-[16px] leading-[24.3px] w-full">{(() => {
                        try {
                          if (Array.isArray(allPlayers)) {
                            const found = allPlayers.find(x => (x.name||'').toLowerCase() === (currentBowlerStats.name||'').toLowerCase());
                            const jn = found?.jerseyNumber || found?.jerseyNo || found?.jersey;
                            return jn ? `#${jn} ${currentBowlerStats.name}` : currentBowlerStats.name;
                          }
                        } catch {}
                        return currentBowlerStats.name;
                      })()}</p>
                      <p className="font-normal text-[#9ca4ab] text-[12px] leading-[17.7px] w-full">Bowler</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="flex items-center gap-1 whitespace-nowrap">
                      <p className="font-medium text-[#111] text-[20px]">{currentBowlerStats.runs}/{currentBowlerStats.wkts}</p>
                      <p className="font-normal text-[#9ca4ab] text-[14px] flex items-center">({currentBowlerStats.overs} Overs)</p>
                    </div>
                  </div>
                </div>
                {/* Show all balls in the current over, scrollable if more than 6 */}
                {Array.isArray(match.recentBalls) && typeof match.currentBall === 'number' && typeof match.currentOver === 'number' && match.recentBalls.length > 0 && (
                  <div className="mt-3 flex flex-col w-full max-w-full overflow-x-auto no-scrollbar">
                    <div className="flex gap-1 sm:gap-2 justify-start w-fit min-w-0" style={{minWidth:'0'}}>
                      {(() => {
                        // Only show the current over's deliveries
                        const isLegal = (x) => {
                          if (x === 'W' || x === '0' || x === '•' || x === '.' || x === '1' || x === '2' || x === '3' || x === '4' || x === '6') return true;
                          if (typeof x === 'string' && (x.startsWith('B:') || x.startsWith('Lb:'))) return true;
                          return false;
                        };
                        const rb = match.recentBalls || [];
                        const legalTarget = (match.currentBall === 0 ? 6 : match.currentBall);
                        let i = rb.length - 1;
                        let legalSeen = 0;
                        const currentOverBalls = [];
                        while (i >= 0 && legalSeen < legalTarget) {
                          currentOverBalls.unshift(rb[i]);
                          if (isLegal(rb[i])) legalSeen++;
                          i--;
                        }
                        // Include any extras at the start of the over (before first legal)
                        while (i >= 0 && !isLegal(rb[i])) {
                          currentOverBalls.unshift(rb[i]);
                          i--;
                        }
                        return currentOverBalls.map((b, i) => {
                          let raw = b;
                          let value = b;
                          if (typeof b === 'string') {
                            if (b.startsWith('Nb:')) { const val = b.split(':')[1]; value = val ? `Nb+${val}` : 'Nb'; }
                            else if (b.startsWith('Wd:')) { const val = b.split(':')[1]; value = val ? `Wd+${val}` : 'Wd'; }
                            else if (b.startsWith('B:')) { const val = b.split(':')[1]; value = val ? `B+${val}` : 'B'; }
                            else if (b.startsWith('Lb:')) { const val = b.split(':')[1]; value = val ? `Lb+${val}` : 'Lb'; }
                            else if (b === '0' || b === '•' || b === '.') { value = '•'; }
                          } else if (b === '0' || b === '•' || b === '.') value = '•';

                          // Color scheme per outcome
                          const base = 'rounded-full h-[1.7rem] sm:h-11 px-1 sm:px-2 min-w-[1.7rem] sm:min-w-[2.75rem] flex items-center justify-center border';
                          let className = 'bg-white border-[#e6eaf2]';
                          let textClass = 'text-[#111] text-[20px]';
                          const s = String(raw);
                          if (s === '6') { className = 'bg-[#418019] border-[#37780e]'; textClass = 'text-white'; }
                          else if (s === '4') { className = 'bg-[#3290ac] border-[#177f9f]'; textClass = 'text-[#ffff]'; }
                          else if (s === 'W') { className = 'bg-[#aa0707] border-[#850505]'; textClass = 'text-white'; }
                          else if (s.startsWith('Wd')) { className = 'bg-white border-amber-500'; textClass = 'text-amber-600'; }
                          else if (s.startsWith('Nb')) { className = 'bg-white border-violet-500'; textClass = 'text-violet-600'; }
                          else if (s.startsWith('B') || s.startsWith('Lb')) { className = 'bg-white border-teal-500'; textClass = 'text-teal-600'; }
                          else if (value === '•') { className = 'bg-white border-gray-300'; textClass = 'text-gray-600'; }

                          return (
                            <div key={i} className={`${base} ${className}`}>
                              <span className={`font-semibold text-[16px] sm:text-base leading-none whitespace-nowrap ${textClass}`}>{value}</span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
              </>
            ))}
          </div>
        </div>
      )}
  
      {/* Global note when teams are not decided yet */}
      {!teamsDecided && (
        <div className="relative w-full sm:max-w-md  lg:max-w-xl xl:max-w-2xl" style={{marginTop:16}}>
          <div className="w-full flex items-center justify-center py-3">
            <p className="text-center text-gray-500 text-md sm:text-base md:text-lg">Team is not declared yet.</p>
          </div>
        </div>
      )}
      
  {/* Team Rosters (Player List) - opt-in via prop; show only when innings started and teams are decided */}
  {showTeamRosters && inningsStarted && teamsDecided && (
  <div className="relative w-full sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl" style={{marginTop:32}}>
        <div className="flex flex-col  gap-6">
          {/* Team Blue Roster */}
          <div
            className="flex-1 bg-white rounded-2xl shadow-lg p-4 cursor-pointer hover:shadow-xl transition"
            onClick={() => navigate(`/team-sheet/${matchId || 'current-match'}/team1`)}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#2c60ce] inline-block"></span>
              <h3 className="font-semibold text-lg text-[#2c60ce] tracking-wide">Team Blue</h3>
              </div>
              <button
                type="button"
                className="px-3 py-1 text-sm rounded-full border border-[#cfd8ea] text-[#2c60ce] bg-white hover:bg-[#f3f7ff]"
                onClick={(e) => { e.stopPropagation(); navigate(`/team-sheet/${matchId || 'current-match'}/team1`); }}
              >
                See more
              </button>
            </div>
            {Array.isArray(match.team1?.players) && match.team1.players.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
                {match.team1.players.map((p, idx) => (
                  <div key={p.id || p.playerId || idx} className={`flex flex-col items-center min-w-[80px] max-w-[90px] bg-[#f7faff] rounded-xl shadow border ${isUnavailable(p) ? 'border-[#f3d6d6] opacity-70' : 'border-[#e3e8f0]'} px-3 py-2 mx-1`}>
                    <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center mb-1 border-2 border-[#2c60ce]">
                      <img src={getPlayerAvatar(p)} alt={p.name} className="w-full h-full object-cover" />
                    </div>
                    <span className="font-semibold text-sm text-gray-900 text-center truncate w-full">{p.name}</span>
                    {isUnavailable(p) && (
                      <span className="mt-1 inline-flex items-center px-2 py-[1px] rounded-full text-[10px] font-semibold bg-[#ffe8e8] text-[#d92d20] border border-[#f3d6d6] whitespace-nowrap">Unavailable</span>
                    )}
                    {p.gender && <span className="text-xs text-[#2c60ce] mt-0.5">{p.gender}</span>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-400">Team is not declared yet.</div>
            )}
          </div>
          {/* Team White Roster */}
          <div
            className="flex-1 bg-white rounded-2xl shadow-lg p-4 cursor-pointer hover:shadow-xl transition"
            onClick={() => navigate(`/team-sheet/${matchId || 'current-match'}/team2`)}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#e11922] inline-block"></span>
              <h3 className="font-semibold text-lg text-[#e11922] tracking-wide">Team White</h3>
              </div>
              <button
                type="button"
                className="px-3 py-1 text-sm rounded-full border border-[#f3d6d6] text-[#e11922] bg-white hover:bg-[#fff0f0]"
                onClick={(e) => { e.stopPropagation(); navigate(`/team-sheet/${matchId || 'current-match'}/team2`); }}
              >
                See more
              </button>
            </div>
            {Array.isArray(match.team2?.players) && match.team2.players.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
                {match.team2.players.map((p, idx) => (
                  <div key={p.id || p.playerId || idx} className={`flex flex-col items-center min-w-[80px] max-w-[90px] bg-[#fff7f7] rounded-xl shadow border ${isUnavailable(p) ? 'border-[#f3d6d6] opacity-70' : 'border-[#f3d6d6]'} px-3 py-2 mx-1`}>
                    <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center mb-1 border-2 border-[#e11922]">
                      <img src={getPlayerAvatar(p)} alt={p.name} className="w-full h-full object-cover" />
                    </div>
                    <span className="font-semibold text-sm text-gray-900 text-center truncate w-full">{p.name}</span>
                    {isUnavailable(p) && (
                      <span className="mt-1 inline-flex items-center px-2 py-[1px] rounded-full text-[10px] font-semibold bg-[#ffe8e8] text-[#d92d20] border border-[#f3d6d6] whitespace-nowrap">Unavailable</span>
                    )}
                    {p.gender && <span className="text-xs text-[#e11922] mt-0.5">{p.gender}</span>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-400">Team is not declared yet.</div>
            )}
          </div>
        </div>
        {/* Playing XI Modal Overlay */}
        {openTeamModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div
              className={`relative w-full max-w-md mx-auto rounded-3xl shadow-2xl p-6 ${openTeamModal==='team1' ? 'bg-[#2c60ce]' : 'bg-[#fff7f7]'} transition-all`}
            >
              <button
                className="absolute top-4 right-4 text-white bg-black bg-opacity-30 hover:bg-opacity-60 rounded-full p-1"
                onClick={() => setOpenTeamModal(null)}
                aria-label="Close"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
              <h2 className={`text-2xl font-bold mb-4 text-center ${openTeamModal==='team1' ? 'text-white' : 'text-[#e11922]'}`}>{openTeamModal==='team1' ? 'Team Blue' : 'Team White'} - Playing XI</h2>
              <div className="grid grid-cols-2 gap-4">
                {(openTeamModal==='team1' ? match.team1?.players : match.team2?.players)?.map((p, idx) => (
                  <div
                    key={p.id || p.playerId || idx}
                    onClick={() => {
                      const pid = p.id || p.playerId || p.name;
                      if (pid) navigate(`/player/${encodeURIComponent(pid)}`);
                    }}
                    className={`flex flex-col items-center rounded-xl shadow-md px-2 py-3 ${openTeamModal==='team1' ? 'bg-[#3a7be0]' : 'bg-white'} transition cursor-pointer`}
                  >
                    <div className={`w-14 h-14 rounded-full overflow-hidden flex items-center justify-center mb-2 border-2 ${openTeamModal==='team1' ? 'border-white' : 'border-[#e11922]'}`}>
                      <img src={getPlayerAvatar(p)} alt={p.name} className="w-full h-full object-cover" />
                    </div>
                    <span className={`font-semibold text-base text-center truncate w-full ${openTeamModal==='team1' ? 'text-white' : 'text-[#e11922]'}`}>{p.name}</span>
                    {p.gender && <span className={`text-xs mt-0.5 ${openTeamModal==='team1' ? 'text-blue-100' : 'text-[#e11922]'}`}>{p.gender}</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
  </div>
  )}
    </div>
  );
}

export default LiveScoreboard;