import React, { useMemo } from 'react';
import TeamLogo from './TeamLogo';

const FULL_LOGO_CLASSES = 'w-10 h-10 md:w-14 md:h-14';
const FULL_CARD_HEIGHT_CLASSES = 'min-h-[180px] md:min-h-[220px]';

export default function FullScoreHeaderCard({ match, teamsByName = new Map() }) {
  // Inject a small CSS animation for the live/starting dot (slow blink)
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
  const getBundledLogoForName = (raw) => {
    try {
      const nm = String(raw || '').toLowerCase();
      const norm = nm.replace(/[^a-z0-9]/g, '');
      if (norm.includes('dataninjas')) return '/Teams/Data Ninjas Final (1).png';
      if (norm.includes('fintechfalcons') || norm.includes('fintech')) return '/Teams/Fintech Falcons Final (3).png';
      if (norm.includes('geotitans')) return '/Teams/Geo Titans Final (1).png';
      if (norm.includes('mlmaverics') || norm.includes('mlmavericks')) return '/Teams/ML Mavericks Final (1).png';
    } catch {}
    return '';
  };
  const withLogoByName = (team) => {
    try {
      if (!team) return team;
      if (team.logoUrl || team.logo || team.flag) return team;
      const nm = (team.name || '').trim().toLowerCase();
      if (!nm) return team;
      const url = teamsByName.get(nm) || getBundledLogoForName(nm);
      return url ? { ...team, logoUrl: url } : team;
    } catch { return team; }
  };

  const dateText = useMemo(() => {
    const d = match?.date;
    if (!d) return '';
    if (typeof d === 'string') {
      const p = Date.parse(d);
      if (!Number.isFinite(p)) return d;
      const dt = new Date(p);
      return `${dt.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][dt.getMonth()]} ${dt.getFullYear()}`;
    }
    if (d?.toDate) { try { const dt=d.toDate(); return dt.toDateString(); } catch { return ''; } }
    if (typeof d?.seconds === 'number') return new Date(d.seconds*1000).toDateString();
    if (typeof d === 'number') {
      const dt = new Date(d);
      return `${dt.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][dt.getMonth()]} ${dt.getFullYear()}`;
    }
    return '';
  }, [match]);

  const teamOvers = (teamKey) => {
    try {
      const inns = Array.isArray(match?.innings) ? match.innings : [];
      const tKey = teamKey === 'team2' ? 'team2' : 'team1';
      const inn = inns.find(i => i?.teamKey === tKey) || null;
      if (!inn || !inn.total) return '0.0';
      return String(inn.total.overs || '0.0');
    } catch { return '0.0'; }
  };

  const statusLower = String(match?.status||'').toLowerCase();
  const isLive = (statusLower==='live') || !!match?.isSuperOver;
  const isCompleted = statusLower==='completed';

  // Winner + basic result line (simple heuristic)
  const resultLine = useMemo(() => {
    if (!isCompleted) return '';
    const t1Runs = Number(match?.team1?.runs)||0;
    const t2Runs = Number(match?.team2?.runs)||0;
    const t1Name = match?.team1?.name || 'Team 1';
    const t2Name = match?.team2?.name || 'Team 2';
    if (t1Runs === 0 && t2Runs === 0) return '';
    if (t1Runs === t2Runs) return 'Match tied';
    if (t1Runs > t2Runs) {
      const diff = t1Runs - t2Runs; return `${t1Name} won by ${diff} run${diff===1?'':'s'}`;
    }
    const diff = t2Runs - t1Runs; return `${t2Name} won by ${diff} run${diff===1?'':'s'}`;
  }, [match, isCompleted]);
  const winnerKey = useMemo(() => {
    if (!isCompleted) return null;
    const t1Runs = Number(match?.team1?.runs)||0;
    const t2Runs = Number(match?.team2?.runs)||0;
    if (t1Runs === t2Runs) return null;
    return t1Runs > t2Runs ? 'team1' : 'team2';
  }, [match, isCompleted]);
  const winnerName = useMemo(() => {
    if (!winnerKey) return null;
    return match?.[winnerKey]?.name || (winnerKey === 'team1' ? 'Team 1' : 'Team 2');
  }, [winnerKey, match]);
  const resultRest = useMemo(() => {
    if (!winnerName || !resultLine) return resultLine;
    if (resultLine.startsWith(winnerName)) return resultLine.slice(winnerName.length).trim();
    return resultLine;
  }, [winnerName, resultLine]);
  const blueWinnerPhrase = useMemo(() => {
    if (!winnerName || !resultLine) return null;
    const base = `${winnerName} won`;
    if (resultLine.startsWith(base)) return base;
    // sometimes resultLine might be "Team X won by ..." or "Team X won"
    if (resultLine.startsWith(winnerName)) {
      const after = resultLine.slice(winnerName.length).trim();
      if (after.startsWith('won')) return base;
    }
    return null;
  }, [winnerName, resultLine]);
  const restAfterBlue = useMemo(() => {
    if (!resultLine) return '';
    if (blueWinnerPhrase && resultLine.startsWith(blueWinnerPhrase)) return resultLine.slice(blueWinnerPhrase.length).trim();
    return (winnerName ? resultRest : resultLine) || '';
  }, [resultLine, blueWinnerPhrase, winnerName, resultRest]);

  return (
    <div className={`relative bg-white rounded-[20px] shadow-[0_6px_24px_0_rgba(44,96,206,0.10)] border border-[#e6eaf2] p-0 flex flex-col w-full ${FULL_CARD_HEIGHT_CLASSES}`}>
      {/* Live / Starting soon pill */}
      {(() => {
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

      {/* Header: Date & Venue */}
      <div className="flex items-center justify-between px-5 md:px-6 pt-4 md:pt-5 pb-2 md:pb-3">
        <span className="text-[#4b5563] text-[12px] md:text-[15px] font-regular tracking-wide">{dateText}</span>
        {match?.venueMapUrl ? (
          <a
            href={match.venueMapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white border border-gray-100 shadow-sm px-3 py-1 rounded-md text-[12px] md:text-[13px] text-[#4b5563] hover:text-[#1a4fb8]"
            onClick={(e) => { e.stopPropagation(); }}
          >
            <img src="/locationIcon.svg" alt="Location" className="w-3 h-4" />
            <span className="truncate max-w-[160px] text-[#2c60ce] text-[12px]">{match.venue || 'View Map'}</span>
          </a>
        ) : (
          <div className="inline-flex items-center gap-2 bg-[#f3f6fb] border border-gray-100 shadow-sm px-2 py-1 rounded-md text-[12px] md:text-[13px] text-[#4b5563]">
            <img src="/locationIcon.svg" alt="Location" className="w-3 h-4" />
            <span className="truncate max-w-[160px] text-[#2c60ce] text-[12px]">{match?.venue || ''}</span>
          </div>
        )}
      </div>
      <div className="border-b border-[#eef2f6] px-4 w-[92%] mx-auto" />

      {/* Teams + score */}
      <div className="flex items-start justify-between px-5 md:px-6 gap-4 w-full">
        {/* Team 1 */}
        <div className="flex flex-col items-center w-auto gap-1 mt-5 mb-2">
          <TeamLogo
            team={{...withLogoByName(match.team1), key:'team1'}}
            size="responsive"
            className={`mb-1 mt-0 w-[4.5rem] h-[4.5rem] ${FULL_LOGO_CLASSES}`}
          />
          <div className="flex flex-col items-start gap-0 w-full">
            <p className="font-semibold text-[14px] md:text-xl text-[#111] w-full text-center truncate">{match?.team1?.name || 'Team A'}</p>
            <div className="flex items-center gap-1 justify-center w-full">
              <div className="flex items-center mb-4 gap-1 whitespace-nowrap">
                <span className="text-[#2c60ce] font-semibold text-[16px] md:text-[32px] flex items-center">
                  {match?.team1?.runs || 0}/{match?.team1?.wickets || 0}
                  {winnerKey==='team1' && isCompleted && (
                    <img src="/trophy.svg" alt="Winner" className="w-[14px] h-[14px] ml-1 inline-block align-middle" />
                  )}
                </span>
                <span className="text-[#9ca4ab] text-sm md:text-base flex items-center">({teamOvers('team1')} ov)</span>
              </div>
            </div>
          </div>
        </div>

        {/* todo: Yet to bat -> color gradient swap  bowling alingmnet, gender to role  , back icon change from teams */}

        {/* V/S or completed label */}
        <div className="flex flex-col items-center mt-10 justify-center w-auto flex-1">
          {!isCompleted && (
            <p className="font-bold text-[#2c60ce] text-[24px] md:text-[48px] leading-none">V/S</p>
          )}
          {isCompleted && (
            <p className="font-bold text-[#2c60ce] text-[22px] md:text-[32px] leading-tight">V/S</p>
          )}
        </div>

        {/* Team 2 */}
        <div className="flex flex-col items-center mt-5 w-auto gap-1 mb-2">
          <TeamLogo
            team={{...withLogoByName(match.team2), key:'team2'}}
            size="responsive"
            className={`mb-1 mt-0 w-[4.5rem] h-[4.5rem] ${FULL_LOGO_CLASSES}`}
          />
          <div className="flex flex-col items-start gap-0 w-full">
            <p className="font-semibold text-[14px] md:text-xl text-[#111] w-full text-center">{match?.team2?.name || 'Team B'}</p>
            <div className="flex items-center gap-1 justify-center w-full">
              <div className="mb-2 flex items-center gap-1 whitespace-nowrap">
                <span className="text-[#2c60ce] font-semibold text-[16px] md:text-[32px] flex items-center">
                  {match?.team2?.runs || 0}/{match?.team2?.wickets || 0}
                  {winnerKey==='team2' && isCompleted && (
                    <img src="/trophy.svg" alt="Winner" className="w-[14px] h-[14px] ml-1 inline-block align-middle" />
                  )}
                </span>
                <span className="text-[#9ca4ab] text-sm md:text-base flex items-center">({teamOvers('team2')} ov)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {isCompleted && resultLine && (
        <div className="px-5 md:px-6 pb-4 -mt-2 text-center">
          <div className='border border-gray-100 mx-auto w-full mb-2'/>
          {blueWinnerPhrase ? (
            <div className="text-sm md:text-base">
              <span className="text-[#2c60ce] font-semibold">{blueWinnerPhrase}</span>
              <span className="text-[#6b7280]"> {restAfterBlue}</span>
            </div>
          ) : winnerName ? (
            <div className="text-sm md:text-base">
              <span className="text-[#2c60ce] font-semibold">{winnerName}</span>
              <span className="text-[#6b7280]"> {resultRest}</span>
            </div>
          ) : (
            <div className="text-[#6b7280] font-semibold text-sm md:text-base">{resultLine}</div>
          )}
        </div>
      )}
    </div>
  );
}
