import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDocument } from '../hooks/useFirestore';

function StatChip({ value }) {
  const label = value === '0' ? '•' : value;
  const cls = value === 'W' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700';
  return <span className={`px-2 py-1 rounded text-xs ${cls}`}>{label}</span>;
}

export default function MatchDetails() {
  const { matchId } = useParams();
  const { data: match, loading, error, refetch } = useDocument('matches', matchId || 'current-match', { poll: false });

  const innings = useMemo(() => Array.isArray(match?.innings) ? match.innings : [], [match?.innings]);
  const awards = match?.awards || {};

  const fmtOvers = (balls)=>{
    if (!Number.isFinite(balls)) return '0.0';
    const o = Math.floor(balls/6); const b = balls%6; return `${o}.${b}`;
  };
  const fmtSR = (runs, balls)=>{
    if (!balls) return '0.00';
    return ( (runs||0) * 100 / balls ).toFixed(2);
  };

  const playerName = (teamKey, id) => {
    if (!id) return '';
    const roster = (match?.[teamKey]?.players) || [];
    const p = roster.find(x => x.playerId === id || x.id === id || x.name === id);
    return p?.name || p?.playerId || p?.id || '';
  };

  const formatHowOut = (inn, b) => {
    const ho = b?.howOut;
    if (!ho) return b?.isOut ? 'out' : 'not out';
    if (typeof ho === 'string') return ho;
    if (ho?.desc) return ho.desc;
    const teamKey = inn.teamKey || 'team1';
    const oppKey = teamKey === 'team1' ? 'team2' : 'team1';
    const bowler = playerName(oppKey, ho.bowlerId);
    const fielder = playerName(oppKey, ho.fielderId);
    const type = (ho.type || '').toLowerCase();
    switch (type) {
      case 'caught':
      case 'c':
        return `c ${fielder || '-'} b ${bowler || '-'}`;
      case 'bowled':
        return `b ${bowler || '-'}`;
      case 'lbw':
        return `lbw b ${bowler || '-'}`;
      case 'stumped':
      case 'st':
        return `st ${fielder || '-'} b ${bowler || '-'}`;
      case 'runout':
      case 'run-out':
      case 'run out':
        return `run out ${fielder ? `(${fielder})` : ''}`.trim();
      case 'hitwicket':
      case 'hit wicket':
        return `hit wicket b ${bowler || '-'}`;
      case 'retiredhurt':
      case 'retired':
        return 'retired hurt';
      default:
        return b.isOut ? (ho.type || 'out') : 'not out';
    }
  };

  // expanded accordion state per innings index
  const [expanded, setExpanded] = useState([]);
  useEffect(() => {
    // Default expanded so users immediately see full tables
    setExpanded(innings.map(() => true));
  }, [innings]);

  const toggle = (i) => {
    setExpanded((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  };

  if (loading) return <div className="p-8 text-center">Loading…</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error.message}</div>;
  if (!match) return <div className="p-8 text-center">Match not found.</div>;

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{match.title}</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refetch && refetch()}
              disabled={loading}
              className={`px-3 py-1 rounded border text-sm transition-colors ${loading ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-50'}`}
              title="Refresh from database"
            >
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
            <span className="px-3 py-1 rounded-full text-sm bg-gray-100">{match.status}</span>
          </div>
        </div>
        <div className="text-sm text-gray-600 mt-2">{match.date} • {match.venue}</div>
        {match.result && (
          <div className="mt-3 p-3 rounded bg-green-50 text-green-800 font-semibold">{match.result}</div>
        )}
        {(awards.manOfTheMatch || awards.manOfTheSeries) && (
          <div className="mt-3 grid sm:grid-cols-2 gap-3">
            {awards.manOfTheMatch && (
              <div className="p-3 rounded bg-blue-50 text-blue-800">Man of the Match: <span className="font-semibold">{awards.manOfTheMatch?.name || awards.manOfTheMatch}</span></div>
            )}
            {awards.manOfTheSeries && (
              <div className="p-3 rounded bg-purple-50 text-purple-800">Man of the Series: <span className="font-semibold">{awards.manOfTheSeries?.name || awards.manOfTheSeries}</span></div>
            )}
          </div>
        )}

        {/* Both teams quick totals summary for mobile */}
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:text-base">
          <div className="border rounded p-3 flex flex-col items-start">
            <div className="text-gray-600">{match.team1?.name || 'Team 1'}</div>
            <div className="text-lg font-semibold">{match.team1?.runs || 0}/{match.team1?.wickets || 0} <span className="text-gray-500 text-sm">({match.team1?.overs || 0})</span></div>
          </div>
          <div className="border rounded p-3 flex flex-col items-start">
            <div className="text-gray-600">{match.team2?.name || 'Team 2'}</div>
            <div className="text-lg font-semibold">{match.team2?.runs || 0}/{match.team2?.wickets || 0} <span className="text-gray-500 text-sm">({match.team2?.overs || 0})</span></div>
          </div>
        </div>
      </div>

      {/* Innings */}
      {innings.length > 0 ? (
        <div className="space-y-4">
          {innings.map((inn, idx) => (
            <div key={idx} className="bg-white rounded-lg shadow overflow-hidden">
              {/* Accordion header */}
              <button
                type="button"
                onClick={() => toggle(idx)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
                aria-expanded={expanded[idx]}
                aria-controls={`innings-${idx}`}
              >
                <div className="flex items-baseline gap-2">
                  <h2 className="text-lg sm:text-xl font-semibold">{inn.teamName} Innings</h2>
                  <span className="text-xs sm:text-sm text-gray-500">{inn.total?.overs ? `${inn.total.overs} Ov` : ''}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-base sm:text-lg font-bold">{inn.total?.runs || 0}/{inn.total?.wickets || 0}</div>
                  <svg
                    className={`w-5 h-5 text-gray-500 transition-transform ${expanded[idx] ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
              </button>

              {/* Accordion body */}
              {expanded[idx] && (
                <div id={`innings-${idx}`} className="p-4 sm:p-6 border-t">
                  {Array.isArray(inn.batting) && inn.batting.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium mb-2">Batting</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-600 border-b">
                            <th className="py-2 pr-2">#</th>
                            <th className="py-2 pr-2">Batsman</th>
                            <th className="py-2 pr-2">R</th>
                            <th className="py-2 pr-2">B</th>
                            <th className="py-2 pr-2">4s</th>
                            <th className="py-2 pr-2">6s</th>
                            <th className="py-2 pr-2">SR</th>
                            <th className="py-2">How Out</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            // Merge recorded batting with full roster so every player is listed
                            const teamKey = inn.teamKey || (idx===0? 'team1':'team2');
                            const roster = Array.isArray(match?.[teamKey]?.players) ? match[teamKey].players : [];
                            const recorded = Array.isArray(inn.batting) ? inn.batting.slice() : [];
                            const idsInRecorded = new Set(recorded.map(p=> p.playerId || p.id || p.name));
                            const fillers = roster
                              .filter(p => !idsInRecorded.has(p.playerId||p.id||p.name))
                              .map((p, i2) => ({
                                playerId: p.playerId || p.id || p.name,
                                name: p.name || p.playerId || p.id,
                                runs: 0,
                                balls: 0,
                                fours: 0,
                                sixes: 0,
                                isOut: false,
                                howOut: { type: 'DNB', desc: 'did not bat' },
                                battingOrder: 999 + i2,
                                _dnb: true
                              }));
                            const rows = [...recorded, ...fillers]
                              .sort((a,b)=> (a.battingOrder??999) - (b.battingOrder??999));
                            return rows.map((b, i)=> (
                            <tr key={b.playerId || b.name || i} className="border-b">
                              <td className="py-1 pr-2 w-6 text-gray-500">{(b.battingOrder ?? (i+1))}</td>
                              <td className={`py-1 pr-2 font-medium ${b._dnb ? 'text-gray-500 italic' : ''}`}>{b.name || b.playerId}</td>
                              <td className="py-1 pr-2">{b.runs || 0}</td>
                              <td className="py-1 pr-2">{b.balls || 0}</td>
                              <td className="py-1 pr-2">{b.fours || 0}</td>
                              <td className="py-1 pr-2">{b.sixes || 0}</td>
                              <td className="py-1 pr-2">{fmtSR(b.runs, b.balls)}</td>
                              <td className="py-1 text-gray-700">{formatHowOut(inn, b)}</td>
                            </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                    {/* Extras & Total like Cricbuzz */}
                    {(() => {
                      const ex = inn.extras || {};
                      const extrasTotal = (ex.byes||0)+(ex.legByes||0)+(ex.wides||0)+(ex.noBalls||0)+(ex.penalty||0);
                      return (
                        <div className="mt-3 text-sm">
                          <div className="text-gray-700">
                            Extras: <span className="font-semibold">{extrasTotal}</span> (b {ex.byes||0}, lb {ex.legByes||0}, w {ex.wides||0}, nb {ex.noBalls||0}, p {ex.penalty||0})
                          </div>
                          <div className="mt-1 font-semibold">Total: {inn.total?.runs || 0}-{inn.total?.wickets || 0} ({inn.total?.overs || 0} Ov)</div>
                        </div>
                      );
                    })()}
                    {/* Did not bat */}
                    {(() => {
                      const teamKey = inn.teamKey || (idx===0? 'team1':'team2');
                      const roster = (match?.[teamKey]?.players)||[];
                      if (!Array.isArray(roster) || roster.length===0) return null;
                      const battedIds = new Set((inn.batting||[]).map(p=> p.playerId || p.id || p.name));
                      const didNotBat = roster.filter(p=> !battedIds.has(p.playerId||p.id||p.name)).map(p=> p.name || p.playerId || p.id);
                      if (!didNotBat.length) return null;
                      return (
                        <div className="mt-2 text-sm text-gray-700">
                          Did not bat: {didNotBat.join(', ')}
                        </div>
                      );
                    })()}
                  </div>
                  <div>
                    {(() => { const oppName = inn.teamKey === 'team1' ? (match?.team2?.name||'') : (inn.teamKey === 'team2' ? (match?.team1?.name||'') : ''); return (
                 <h3 className="font-medium mb-2">Bowling{oppName?` - ${oppName}`:''}</h3>
                    ); })()}
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-600 border-b">
                            <th className="py-2 pr-2">Bowler</th>
                            <th className="py-2 pr-2">O</th>
                            <th className="py-2 pr-2">R</th>
                            <th className="py-2 pr-2">W</th>
                            <th className="py-2 pr-2">Econ</th>
                            <th className="py-2 pr-2">4s</th>
                            <th className="py-2 pr-2">6s</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inn.bowling?.map((bw)=>{
                            const econ = bw.balls ? ( (bw.runsConceded||0) / (bw.balls/6) ) : 0;
                            return (
                              <tr key={bw.playerId} className="border-b">
                                <td className="py-1 pr-2 font-medium">{bw.name || bw.playerId}</td>
                                <td className="py-1 pr-2">{fmtOvers(bw.balls)}</td>
                                <td className="py-1 pr-2">{bw.runsConceded || 0}</td>
                                <td className="py-1 pr-2">{bw.wickets || 0}</td>
                                <td className="py-1 pr-2">{econ.toFixed(2)}</td>
                                <td className="py-1 pr-2">{bw.foursConceded || 0}</td>
                                <td className="py-1 pr-2">{bw.sixesConceded || 0}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                  ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium mb-2">Batting</h3>
                    <div className="space-y-1 text-sm">
                      {Object.entries(inn.runs || {}).map(([pid, r]) => (
                        <div key={pid} className="flex justify-between border-b py-1">
                          <span className="text-gray-700">{pid}</span>
                          <span className="font-semibold">{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">Bowling (wickets)</h3>
                    <div className="space-y-1 text-sm">
                      {Object.entries(inn.wickets || {}).map(([pid, w]) => (
                        <div key={pid} className="flex justify-between border-b py-1">
                          <span className="text-gray-700">{pid}</span>
                          <span className="font-semibold">{w}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                  )}

                  {Array.isArray(inn.fallOfWickets) && inn.fallOfWickets.length>0 && (
                    <div className="mt-2 text-sm text-gray-700">
                      FoW: {inn.fallOfWickets.map((f, i)=> `${f.score}-${f.wicketNo} (${f.over})`).join(', ')}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Current Totals</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="text-lg font-bold mb-1">{match.team1?.name}: {match.team1?.runs || 0}/{match.team1?.wickets || 0} ({match.team1?.overs || 0})</div>
              <div className="text-xs text-gray-500">Batting map not finalized.</div>
            </div>
            <div>
              <div className="text-lg font-bold mb-1">{match.team2?.name}: {match.team2?.runs || 0}/{match.team2?.wickets || 0} ({match.team2?.overs || 0})</div>
              <div className="text-xs text-gray-500">Batting map not finalized.</div>
            </div>
          </div>
        </div>
      )}

      {/* Recent balls */}
      {Array.isArray(match.recentBalls) && match.recentBalls.length>0 && (
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <h3 className="text-lg font-semibold mb-3">Last balls</h3>
          <div className="flex flex-wrap gap-2">
            {match.recentBalls.slice(-12).map((b, i)=> <StatChip key={i} value={b} />)}
          </div>
        </div>
      )}
    </div>
  );
}
