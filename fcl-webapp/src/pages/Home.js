import React, { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {  useLocation } from 'react-router-dom';
import LiveScoreboard from '../components/LiveScoreboard';
import TeamLogo from '../components/TeamLogo';
import HeroVideo from '../components/HeroVideo';
import VideoLoader from '../components/VideoLoader';
// import FanPollCard from '../components/FanPollCard';
import MatchSummaryCard from '../components/MatchSummaryCard';
import { useCollection, useDocument } from '../hooks/useFirestore';

function Home() {
  const { currentUser, userProfile, makeUserAdmin } = useAuth();
  const [makingAdmin, setMakingAdmin] = useState(false);
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const matchId = params.get('matchId') || 'current-match';
  // Sync tab state with URL query param
  const tabParam = params.get('tab');
  const [tab, setTab] = useState(tabParam === 'upcoming' || tabParam === 'completed' ? tabParam : 'live');
  // Track if user manually selected a tab and if we've applied the first-load default
  const userSelectedTabRef = React.useRef(false);
  const initialAutoDoneRef = React.useRef(false);

  // Update tab state if URL changes
  React.useEffect(() => {
    const p = new URLSearchParams(location.search);
    const t = p.get('tab');
    if (t && (t === 'live' || t === 'upcoming' || t === 'completed')) {
      setTab(t);
    } else if (!t && tab !== 'live') {
      setTab('live');
    }
  }, [location.search]);

  // Helper to update tab and URL
  const handleTabChange = (newTab) => {
    if (newTab === tab) return;
    userSelectedTabRef.current = true;
    const p = new URLSearchParams(location.search);
    p.set('tab', newTab);
    window.history.replaceState(null, '', `${location.pathname}?${p.toString()}`);
    setTab(newTab);
  };

  // Format a match date for card headers (e.g. '12 Nov 2025')
  const formatCardDate = (d) => {
    if (!d) return '';
    try {
      let ts = 0;
      if (typeof d === 'number') ts = d;
      else if (typeof d === 'string') {
        const p = Date.parse(d);
        ts = isNaN(p) ? 0 : p;
      } else if (typeof d === 'object') {
        if (typeof d.seconds === 'number') ts = d.seconds * 1000;
        else if (d.toDate) {
          try { ts = d.toDate().getTime(); } catch (e) { ts = 0; }
        }
      }
      if (!ts) return (typeof d === 'string') ? d : '';
      const dt = new Date(ts);
      const day = dt.getDate();
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const mon = monthNames[dt.getMonth()] || '';
      const yr = dt.getFullYear();
      return `${day} ${mon} ${yr}`;
    } catch (e) {
      return (typeof d === 'string') ? d : '';
    }
  };


  // Fetch only the currently selected tab's subset to reduce reads
  const whereForTab = useMemo(() => {
    if (tab === 'live') return [{ field: 'status', operator: 'in', value: ['live', 'break'] }];
    if (tab === 'upcoming') return [{ field: 'status', operator: '==', value: 'upcoming' }];
    return [{ field: 'status', operator: '==', value: 'completed' }];
  }, [tab]);
  const limitForTab = tab === 'live' ? 5 : 24;
  // Enable polling for live and completed tabs to auto-update when status changes
  const enablePolling = tab === 'live' || tab === 'completed';
  // Remove server-side orderBy to avoid composite index requirements; we'll sort client-side by date
  const { data: matches, loading: matchesLoading, error: matchesError } = useCollection('matches', null, whereForTab, limitForTab, {
    poll: enablePolling, // enable polling for live and completed tabs
  });
  // Fallback: also watch the shadow doc in case the real match doc isn't marked live yet
  const { data: shadowMatch } = useDocument('matches', 'current-match', { enabled: tab === 'live' });
  const shadowRealId = (shadowMatch && shadowMatch.id && shadowMatch.id !== 'current-match') ? shadowMatch.id : null;
  const { data: shadowReal } = useDocument('matches', shadowRealId || 'noop', { enabled: tab === 'live' && !!shadowRealId });

  // Additional data sources for Live tab behavior
  const { data: upcomingAll, loading: upcomingAllLoading } = useCollection('matches', null, [{ field: 'status', operator: '==', value: 'upcoming' }], 24, { poll: false });
  const { data: completedAll, loading: completedAllLoading } = useCollection('matches', null, [{ field: 'status', operator: '==', value: 'completed' }], 24, { poll: tab === 'live' || tab === 'completed' });
  // Teams collection used to map team names -> logoUrl for legacy matches missing embedded logos
  const { data: teams } = useCollection('teams', 'name');

  // Build a lookup map: normalized team name -> logoUrl
  const teamsByName = useMemo(() => {
    const map = new Map();
    (teams || []).forEach(t => {
      const name = (t?.name || '').trim().toLowerCase();
      const url = t?.logoUrl || t?.logo || t?.flag || '';
      if (name && url && !map.has(name)) {
        map.set(name, url);
      }
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

  // Compute a human-friendly result string for completed matches.
  const computeMatchResult = (m) => {
    try {
      if (!m) return '';
      // Prefer an explicit winner field when available
      let winnerKey = null; // 'team1' or 'team2'
      let winnerName = '';
      if (m.winner) {
        if (typeof m.winner === 'string') {
          if (m.winner === 'team1' || m.winner === 'team2') {
            winnerKey = m.winner;
            winnerName = (m[winnerKey] && m[winnerKey].name) || (winnerKey === 'team1' ? 'Team 1' : 'Team 2');
          } else {
            // Winner may already be a display name
            winnerName = m.winner;
          }
        } else if (typeof m.winner === 'object') {
          winnerName = m.winner.name || m.winner.teamName || '';
        }
      }

      const t1 = Number(m.team1?.runs) || 0;
      const t2 = Number(m.team2?.runs) || 0;

      if (!winnerKey) {
        if (t1 > t2) winnerKey = 'team1';
        else if (t2 > t1) winnerKey = 'team2';
      }
      if (!winnerName && winnerKey) winnerName = (m[winnerKey] && m[winnerKey].name) || (winnerKey === 'team1' ? 'Team 1' : 'Team 2');

      if (t1 === t2) {
        return 'Match tied';
      }

      // Try innings/target-based wicket margin detection for chases
      const inns = Array.isArray(m.innings) ? m.innings : null;
      if (inns && inns.length > 0 && winnerKey) {
        // Determine first innings runs if present
        const firstInnings = inns[0];
        const firstRuns = firstInnings && firstInnings.total && Number(firstInnings.total.runs);
        const target = (m.targetRuns != null) ? Number(m.targetRuns) : (Number.isFinite(firstRuns) ? firstRuns + 1 : null);
        const winnerRuns = Number(m[winnerKey]?.runs) || 0;
        const winnerWkts = Number(m[winnerKey]?.wickets);
        if (target != null && winnerRuns >= target) {
          const rem = 10 - (Number.isFinite(winnerWkts) ? winnerWkts : 0);
          const wktsText = `${rem} wicket${rem === 1 ? '' : 's'}`;
          return `${winnerName} won by ${wktsText}`;
        }
      }

      // Fallback to run margin
      const diff = Math.abs(t1 - t2);
      if (diff > 0 && winnerName) {
        return `${winnerName} won by ${diff} run${diff === 1 ? '' : 's'}`;
      }

      // Final fallback: use existing result text if present
      return m.result || '';
    } catch (e) {
      return m.result || '';
    }
  };

  const groups = useMemo(() => {
    const live = [];
    const upcoming = [];
    const completed = [];
    const seen = new Set();
    (matches||[]).forEach(m => {
      if (!m || m.id === 'current-match') return; // exclude shadow doc
      if (seen.has(m.id)) return;
      seen.add(m.id);
      const st = (m.status || '').toLowerCase();
      if (st === 'live' || st === 'break') live.push(m);
      else if (st === 'completed') completed.push(m);
      else upcoming.push(m);
    });
    // Sort by date descending if possible
    const ts = (d) => {
      if (!d) return 0;
      if (typeof d === 'number') return d;
      if (typeof d === 'string') return Date.parse(d) || 0;
      if (typeof d === 'object') {
        if (typeof d.seconds === 'number') return d.seconds * 1000;
        if (d.toDate) {
          try { return d.toDate().getTime(); } catch(e) {}
        }
      }
      return 0;
    };
    // Build extra inclusions for Live tab: (1) upcoming today
    const liveIds = new Set(live.map(m => m.id));
    const completedIds = new Set(completed.map(m => m.id));
    const now = Date.now();
    const startOfToday = (() => { const d = new Date(); d.setHours(0,0,0,0); return d.getTime(); })();
    const endOfToday = startOfToday + 24*60*60*1000 - 1;
    const upcomingToday = (upcomingAll||[])
      .filter(m => m && m.id !== 'current-match' && !liveIds.has(m.id) && !seen.has(m.id))
      .filter(m => {
        const t = ts(m.date);
        return t >= startOfToday && t <= endOfToday;
      })
      .sort((a,b)=> (ts(a.date) - ts(b.date)));

    // attach to return for use in rendering/effects
    const grouped = { live, upcoming, completed };
    grouped.__extras = { upcomingToday, ts };
    live.sort((a,b)=> ts(b.date) - ts(a.date));
    upcoming.sort((a,b)=> ts(a.date) - ts(b.date));
    completed.sort((a,b)=> ts(b.date) - ts(a.date));
    return grouped;
  }, [matches, upcomingAll, completedAll]);

  // First load: if no live matches, default to Upcoming (only once, and only if user hasn't chosen a tab and URL has no tab)
  React.useEffect(() => {
    if (initialAutoDoneRef.current) return;
    const loadingAny = matchesLoading || upcomingAllLoading || completedAllLoading;
    if (loadingAny) return;
    const p = new URLSearchParams(location.search);
    const hasParam = !!p.get('tab');
    if (hasParam) { initialAutoDoneRef.current = true; return; }
    if (userSelectedTabRef.current) { initialAutoDoneRef.current = true; return; }
    const shadowIsLive = ['live','break'].includes(((shadowMatch||{}).status||'').toLowerCase());
    const shadowRealIsLive = ['live','break'].includes(((shadowReal||{}).status||'').toLowerCase());
    const hasLive = (groups.live.length > 0) || (shadowIsLive && shadowRealIsLive);
    if (!hasLive && tab === 'live') {
      p.set('tab', 'upcoming');
      window.history.replaceState(null, '', `${location.pathname}?${p.toString()}`);
      setTab('upcoming');
    }
    initialAutoDoneRef.current = true;
  }, [matchesLoading, upcomingAllLoading, completedAllLoading, groups.live.length, location.pathname, location.search, tab, shadowMatch, shadowReal]);

  // Do NOT auto-switch away from the Live tab; keep user's choice respected
  React.useEffect(() => {
    // Intentionally left blank: previously auto-switched to 'upcoming' when no live matches.
  }, [matchesLoading, upcomingAllLoading, completedAllLoading, tab, groups.live.length, location.pathname, location.search, shadowMatch, shadowReal, groups.__extras]);

  const handleMakeAdmin = async () => {
    if (!currentUser) return;
    try {
      setMakingAdmin(true);
      await makeUserAdmin(currentUser.uid);
      alert('You are now an admin! Refresh the page to see admin options.');
    } catch (error) {
      alert('Error making you admin: ' + error.message);
    } finally {
      setMakingAdmin(false);
    }
  };

  

  return (
    <div className="min-h-screen bg-gray-50 py-4">
      <div className="w-full max-w-full md:max-w-2xl mx-auto px-4">
        <div className='w-full block h-[20px] bg-[#f9fafb]  text-black -mt-5 fixed md:hidden' style={{zIndex:990}}></div>
        {/* max-w-md */}
        {/* Mobile header */}
        {/* <div className="flex items-center justify-between mb-4">
          <div className="text-2xl font-bold">FCL 2025</div>
          <div className="w-9 h-9 rounded-full bg-gray-300"></div>
          </div> */}
      
        {/* Segmented tabs */}
        <div className="mb-4 fixed z-50 mx-auto left-0 right-0 top-13 px-4 md:max-w-2xl md:relative md:top-0">
          <div className=" flex bg-white rounded-full p-1 shadow-sm">
            <button onClick={()=>handleTabChange('live')} className={`flex-1 py-2 text-sm rounded-full ${tab==='live' ? 'bg-brand-primary text-white' : 'text-gray-600'}`}>Live</button>
            <button onClick={()=>handleTabChange('upcoming')} className={`flex-1 py-2 text-sm rounded-full ${tab==='upcoming' ? 'bg-brand-primary text-white' : 'text-gray-600'}`}>Upcoming</button>
            <button onClick={()=>handleTabChange('completed')} className={`flex-1 py-2 text-sm rounded-full ${tab==='completed' ? 'bg-brand-primary text-white' : 'text-gray-600'}`}>Completed</button>
          </div>
        </div>
        {/* <div className="mb-3 flex justify-end">
          <button onClick={refetch} className="p-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 flex items-center" title="Refresh">
            <ArrowPathIcon className="w-5 h-5" />
          </button>
        </div> */}

        {matchesError && (
          <div className="mb-4 p-3 rounded border border-red-300 bg-red-50 text-red-700 text-sm">
            Failed to load matches: {String(matchesError.message || matchesError)}
          </div>
        )}

        {tab === 'live' && (
          <div>
            {/* Scoped style: add breathing space and completed-tab styling to Live card only on Home */}
            <style>{`
              .home-live-card .bg-\\[\\#fefefe\\] {
                border: 1px solid #e6eaf2;
                border-radius: 20px !important;
                box-shadow: 0 6px 24px 0 rgba(44, 96, 206, 0.10);
                padding: 16px 16px 14px 16px;
                height: auto;
              }
              /* Ensure older rounded value matches completed tabs */
              .home-live-card .rounded-\\[17\\.664px\\] { border-radius: 20px !important; }
            `}</style>
            {(() => {
              const loadingAny = (matchesLoading || upcomingAllLoading || completedAllLoading);
              const shadowIsLive = ['live','break'].includes(((shadowMatch||{}).status||'').toLowerCase());
              const shadowRealIsLive = ['live','break'].includes(((shadowReal||{}).status||'').toLowerCase());
              const hasLive = (groups.live.length > 0) || (shadowIsLive && shadowRealIsLive);
              const hasToday = !!(groups.__extras && groups.__extras.upcomingToday && groups.__extras.upcomingToday.length > 0);
              const showLiveHeroVideo = !loadingAny && !hasLive;
              return (
                <>
                  {showLiveHeroVideo && (
                    <div className="min-h-[70vh] flex flex-col items-center justify-center">
                      <HeroVideo className="md:max-w-md w-[80%]" />
                      <div className="-mt-4 inline-block  px-4 py-2">
                        <span className="text-gray-700 text-lg md:text-xl font-semibold">No match is live currently.</span>
                      </div>
                      <p className="text-center -mt-4 py-4 text-gray-500 text-[14px]">Explore Upcoming Matches.</p>
                    </div>
                  )}
                </>
              );
            })()}
            {(matchesLoading || upcomingAllLoading || completedAllLoading) && (
              <VideoLoader />
            )}
            <div className="flex flex-col">
              {groups.live.length>0 && (
                <div className="text-xs font-semibold text-gray-500 mt-2"></div>
              )}
              {Array.from(new Map((groups.live||[]).filter(Boolean).map(m => [m.id, m])).values()).map(m => (
                <div key={m.id}>
                  <div className="home-live-card">
                    <LiveScoreboard matchId={m.id} teamsByName={teamsByName} />
                  </div>
                  
                </div>
              ))}
              {/* Fallback: if no live real docs, show the shadow current match */}
              {groups.live.length === 0 && shadowMatch && ['live','break'].includes((shadowMatch.status||'').toLowerCase()) && shadowReal && ['live','break'].includes((shadowReal.status||'').toLowerCase()) && (
                <div key={shadowMatch.id || 'current-match'}>
                  <div className="home-live-card">
                    <LiveScoreboard matchId={shadowMatch.id || 'current-match'} teamsByName={teamsByName} />
                  </div>
                  
                </div>
              )}
              {/* Today's upcoming matches removed from Live tab */}

              {/* Recently completed list removed: completed matches move immediately to Completed tab */}
            </div>
          </div>
        )}


        {tab === 'upcoming' && (
          <div className=''>
            {matchesLoading && <VideoLoader />}
            {!matchesLoading && groups.upcoming.length === 0 && (
              <div className="text-center  text-lg py-10 flex items-center h-[70vh] justify-center text-gray-600">No upcoming matches yet.</div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 py-14 gap-5 md:gap-6 w-full">
              {groups.upcoming.map(m => {
                // Compute toss text
                const tossText = (() => {
                  try {
                    if (!m?.toss?.winner || !m?.toss?.decision) return '';
                    const teamName = m.toss.winner === 'team1' ? (m.team1?.name || 'Team 1') : (m.team2?.name || 'Team 2');
                    const action = m.toss.decision === 'bat' ? 'bat' : 'bowl';
                    return `${teamName} won the toss and choose to ${action} first.`;
                  } catch { return ''; }
                })();
                // Check if teams are locked
                const team1Locked = !!(m?.team1?.rosterLocked);
                const team2Locked = !!(m?.team2?.rosterLocked);
                const bothTeamsReady = team1Locked && team2Locked;
                
                return (
                <div
                  key={m.id}
                  className="relative bg-white rounded-[20px] shadow-[0_6px_24px_0_rgba(44,96,206,0.10)] border border-[#e6eaf2] p-0 flex flex-col w-full h-full transition-all duration-200"
                  style={{ minHeight: 180 }}
                >
                  {/* Top-centered Starting soon badge (matches Live badge position) */}
                  {(() => {
                    try {
                      const d = m.date;
                      let startTs = 0;
                      if (!d) startTs = 0;
                      else if (typeof d === 'number') startTs = d;
                      else if (typeof d === 'string') startTs = Date.parse(d) || 0;
                      else if (typeof d === 'object') {
                        if (typeof d.seconds === 'number') startTs = d.seconds * 1000;
                        else if (d.toDate) { try { startTs = d.toDate().getTime(); } catch(e) { startTs = 0; } }
                      }
                      const now = Date.now();
                      const today = new Date();
                      today.setHours(0,0,0,0);
                      const dt = startTs ? new Date(startTs) : null;
                      const isSameDay = dt ? (dt.getFullYear() === today.getFullYear() && dt.getMonth() === today.getMonth() && dt.getDate() === today.getDate()) : false;
                      const isStartingSoon = isSameDay || (startTs > now && (startTs - now <= 60 * 60 * 1000));
                      if (isStartingSoon) {
                        return (
                          <div className="absolute left-1/2 z-20 flex items-center justify-center" style={{transform:'translateX(-50%)'}}>
                            <svg width="112" height="34" viewBox="0 0 112 34" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                              <defs>
                                <filter id="s" x="-20%" y="-20%" width="140%" height="100%" filterUnits="objectBoundingBox">
                                  <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.06" />
                                </filter>
                              </defs>
                              <g filter="url(#s)">
                                <path d="M56 30l4 4h-8l4-4z" fill="#f3f4f6" stroke="#ffffff" strokeWidth="0.5" />
                              </g>
                              <path d="M8 2h96a6 6 0 0 1 6 6v12a6 6 0 0 1-6 6H8a6 6 0 0 1-6-6V8a6 6 0 0 1 6-6z" fill="#f3f4f6" stroke="#ffffff" strokeWidth="2" />
                              <circle cx="12" cy="16" r="3" fill="#6b7280" />
                              <text x="60" y="17" textAnchor="middle" fill="#6b7280" fontFamily="Inter, Arial, sans-serif" fontWeight="600" fontSize="10">Starting Soon</text>
                            </svg>
                          </div>
                        );
                      }
                    } catch (e) {}
                    return null;
                  })()}
                  {/* Header: Date & Venue at top right */}
                  <div className="flex items-center justify-between px-5 md:px-6 pt-4 md:pt-5 pb-2 md:pb-3">
                    <span className="text-[12px] md:text-[15px] font-regular tracking-wide text-[#4b5563]">{formatCardDate(m.date)}</span>
                    {m.venueMapUrl ? (
                      <a 
                        href={m.venueMapUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[12px] md:text-[15px] font-regular tracking-wide  text-[#4b5563] hover:text-[#1a4fb8]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <img src="/Location.svg" alt="Location" className="inline-block w-4 h-4 mr-1 align-text-bottom" /> {m.venue || 'View Map'}
                      </a>
                    ) : (
                      <span className="text-[12px] md:text-[15px] font-medium tracking-wide text-[#4b5563] truncate max-w-[50%]">{m.venue || ''}</span>
                    )}
                  </div>
                    <div className="border-b border-[#eef2f6] px-4 w-[92%] mx-auto" />

                  

                  {/* Teams Row - Figma style */}
                  <div className="flex items-center justify-between px-5 md:px-6 py-3 md:py-4">
                    {/* Team 1 */}
                    <div className="flex flex-col items-center w-[90px] max-w-[60%]">
                      <TeamLogo team={{...withLogoByName(m.team1), key:'team1'}} size="sm" className="mb-2" />
                      <span className="font-semibold text-[14px] md:text-[15px] text-[#111] text-center truncate w-full">{m.team1?.name || 'Team 1'}</span>
                      {team1Locked && (
                        <span className="text-[10px] text-green-600 font-medium mt-1">✓ Locked</span>
                      )}
                    </div>
                    {/* VS */}
                    <div className="flex flex-col items-center w-[40px]">
                      <span className="text-[#2c60ce] font-bold text-[27px] md:text-[18px] mb-2">v/s</span>
                    </div>
                    {/* Team 2 */}
                    <div className="flex flex-col items-center w-[90px]">
                      <TeamLogo team={{...withLogoByName(m.team2), key:'team2'}} size="sm" className="mb-2" />
                      <span className="font-semibold text-[14px] md:text-[15px] text-[#111] text-center truncate w-full">{m.team2?.name || 'Team 2'}</span>
                      {team2Locked && (
                        <span className="text-[10px] text-green-600 font-medium mt-1">✓ Locked</span>
                      )}
                    </div>
                  </div>
                  <div className="border-b border-[#eef2f6] px-4 w-[92%] mx-auto" />
                  
                  {/* Toss Info (if available) */}
                  {tossText && (
                    <>
                      <div className="px-5 md:px-6 py-2">
                        <div className="text-[12px] md:text-[13px] text-gray-600 text-center italic">{tossText}</div>
                      </div>
                      <div className="border-b border-[#eef2f6] px-4 w-[92%] mx-auto" />
                    </>
                  )}
                  
                  {/* Footer: Time & Overs */}
                  {/* <div className="flex items-center justify-between px-5 md:px-6 pb-4 md:pb-5 pt-2 md:pt-3"> */}
                    {/* <span className="text-[#9ca4ab] text-[13px] md:text-[14px] font-semibold">{m.time || (m.startTime || m.dateTime || m.date || '').toString().slice(11,16) || '--:--'}</span> */}
                    {/* <span className="text-[#2c60ce] text-[13px] md:text-[14px] font-bold">Overs: {m.totalOvers || 20}</span> */}
                  {/* </div> */}
                  
                  {/* Teams Ready Badge */}
                  {bothTeamsReady && (
                    <div className="px-5 md:px-6 pb-3">
                      <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 text-center">
                        <span className="text-[11px] md:text-[12px] text-green-700 font-semibold">✓ Teams Ready</span>
                      </div>
                    </div>
                  )}
                </div>
              );})}
            </div>
          </div>
        )}

        {tab === 'completed' && (
          <div>
            {matchesLoading && <VideoLoader />}
            {!matchesLoading && groups.completed.length === 0 && (
              <div className="w-full h-[500px] flex items-center justify-center py-10">
                <img src="/No match Found.png" alt="No match found" className="max-w-[280px] w-full m-auto h-[7rem] object-contain" />
              </div>
            )}
            <div className="py-14 w-full space-y-4">
              {(groups.completed || []).map(m => {
                const team1Overs = (() => {
                  const inns = Array.isArray(m.innings) ? m.innings : [];
                  const t1Inns = inns.find(i => i?.teamKey === 'team1');
                  return t1Inns?.total?.overs || m.team1?.overs || '0.0';
                })();
                const team2Overs = (() => {
                  const inns = Array.isArray(m.innings) ? m.innings : [];
                  const t2Inns = inns.find(i => i?.teamKey === 'team2');
                  return t2Inns?.total?.overs || m.team2?.overs || '0.0';
                })();
                const resultText = computeMatchResult(m);
                const mom = m?.awards?.manOfTheMatch || m?.awards?.playerOfTheMatch;
                const momName = typeof mom === 'string' ? mom : (mom?.name || '');
                const momAvatar = typeof mom === 'object' ? (mom?.avatar || mom?.photoUrl || '') : '';
                const momTeam = typeof mom === 'object' ? (mom?.team || '') : '';
                
                return (
                  <div key={m.id} className="cursor-pointer" onClick={() => window.location.href = `/scorecard/${m.id}`}>
                    <div
                      className="bg-white rounded-[20px] shadow-[0_6px_24px_0_rgba(44,96,206,0.10)] border border-[#e6eaf2] p-0 flex flex-col w-full h-full transition-all duration-200 hover:shadow-[0_8px_32px_0_rgba(44,96,206,0.15)] hover:scale-[1.02]"
                    >
                      {/* Header: Date (left) & Venue (right) */}
                      <div className="flex items-center justify-between px-5 md:px-6 pt-4 md:pt-5 pb-2 md:pb-3">
                        <span className="text-[12px] md:text-[15px] font-regular tracking-wide text-[#4b5563]">{formatCardDate(m.date)}</span>
                        {m.venueMapUrl ? (
                          <a 
                            href={m.venueMapUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[12px] md:text-[15px] font-regular tracking-wide text-[#4b5563] hover:text-[#1a4fb8]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <img src="/Location.svg" alt="Location" className="inline-block w-4 h-4 mr-1 align-text-bottom" /> {m.venue || 'View Map'}
                          </a>
                        ) : (
                          <span className="text-[12px] md:text-[15px] font-medium tracking-wide text-[#4b5563] truncate max-w-[50%]">{m.venue || ''}</span>
                        )}
                      </div>
                      <div className="border-b border-[#eef2f6] px-4 w-[92%] mx-auto" />

                      {/* Teams Row with Scores */}
                      <div className="flex items-center justify-between px-5 md:px-6 py-3 md:py-4">
                        <div className="flex flex-col items-center w-[90px] max-w-[60%]">
                          <TeamLogo team={{...withLogoByName(m.team1), key:'team1'}} size="sm" className="mb-2" />
                          <span className="font-semibold text-[14px] md:text-[15px] text-[#111] text-center truncate w-full">{m.team1?.name || 'Team 1'}</span>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-[#2c60ce] font-semibold text-[16px] md:text-[17px]">{m.team1?.runs || 0}/{m.team1?.wickets || 0}</span>
                            <span className="text-[#9ca4ab] text-[13px] md:text-[12px]">({team1Overs} ov)</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-center -mt-7 w-[40px]">
                          <span className="text-[#2c60ce] font-bold text-[27px] md:text-[18px] mb-2">v/s</span>
                        </div>
                        <div className="flex flex-col items-center w-[90px]">
                          <TeamLogo team={{...withLogoByName(m.team2), key:'team2'}} size="sm" className="mb-2" />
                          <span className="font-semibold text-[14px] md:text-[15px] text-[#111] text-center truncate w-full">{m.team2?.name || 'Team 2'}</span>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-[#2c60ce] font-semibold text-[16px] md:text-[17px]">{m.team2?.runs || 0}/{m.team2?.wickets || 0}</span>
                            <span className="text-[#9ca4ab] text-[13px] md:text-[12px]">({team2Overs} ov)</span>
                          </div>
                        </div>
                      </div>
                      <div className="border-b border-[#eef2f6] px-4 w-[92%] mx-auto" />

                      {/* Result */}
                      {resultText && (
                        <>
                          <div className="px-5 md:px-6 py-2">
                            {(() => {
                              try {
                                const parts = (resultText || '').match(/(.*?\bwon\b)(.*)/i);
                                if (parts) {
                                  return (
                                    <div className="text-center">
                                      <span className="text-blue-600 font-semibold text-[13px] md:text-[14px]">{parts[1].trim()}</span>
                                      <span className="text-gray-500 font-semibold text-[13px] md:text-[14px]">{parts[2]}</span>
                                    </div>
                                  );
                                }
                              } catch (e) {
                                // fallback to original rendering
                              }
                              return <div className="text-[13px] md:text-[14px] text-green-700 font-semibold text-center">{resultText}</div>;
                            })()}
                          </div>
                        </>
                      )}

                      {/* Footer: Overs */}
                      {/* <div className="flex items-center justify-between px-5 md:px-6 pb-4 md:pb-5 pt-2 md:pt-3"> */}
                        {/* <span className="text-[#2c60ce] text-[13px] md:text-[14px] font-bold">Overs: {m.totalOvers || 20}</span> */}
                      {/* </div> */}
                    </div>
                    
                  </div>
                );
              })}
            </div>
          </div>
        )}

        

      </div>
    </div>
  );
}

export default Home;