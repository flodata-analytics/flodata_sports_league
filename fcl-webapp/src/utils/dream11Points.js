/**
 * Balanced T20 fantasy scoring (Dream11-like), aggregate-friendly.
 * Notes:
 * - Applies fair weights for batting, bowling, and fielding so no role is advantaged unfairly.
 * - With season aggregates, we approximate milestone bonuses using highestScore and bestWickets.
 * - Per-innings events like ducks or LBW/Bowled bonuses require match-level data; supported if provided.
 */
export function calculateDream11Points(stats = {}) {
  const num = (v) => (Number.isFinite(v) ? v : 0);

  // Basic aggregates
  const runs = num(stats.runs);
  const wickets = num(stats.wickets);
  const fours = num(stats.fours);
  const sixes = num(stats.sixes);
  const highestScore = num(stats.highestScore ?? stats.highScore ?? stats.hs);
  const bestWkts = num(stats.bestWickets ?? stats.highWicket ?? stats.best);
  const maidens = num(stats.maidens);
  const dotBalls = num(stats.dotBalls);
  const catches = num(stats.catches);
  const stumpings = num(stats.stumpings);
  const runOutDirect = num(stats.runOutDirect); // direct-hit
  const runOutIndirect = num(stats.runOutIndirect); // assist/throw or catcher
  const lbwOrBowled = num(stats.lbwOrBowled ?? stats.bowledLbw ?? 0); // optional extra if tracked

  // Rate gates
  const ballsFaced = num(stats.ballsFaced);
  const oversBowled = num(stats.oversBowled);
  const economy = Number.isFinite(stats.economy) ? stats.economy : null;
  const strikeRate = Number.isFinite(stats.strikeRate) ? stats.strikeRate : null;

  // Role hint (optional) for duck gating etc.
  const role = (stats.role || '').toString().toLowerCase();

  let pts = 0;

  // Batting
  pts += runs * 1; // +1 per run
  pts += fours * 1; // boundary bonus +1 per four
  pts += sixes * 2; // six bonus +2 per six

  // Batting milestones (apply highest achieved once based on HS)
  if (highestScore >= 100) pts += 16;
  else if (highestScore >= 50) pts += 8;
  else if (highestScore >= 30) pts += 4;

  // Duck penalty (match-level only). If aggregate ducks provided, apply for non-bowler roles
  const ducks = num(stats.ducks);
  if (ducks > 0) {
    const isBowlerRole = role.includes('bowler') && !role.includes('all');
    if (!isBowlerRole) pts -= 2 * ducks;
  }

  // Bowling
  pts += wickets * 25; // +25 per wicket
  pts += lbwOrBowled * 8; // optional bonus for LBW/Bowled wickets if tracked

  // Bowling hauls based on bestWkts
  if (bestWkts >= 5) pts += 16;
  else if (bestWkts === 4) pts += 8;
  else if (bestWkts === 3) pts += 4;

  pts += maidens * 12; // +12 per maiden over
  pts += dotBalls * 0.5; // +0.5 per dot ball (kept modest to avoid bias)

  // Fielding
  pts += catches * 8; // catch out
  if (catches >= 3) pts += 4; // 3 catches bonus once
  pts += stumpings * 12; // wicketkeeper stumping
  pts += runOutDirect * 12; // direct-hit run-out
  pts += runOutIndirect * 6; // run-out assist (thrower/receiver)

  // Economy rate bands (T20). Apply only if bowled >= 2 overs
  if (economy != null && oversBowled >= 2) {
    if (economy < 5) pts += 6;
    else if (economy < 6) pts += 4;
    else if (economy < 7) pts += 2;
    else if (economy >= 12) pts -= 6;
    else if (economy >= 11) pts -= 4;
    else if (economy >= 10) pts -= 2;
  }

  // Strike rate bands (batting). Apply only if balls faced >= 10
  if (strikeRate != null && ballsFaced >= 10) {
    if (strikeRate > 170) pts += 6;
    else if (strikeRate > 150) pts += 4;
    else if (strikeRate >= 130) pts += 2;
    else if (strikeRate < 50) pts -= 6;
    else if (strikeRate < 60) pts -= 4;
    else if (strikeRate < 70) pts -= 2;
  }

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
    bestWickets: p.bestWickets ?? p.highWicket ?? p.best,
    maidens: p.maidens,
    dotBalls: p.dotBalls,
    catches: p.catches,
    stumpings: p.stumpings,
    runOutDirect: p.runOutDirect,
    runOutIndirect: p.runOutIndirect,
    lbwOrBowled: p.lbwOrBowled ?? p.bowledLbw,
    ducks: p.ducks, // optional aggregate duck count
    ballsFaced: p.ballsFaced,
    oversBowled: p.oversBowled,
    economy: p.economy,
    strikeRate: p.strikeRate,
    role: p.role || p.playerRole,
  };
}
