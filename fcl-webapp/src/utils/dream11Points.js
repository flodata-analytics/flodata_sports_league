/**
 * Calculate Dream11-style fantasy points for T20 based on an aggregate stats object.
 * Note: The official rules are per-match; with aggregate season stats we approximate:
 * - Runs and wickets scale linearly
 * - Milestone bonus applied once using highestScore if available
 * - Economy/SR bands applied when respective values and gating thresholds are present
 * - Fielding points use available aggregate counts if provided
 */
export function calculateDream11Points(stats = {}) {
  const num = (v) => (Number.isFinite(v) ? v : 0);
  const runs = num(stats.runs);
  const wickets = num(stats.wickets);
  const fours = num(stats.fours);
  const sixes = num(stats.sixes);
  const highestScore = num(stats.highestScore ?? stats.highScore ?? stats.hs);
  const maidens = num(stats.maidens);
  const dotBalls = num(stats.dotBalls);
  const catches = num(stats.catches);
  const stumpings = num(stats.stumpings);
  const runOutDirect = num(stats.runOutDirect);
  const runOutIndirect = num(stats.runOutIndirect);
  const ballsFaced = num(stats.ballsFaced);
  const oversBowled = num(stats.oversBowled);
  const economy = Number.isFinite(stats.economy) ? stats.economy : null;
  const strikeRate = Number.isFinite(stats.strikeRate) ? stats.strikeRate : null;

  let pts = 0;

  // General: Playing XI not applied here (no per-match context)

  // Batting
  pts += runs * 1; // +1 per run
  pts += fours * 4; // +4 per 4
  pts += sixes * 6; // +6 per 6

  // Milestones (apply highest one once if HS present)
  if (highestScore >= 100) pts += 16;
  else if (highestScore >= 75) pts += 12;
  else if (highestScore >= 50) pts += 8;
  else if (highestScore >= 25) pts += 4;

  // Duck: cannot infer consistently without per-innings data; skip in aggregate

  // Bowling
  pts += wickets * 30; // +30 per wicket
  // Bowled/LBW extra +8 per wicket type: unavailable in aggregate; skip

  // Hauls: approximate with bestWickets if provided
  const bestWkts = num(stats.bestWickets ?? stats.highWicket ?? stats.best);
  if (bestWkts >= 5) pts += 12;
  else if (bestWkts === 4) pts += 8;
  else if (bestWkts === 3) pts += 4;

  pts += maidens * 12; // +12 per maiden
  pts += dotBalls * 1; // +1 per dot

  // Fielding
  pts += catches * 8;
  if (catches >= 3) pts += 4; // 3 catches bonus once
  pts += stumpings * 12;
  pts += runOutDirect * 12;
  pts += runOutIndirect * 6; // awarded to each of last two fielders

  // Economy band (T20) applies if bowled >= 2 overs
  if (economy != null && oversBowled >= 2) {
    if (economy < 5) pts += 6;
    else if (economy < 6) pts += 4;
    else if (economy <= 7) pts += 2;
    else if (economy >= 12) pts -= 6;
    else if (economy >= 11) pts -= 4;
    else if (economy >= 10) pts -= 2;
  }

  // Strike rate band (non-bowlers) if balls faced >= 10
  if (strikeRate != null && ballsFaced >= 10) {
    if (strikeRate > 170) pts += 6;
    else if (strikeRate > 150) pts += 4;
    else if (strikeRate >= 130) pts += 2;
    else if (strikeRate < 50) pts -= 6;
    else if (strikeRate < 60) pts -= 4;
    else if (strikeRate < 70) pts -= 2;
  }

  // Captain/VC multipliers are not applied at aggregate level here

  return pts;
}

/** Convenience helper: build a stats object from a player document */
export function playerDocToStats(p = {}) {
  return {
    runs: p.runs,
    wickets: p.wickets,
    fours: p.fours,
    sixes: p.sixes,
    highestScore: p.highestScore ?? p.highScore ?? p.hs,
    maidens: p.maidens,
    dotBalls: p.dotBalls,
    catches: p.catches,
    stumpings: p.stumpings,
    runOutDirect: p.runOutDirect,
    runOutIndirect: p.runOutIndirect,
    ballsFaced: p.ballsFaced,
    oversBowled: p.oversBowled,
    economy: p.economy,
    strikeRate: p.strikeRate,
    bestWickets: p.bestWickets ?? p.highWicket ?? p.best,
  };
}
