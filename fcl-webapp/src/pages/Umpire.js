import React, { useState } from 'react';
import TeamLogo from '../components/TeamLogo';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { addDoc, collection, setDoc, doc, updateDoc, deleteDoc, increment, getDoc } from 'firebase/firestore';
// Storage removed; inline base64 images used now.
const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
  reader.readAsDataURL(file);
});
import { useCollection, useDocument } from '../hooks/useFirestore';
import { getPlayerAvatar, isCustomAvatar } from '../utils/getPlayerAvatar';

function Umpire() {
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('setup'); // setup | matches | players | teams | control
  const [team1, setTeam1] = useState('Team Blue');
  const [team2, setTeam2] = useState('Team White');
  const [venue, setVenue] = useState('');
  const [venueMapUrl, setVenueMapUrl] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0,10));
  const [totalOvers, setTotalOvers] = useState(20);
  const [playersPerSideSetup, setPlayersPerSideSetup] = useState(11);
  const [makeCurrent, setMakeCurrent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [createdId, setCreatedId] = useState('');
  // Inline edit state for Matches tab
  const [editingId, setEditingId] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editVenue, setEditVenue] = useState('');
  const [editOvers, setEditOvers] = useState('');

  const isUmpire = !!(userProfile?.isUmpire || userProfile?.role === 'umpire' || userProfile?.isAdmin);

  // Live matches list for the Matches tab
  const { data: allMatches } = useCollection('matches', null, [], 100, { enabled: true, poll: false });
  // Current match for Control tab
  const { data: currentMatch } = useDocument('matches', 'current-match', { enabled: true });
  const groups = React.useMemo(() => {
    const live = [];
    const upcoming = [];
    const completed = [];
    (allMatches || []).forEach((m) => {
      const st = (m.status || '').toLowerCase();
      if (m.id === 'current-match') return; // exclude shadow here; we'll add a clean fallback below
      if (st === 'live' || st === 'break') live.push(m);
      else if (st === 'completed') completed.push(m);
      else upcoming.push(m);
    });
    // Fallback: if shadow current-match is present and the actual match is not already included, add it
    const stShadow = (currentMatch?.status || '').toLowerCase();
    if (stShadow && currentMatch?.id && currentMatch.id !== 'current-match') {
      // currentMatch.id points to the actual match document ID
      const actualMatchId = currentMatch.id;
      const target = (stShadow === 'live' || stShadow === 'break') ? live : (stShadow === 'completed' ? completed : upcoming);
      // Only add if the actual match is not already in the list
      if (!target.some(x => x.id === actualMatchId)) {
        // Add the shadow document data with the actual match ID
        target.unshift({ ...(currentMatch||{}), id: actualMatchId });
      }
    }
    // basic sort: upcoming by date asc, others by date desc
    const ts = (d) => {
      if (!d) return 0;
      if (typeof d === 'number') return d;
      if (typeof d === 'string') return Date.parse(d) || 0;
      if (typeof d === 'object' && typeof d.seconds === 'number') return d.seconds * 1000;
      return 0;
    };
    upcoming.sort((a,b)=> ts(a.date)-ts(b.date));
    live.sort((a,b)=> ts(b.date)-ts(a.date));
    completed.sort((a,b)=> ts(b.date)-ts(a.date));
    return { live, upcoming, completed };
  }, [allMatches, currentMatch]);

  // Create Player form state (Players tab)
  const [pName, setPName] = useState('');
  const [pAge, setPAge] = useState('');
  const [pGender, setPGender] = useState('male');
  const [pAvatar, setPAvatar] = useState('/Teams/imgImage8.png'); // male default
  const [pStatus, setPStatus] = useState('available'); // available | unavailable
  // Local image previews
  const [pAvatarPreview, setPAvatarPreview] = useState('');
  const [pUploading, setPUploading] = useState(false);
  const [pRole, setPRole] = useState('batsman'); // batsman | bowler | all-rounder
  const [pBattingStyle, setPBattingStyle] = useState('right-handed'); // right-handed | left-handed
  const [pJerseyNumber, setPJerseyNumber] = useState('');
  const [epAvatarPreview, setEpAvatarPreview] = useState('');

  // Control tab local state (rosters, locks, overrides)
  const [team1Roster, setTeam1Roster] = useState([]);
  const [team2Roster, setTeam2Roster] = useState([]);
  const [t1Locked, setT1Locked] = useState(false);
  const [t2Locked, setT2Locked] = useState(false);
  const [ovrT1Runs, setOvrT1Runs] = useState('');
  const [ovrT1Wkts, setOvrT1Wkts] = useState('');
  const [ovrT2Runs, setOvrT2Runs] = useState('');
  const [ovrT2Wkts, setOvrT2Wkts] = useState('');
  const [ovrOver, setOvrOver] = useState('');
  const [ovrBall, setOvrBall] = useState('');
  const [nbExtra, setNbExtra] = useState('0');
  const [wdExtra, setWdExtra] = useState('1');
  const [bExtra, setBExtra] = useState('1');
  const [lbExtra, setLbExtra] = useState('1');
  const [undoStack, setUndoStack] = useState([]); // keep last 3 snapshots
  const [battingTeamSel, setBattingTeamSel] = useState('');
  const [strikerSel, setStrikerSel] = useState('');
  const [nonStrikerSel, setNonStrikerSel] = useState('');
  const [bowlerSel, setBowlerSel] = useState('');
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [wicketBatter, setWicketBatter] = useState('');
  const [wicketType, setWicketType] = useState('bowled');
  const [wicketFielder, setWicketFielder] = useState('');
  const [showNewBatsmanModal, setShowNewBatsmanModal] = useState(false);
  const [newBatsmanId, setNewBatsmanId] = useState('');
  const [outRole, setOutRole] = useState('striker'); // 'striker' | 'non-striker'
  const { data: allPlayers } = useCollection('players', 'name', [], 500, { enabled: true, poll: false });
  // Toss state
  const [tossWinnerSel, setTossWinnerSel] = useState(''); // 'team1' | 'team2'
  const [tossDecisionSel, setTossDecisionSel] = useState('bat'); // 'bat' | 'bowl'
  // Super Over flag
  const [superOver, setSuperOver] = useState(false);
  // Player edit list state
  const [playerEditingId, setPlayerEditingId] = useState('');
  const [epName, setEpName] = useState('');
  const [epAge, setEpAge] = useState('');
  const [epGender, setEpGender] = useState('male');
  const [epAvatar, setEpAvatar] = useState('/Teams/imgImage8.png');
  const [epStatus, setEpStatus] = useState('available');
  const [epRole, setEpRole] = useState('');
  const [epBattingStyle, setEpBattingStyle] = useState('');
  const [epJerseyNumber, setEpJerseyNumber] = useState('');
  
  // Teams collection for dynamic team selection (hooks must be before any early return)
  const { data: teams } = useCollection('teams', 'name', [], 200, { enabled: true, poll: false });
  const teamOptions = Array.isArray(teams) ? teams : [];
  const otherOf = (v) => {
    const list = teamOptions.map(t=>t.name);
    return list.find(o => o !== v) || list[0];
  };
  React.useEffect(() => {
    if (!Array.isArray(teams) || teams.length === 0) return;
    if (!team1 || !teams.some(t => t.name === team1)) setTeam1(teams[0]?.name || '');
    if (!team2 || team1 === team2 || !teams.some(t => t.name === team2)) {
      const alt = teams.find(t => t.name !== (teams[0]?.name || ''))?.name || '';
      if (alt) setTeam2(alt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teams?.length]);

  // Teams management state
  const [tName, setTName] = useState('');
  const [tLogoUrl, setTLogoUrl] = useState('');
  const [tLogoFile, setTLogoFile] = useState(null);
  const [tLogoPreview, setTLogoPreview] = useState('');
  const [tUploading, setTUploading] = useState(false);
  const [tLoading, setTLoading] = useState(false);
  const [teamEditingId, setTeamEditingId] = useState('');
  const [teName, setTeName] = useState('');
  const [teLogoUrl, setTeLogoUrl] = useState('');
  
  // Inline roster editor component
  const RosterEditor = ({ teamKey, roster, setRoster, locked, playersPerSide, allPlayers, otherTeamRoster }) => {
    const [search, setSearch] = useState('');
    const filtered = Array.isArray(allPlayers) ? allPlayers.filter(p => (p?.name||'').toLowerCase().includes(search.toLowerCase())) : [];
    const isSelected = (player) => Array.isArray(roster) && roster.some(p => (p.id||p.playerId) === player.id);
    const isDisabled = (player) => otherTeamRoster && otherTeamRoster.some(p => (p.id||p.playerId) === player.id);
    const toggle = (player) => {
      if (locked || isDisabled(player)) return;
      let next = Array.isArray(roster) ? [...roster] : [];
      const idx = next.findIndex(p => (p.id||p.playerId) === player.id);
      if (idx >= 0) next.splice(idx, 1);
      else next.push({ id: player.id, name: player.name, gender: player.gender, avatar: player.avatar });
      setRoster(next);
    };
    return (
      <div className="border rounded-md p-3">
        <div className="mb-2 text-sm font-medium flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span>Select Players ({teamKey === 'team1' ? 'Team 1' : 'Team 2'})</span>
          <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search player by name..." className="border px-2 py-1 rounded text-sm w-full sm:w-64" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {filtered.map(player => {
            const avatar = getPlayerAvatar(player);
            const selected = isSelected(player);
            const disabled = isDisabled(player);
            return (
              <div key={player.id} className={`border rounded p-2 flex flex-col items-center cursor-pointer transition ${selected ? 'bg-blue-100 border-blue-500' : disabled ? 'bg-gray-100 border-gray-300 opacity-50 cursor-not-allowed' : 'bg-white border-gray-200'}`} onClick={()=> toggle(player)} title={disabled ? 'Already selected in other team' : ''}>
                <img src={avatar} alt={player.name} className="w-12 h-12 rounded-full mb-2 border" />
                <div className="font-semibold text-sm text-center">{player.name}</div>
                <div className="text-xs text-gray-500 capitalize">{player.gender || 'Player'}</div>
                {selected && <div className="text-green-600 text-xs mt-1">Selected</div>}
              </div>
            );
          })}
        </div>
        <div className="mt-2 text-xs text-gray-600">Selected {Array.isArray(roster)? roster.length:0}</div>
      </div>
    );
  };

  // File upload replaced by base64 conversion (no external storage)
  const readImageInline = async (file) => {
    if (!file) throw new Error('No file');
    setMessage('Reading image...');
    const dataUrl = await fileToDataUrl(file);
    setMessage('Image ready.');
    return dataUrl;
  };

  // Sync local roster/lock state from current match
  React.useEffect(() => {
    if (!currentMatch) return;
    const t1 = Array.isArray(currentMatch?.team1?.players) ? currentMatch.team1.players : [];
    const t2 = Array.isArray(currentMatch?.team2?.players) ? currentMatch.team2.players : [];
    setTeam1Roster(t1);
    setTeam2Roster(t2);
    setT1Locked(!!currentMatch?.team1?.rosterLocked);
    setT2Locked(!!currentMatch?.team2?.rosterLocked);
    setOvrT1Runs(String(currentMatch?.team1?.runs ?? ''));
    setOvrT1Wkts(String(currentMatch?.team1?.wickets ?? ''));
    setOvrT2Runs(String(currentMatch?.team2?.runs ?? ''));
    setOvrT2Wkts(String(currentMatch?.team2?.wickets ?? ''));
    setOvrOver(String(currentMatch?.currentOver ?? ''));
    setOvrBall(String(currentMatch?.currentBall ?? ''));
    // selections
    setBattingTeamSel(currentMatch?.battingTeam || (currentMatch?.battingTeam === 'team2' ? 'team2' : 'team1'));
    setStrikerSel(currentMatch?.currentStrikerId || '');
    setNonStrikerSel(currentMatch?.currentNonStrikerId || '');
    setBowlerSel(currentMatch?.currentBowlerId || '');
    // Toss & Super Over
    const tw = currentMatch?.toss?.winner || '';
    const td = currentMatch?.toss?.decision || 'bat';
    setTossWinnerSel(tw);
    setTossDecisionSel(td);
    setSuperOver(!!currentMatch?.isSuperOver);
  }, [currentMatch?.id, currentMatch?.team1, currentMatch?.team2, currentMatch?.currentOver, currentMatch?.currentBall]);

  // Reset all control forms when a match is marked completed
  React.useEffect(() => {
    if (!currentMatch) return;
    if ((currentMatch.status || '').toLowerCase() === 'completed') {
      // Clear transient selections and inputs; keep persisted rosters/locks as-is
      setBattingTeamSel(currentMatch?.battingTeam || 'team1');
      setStrikerSel('');
      setNonStrikerSel('');
      setBowlerSel('');
      setOvrT1Runs('');
      setOvrT1Wkts('');
      setOvrT2Runs('');
      setOvrT2Wkts('');
      setOvrOver('');
      setOvrBall('');
      setNbExtra('0');
      setWdExtra('1');
      setBExtra('1');
      setLbExtra('1');
      setUndoStack([]);
      setShowWicketModal(false);
      setWicketBatter('');
      setWicketType('bowled');
      setWicketFielder('');
      setShowNewBatsmanModal(false);
      setNewBatsmanId('');
      setOutRole('striker');
    }
  }, [currentMatch?.status]);

  const playersPerSide = parseInt(currentMatch?.playersPerSide) || parseInt(currentMatch?.numPlayers) || 11;

  const maxWickets = Math.max(1, playersPerSide - 1);

  const otherTeamKey = (k) => (k === 'team1' ? 'team2' : 'team1');

  const startNextInnings = async () => {
    const battingKey = currentMatch?.battingTeam === 'team2' ? 'team2' : 'team1';
    const firstInnings = Array.isArray(currentMatch?.innings) ? currentMatch.innings.find(i => i?.teamKey === battingKey) : null;
    const target = firstInnings?.total?.runs ? (parseInt(firstInnings.total.runs) + 1) : null;
    const fieldKey = otherTeamKey(battingKey);
    await persistMatch({
      status: 'live',
      battingTeam: fieldKey,
      currentOver: 0,
      currentBall: 0,
      // Reset selections to force umpire to pick new pair and bowler
      currentStrikerId: '',
      currentStrikerName: '',
      currentNonStrikerId: '',
      currentNonStrikerName: '',
      currentBowlerId: '',
      currentBowlerName: '',
      recentBalls: [],
      targetRuns: target || null,
      lastUpdated: new Date(),
    });
    setStrikerSel(''); setNonStrikerSel(''); setBowlerSel('');
    setMessage('Innings ended. Select new striker, non-striker, and bowler.');
  };

  const computeResult = (inningsSnapshot) => {
    try {
      const inns = Array.isArray(inningsSnapshot) ? inningsSnapshot : (Array.isArray(currentMatch?.innings) ? currentMatch.innings : []);
      const t1 = inns.find(i => i?.teamKey === 'team1');
      const t2 = inns.find(i => i?.teamKey === 'team2');
      if (!t1 || !t2 || !t1.total || !t2.total) return null;
      const r1 = parseInt(t1.total.runs)||0;
      const r2 = parseInt(t2.total.runs)||0;
      if (r2 >= r1 + 1) {
        const wktsLost = parseInt(currentMatch?.team2?.wickets)|| (parseInt(t2.total.wickets)||0);
        const wicketsRemaining = Math.max(0, maxWickets - wktsLost);
        const winner = currentMatch?.team2?.name || 'Team 2';
        return `${winner} won by ${wicketsRemaining} wicket${wicketsRemaining===1?'':'s'}`;
      }
      const diff = Math.max(0, r1 - r2);
      const winner = currentMatch?.team1?.name || 'Team 1';
      return `${winner} won by ${diff} run${diff===1?'':'s'}`;
    } catch { return null; }
  };

  const maybeAutoAdvanceOrComplete = async (nextState, innings) => {
    const battingKey = currentMatch?.battingTeam === 'team2' ? 'team2' : 'team1';
    const fieldKey = otherTeamKey(battingKey);
    const totalOversMax = parseInt(currentMatch?.totalOvers) || 20;
    const battingRuns = battingKey==='team1' ? (nextState?.team1?.runs||0) : (nextState?.team2?.runs||0);
    const battingWkts = battingKey==='team1' ? (nextState?.team1?.wickets||0) : (nextState?.team2?.wickets||0);
    const hasFirstInnings = Array.isArray(innings) && innings.some(i => i?.teamKey === fieldKey);
    const firstInnings = Array.isArray(innings) ? innings.find(i => i?.teamKey === fieldKey) : null;
    const firstRuns = firstInnings?.total?.runs ? parseInt(firstInnings.total.runs) : null;

    // If this is second innings and target reached, complete match immediately
    if (hasFirstInnings && firstRuns != null && battingRuns >= firstRuns + 1) {
      if (!(currentMatch?.awards?.manOfTheMatchId)) {
        setMessage('Target achieved. Please select Man of the Match in Awards section before the match can be completed.');
        return;
      }
      const result = computeResult(innings);
  await persistMatch({ status: 'completed', result, completedAt: new Date(), lastUpdated: new Date() });
      await finalizeMatchAndUpdateStats();
      setMessage('Target achieved. Match completed.');
      return;
    }

    // Auto end when overs completed or all-out
    const overComplete = (Number(nextState?.currentOver)||0) >= totalOversMax && (Number(nextState?.currentBall)||0) === 0;
    const allOut = battingWkts >= maxWickets;
    if (overComplete || allOut) {
      if (hasFirstInnings) {
        // Second innings finished -> check for Man of the Match before completing
        if (!(currentMatch?.awards?.manOfTheMatchId)) {
          setMessage('Innings finished. Please select Man of the Match in Awards section before the match can be completed.');
          return;
        }
        const result = computeResult(innings);
  await persistMatch({ status: 'completed', result, completedAt: new Date(), lastUpdated: new Date() });
        await finalizeMatchAndUpdateStats();
        setMessage('Innings finished. Match completed.');
      } else {
        // First innings finished -> start next innings
        await startNextInnings();
      }
    }
  };

  // Helper to persist match changes to Firestore (current-match and actual match doc)
  const persistMatch = async (updates) => {
    await updateDoc(doc(db,'matches','current-match'), updates);
    if (currentMatch?.id) await updateDoc(doc(db,'matches', currentMatch.id), updates);
  };

  // Reset match to a clean 'upcoming' state while preserving team rosters and metadata
  const resetMatch = async () => {
    try {
      // Clear team rosters and unlock them
      const t1 = currentMatch?.team1 ? { ...currentMatch.team1, runs: 0, wickets: 0, overs: 0, players: [], rosterLocked: false } : { players: [], rosterLocked: false };
      const t2 = currentMatch?.team2 ? { ...currentMatch.team2, runs: 0, wickets: 0, overs: 0, players: [], rosterLocked: false } : { players: [], rosterLocked: false };
      const updates = {
        status: 'upcoming',
        innings: [],
        currentOver: 0,
        currentBall: 0,
        recentBalls: [],
        targetRuns: null,
        battingTeam: null,
        team1: t1,
        team2: t2,
        awards: {},
        result: '',
        lastWicket: null,
        completedAt: null,
        // Reset all current player selections
        currentStrikerId: '',
        currentStrikerName: '',
        currentNonStrikerId: '',
        currentNonStrikerName: '',
        currentBowlerId: '',
        currentBowlerName: '',
        lastUpdated: new Date()
      };
      await persistMatch(updates);
      // Reset local control form selections
      resetControlFormSelections();
      setMessage('Match reset to Upcoming and scoreboard cleared.');
    } catch (e) {
      console.error('Error resetting match:', e);
      setMessage('Error resetting match: ' + (e?.message || String(e)));
    }
  };

  // Ensure innings exists and return a mutable copy along with indices
  const getInningsCopy = () => {
    const innings = Array.isArray(currentMatch?.innings) ? JSON.parse(JSON.stringify(currentMatch.innings)) : [];
    const battingKey = currentMatch?.battingTeam === 'team2' ? 'team2' : 'team1';
    let idx = innings.findIndex(i => i && i.teamKey === battingKey);
    if (idx === -1) {
      const teamName = (battingKey === 'team1' ? currentMatch?.team1?.name : currentMatch?.team2?.name) || battingKey;
      innings.push({ teamKey: battingKey, teamName, batting: [], bowling: [], battingOrder: (battingKey==='team1'? (team1Roster||[]) : (team2Roster||[])).map(p=>p.name), total: { runs: 0, wickets: 0, overs: '0.0', extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalties: 0 } } });
      idx = innings.length - 1;
    }
    return { innings, idx, battingKey };
  };

  const findOrAddBatter = (inn, id, name) => {
    if (!Array.isArray(inn.batting)) inn.batting = [];
    let b = inn.batting.find(x => x.playerId === id || x.id === id || x.name === name);
    if (!b) {
      b = { playerId: id, name, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false };
      inn.batting.push(b);
    }
    return b;
  };

  const findOrAddBowler = (inn, id, name) => {
    if (!Array.isArray(inn.bowling)) inn.bowling = [];
    let bw = inn.bowling.find(x => x.playerId === id || x.id === id || x.name === name);
    if (!bw) {
      bw = { playerId: id, name, balls: 0, runsConceded: 0, wickets: 0, foursConceded: 0, sixesConceded: 0 };
      inn.bowling.push(bw);
    }
    return bw;
  };

  const saveSelections = async () => {
    try {
      const batKey = battingTeamSel === 'team2' ? 'team2' : 'team1';
      const fieldKey = batKey === 'team1' ? 'team2' : 'team1';
      const batRoster = batKey === 'team1' ? (team1Roster||[]) : (team2Roster||[]);
      const fieldRoster = fieldKey === 'team1' ? (team1Roster||[]) : (team2Roster||[]);
      const s = batRoster.find(p => (p.id||p.playerId) === strikerSel);
      const n = batRoster.find(p => (p.id||p.playerId) === nonStrikerSel && (p.id||p.playerId) !== strikerSel);
      const b = fieldRoster.find(p => (p.id||p.playerId) === bowlerSel);
      // Ensure innings entries exist for selected players so both appear on UI before any ball
      const { innings, idx } = getInningsCopy();
      const inn = innings[idx];
      if (s) findOrAddBatter(inn, (s.id||s.playerId), s.name);
      if (n) findOrAddBatter(inn, (n.id||n.playerId), n.name);
      if (b) findOrAddBowler(inn, (b.id||b.playerId), b.name);
      // Set on-strike flags
      if (Array.isArray(inn.batting)) {
        inn.batting.forEach(x => { x.isOnStrike = false; x.isNonStrike = false; });
        if (s) {
          const sb = inn.batting.find(x => (x.playerId=== (s.id||s.playerId) || x.id=== (s.id||s.playerId)));
          if (sb) sb.isOnStrike = true;
        }
        if (n) {
          const nb = inn.batting.find(x => (x.playerId=== (n.id||n.playerId) || x.id=== (n.id||n.playerId)));
          if (nb) nb.isNonStrike = true;
        }
      }
      // If switching batting team to a fresh innings, force overs to 0.0 and clear recent balls
      const currentBatKey = currentMatch?.battingTeam === 'team2' ? 'team2' : 'team1';
      const innOvers = String(inn?.total?.overs ?? '0.0');
      const looksFreshInnings = (innOvers === '0' || innOvers === '0.0');
      const noRecent = !Array.isArray(currentMatch?.recentBalls) || currentMatch.recentBalls.length === 0;
      const switchingTeams = batKey !== currentBatKey;
      const shouldResetOverCounters = switchingTeams && looksFreshInnings && noRecent;
      await persistMatch({
        battingTeam: batKey,
        currentStrikerId: s ? (s.id||s.playerId) : '',
        currentStrikerName: s ? s.name : '',
        currentNonStrikerId: n ? (n.id||n.playerId) : '',
        currentNonStrikerName: n ? n.name : '',
        currentBowlerId: b ? (b.id||b.playerId) : '',
        currentBowlerName: b ? b.name : '',
        innings,
        ...(shouldResetOverCounters ? { currentOver: 0, currentBall: 0, recentBalls: [] } : {}),
      });
      setMessage('Selections saved.');
    } catch (e) {
      setMessage('Error saving selections: ' + (e?.message || String(e)));
    }
  };

  // Record a ball outcome with cricket rules for wides/no-balls/wickets
  const recordBall = async (outcome, extraRuns = 0) => {
    if (!currentMatch) return;
    try {
      // enforce selections first
      const batTeam = battingTeamSel || currentMatch?.battingTeam || 'team1';
      if (!strikerSel || !nonStrikerSel || !bowlerSel) {
        setMessage('Set striker, non-striker, and bowler before scoring.');
        return;
      }
  const battingKey = currentMatch?.battingTeam === 'team2' ? 'team2' : 'team1';
  const otherKey = battingKey === 'team1' ? 'team2' : 'team1';
      const t1 = currentMatch?.team1 || { runs: 0, wickets: 0 };
      const t2 = currentMatch?.team2 || { runs: 0, wickets: 0 };
      let runsAdd = 0;
      let wktsAdd = 0;
      let legal = true; // counts as ball?
      let chip = '';

      const norm = String(outcome).trim();
      if (norm === 'Wd') {
        const wd = Math.max(1, parseInt(extraRuns || wdExtra) || 1);
        runsAdd = wd;
        legal = false;
        chip = wd > 1 ? `Wd:${wd}` : 'Wd';
      } else if (norm === 'Nb') {
        const extra = Math.max(0, parseInt(extraRuns) || 0);
        runsAdd = 1 + extra;
        legal = false;
        chip = `Nb:${extra}`;
      } else if (norm === 'B') {
        const by = Math.max(1, parseInt(extraRuns) || 1);
        runsAdd = by;
        legal = true;
        chip = `B:${by}`;
      } else if (norm === 'Lb') {
        const lb = Math.max(1, parseInt(extraRuns) || 1);
        runsAdd = lb;
        legal = true;
        chip = `Lb:${lb}`;
      } else if (norm === '.' || norm === '•' || norm === '0') {
        runsAdd = 0;
        legal = true;
        chip = '.';
      } else {
        const r = Math.max(0, parseInt(norm) || 0);
        runsAdd = r;
        legal = true;
        chip = String(r);
      }
      // Wicket handled via dedicated modal to capture details, so ignore here

      // Prepare innings/batsman/bowler updates
      const { innings, idx, battingKey: batKey } = getInningsCopy();
    const inn = innings[idx];
      // Derive previous over/ball with a guard for a brand-new innings
      let prevOver = Number(currentMatch?.currentOver) || 0;
      let prevBall = Number(currentMatch?.currentBall) || 0;
      const isNewInnings = ((inn?.total?.overs === '0.0' || inn?.total?.overs === '0' || !inn?.total?.overs) && Array.isArray(currentMatch?.recentBalls) && currentMatch.recentBalls.length === 0);
      if (isNewInnings) { prevOver = 0; prevBall = 0; }

      const prev = {
        team1: { runs: t1.runs || 0, wickets: t1.wickets || 0 },
        team2: { runs: t2.runs || 0, wickets: t2.wickets || 0 },
        over: prevOver,
        ball: prevBall,
        recentLen: Array.isArray(currentMatch?.recentBalls) ? currentMatch.recentBalls.length : 0,
      };

      // Compute new scoreline
      const next = {
        team1: { ...t1 },
        team2: { ...t2 },
        currentOver: prev.over,
        currentBall: prev.ball,
        recentBalls: Array.isArray(currentMatch?.recentBalls) ? [...currentMatch.recentBalls] : [],
      };
  const strikerName = currentMatch?.currentStrikerName || '';
      const nonStrikerName = currentMatch?.currentNonStrikerName || '';
      const bowlerName = currentMatch?.currentBowlerName || '';
  const striker = findOrAddBatter(inn, strikerSel, strikerName);
  const bwEntry = findOrAddBowler(inn, bowlerSel, bowlerName);
  if (typeof bwEntry._thisOverRuns !== 'number') bwEntry._thisOverRuns = 0;
    if (!inn.total) inn.total = { runs: 0, wickets: 0, overs: '0.0', extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalties: 0 } };
    if (!inn.total.extras) inn.total.extras = { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalties: 0 };

      if (battingKey === 'team1') {
        next.team1.runs = Math.max(0, (t1.runs || 0) + runsAdd);
        next.team1.wickets = Math.max(0, Math.min(maxWickets, (t1.wickets || 0) + wktsAdd));
      } else {
        next.team2.runs = Math.max(0, (t2.runs || 0) + runsAdd);
        next.team2.wickets = Math.max(0, Math.min(maxWickets, (t2.wickets || 0) + wktsAdd));
      }

      // Advance ball/over for legal deliveries
      let swapStrike = false;
      if (legal) {
        // batter/ bowler stats on legal delivery
        striker.balls = (striker.balls || 0) + 1;
        bwEntry.balls = (bwEntry.balls || 0) + 1;
        if (norm === 'B') {
          // Byes: do not credit batter; do not charge bowler
          inn.total.extras.byes = (inn.total.extras.byes || 0) + runsAdd;
          // no addition to bowler over runs; not a dot if runsAdd>0 (always >=1 here)
        } else if (norm === 'Lb') {
          // Leg byes: do not credit batter; do not charge bowler
          inn.total.extras.legByes = (inn.total.extras.legByes || 0) + runsAdd;
          // leg-bye with runs is not a dot; no bowler run addition
        } else {
          if (runsAdd > 0) {
            striker.runs = (striker.runs || 0) + runsAdd;
            if (runsAdd === 4) striker.fours = (striker.fours || 0) + 1;
            if (runsAdd === 6) striker.sixes = (striker.sixes || 0) + 1;
            bwEntry.runsConceded = (bwEntry.runsConceded || 0) + runsAdd;
            if (runsAdd === 4) bwEntry.foursConceded = (bwEntry.foursConceded || 0) + 1;
            if (runsAdd === 6) bwEntry.sixesConceded = (bwEntry.sixesConceded || 0) + 1;
            bwEntry._thisOverRuns += runsAdd;
          } else {
            // legal delivery, no runs: dot ball
            bwEntry.dots = (bwEntry.dots || 0) + 1;
          }
        }
        const b = (prev.ball || 0) + 1;
        if (b >= 6) {
          next.currentBall = 0;
          next.currentOver = (prev.over || 0) + 1;
          swapStrike = true;
          // Over finished: check maiden
          if ((bwEntry._thisOverRuns || 0) === 0) {
            bwEntry.maidens = (bwEntry.maidens || 0) + 1;
          }
          bwEntry._thisOverRuns = 0;
        } else {
          next.currentBall = b;
          next.currentOver = prev.over || 0;
        }
      } else {
        // Extras that don't count as balls
        if (norm === 'Wd') {
          const wd = runsAdd; // already computed
          inn.total.extras.wides = (inn.total.extras.wides || 0) + wd;
          bwEntry.runsConceded = (bwEntry.runsConceded || 0) + wd;
          bwEntry._thisOverRuns += wd;
        }
        if (norm === 'Nb') {
          const extra = Math.max(0, parseInt(extraRuns) || 0);
          inn.total.extras.noBalls = (inn.total.extras.noBalls || 0) + 1;
          bwEntry.runsConceded = (bwEntry.runsConceded || 0) + (1 + extra);
          bwEntry._thisOverRuns += (1 + extra);
          if (extra > 0) {
            striker.runs = (striker.runs || 0) + extra;
            if (extra === 4) striker.fours = (striker.fours || 0) + 1;
            if (extra === 6) striker.sixes = (striker.sixes || 0) + 1;
            if (extra === 4) bwEntry.foursConceded = (bwEntry.foursConceded || 0) + 1;
            if (extra === 6) bwEntry.sixesConceded = (bwEntry.sixesConceded || 0) + 1;
          }
        }
      }

  if (chip) next.recentBalls.push(chip);

      // Update innings totals overs string
      const totalRuns = (battingKey === 'team1') ? next.team1.runs : next.team2.runs;
      const totalWickets = (battingKey === 'team1') ? next.team1.wickets : next.team2.wickets;
      inn.total = {
        ...(inn.total || {}),
        runs: totalRuns,
        wickets: totalWickets,
        overs: `${next.currentOver}.${next.currentBall}`,
      };

      // Mid-over strike swap rules
      if (legal) {
        if (norm === 'B' || norm === 'Lb') {
          if ((runsAdd % 2) === 1) swapStrike = !swapStrike; // odd extras swap strike
        } else if (norm !== '.' && norm !== '•' && norm !== '0') {
          if ((runsAdd % 2) === 1) swapStrike = !swapStrike; // 1 or 3 swap
        }
      }

      // If over finished, force bowler reselection
      let bowlerUpdates = {};
      if (legal && next.currentBall === 0) {
        bowlerUpdates = { currentBowlerId: '', currentBowlerName: '' };
      }

      // Apply strike swap by flipping current striker/non-striker in match
      let strikeUpdates = {};
      if (swapStrike) {
        strikeUpdates = {
          currentStrikerId: currentMatch?.currentNonStrikerId || nonStrikerSel || '',
          currentStrikerName: currentMatch?.currentNonStrikerName || nonStrikerName || '',
          currentNonStrikerId: currentMatch?.currentStrikerId || strikerSel || '',
          currentNonStrikerName: currentMatch?.currentStrikerName || strikerName || '',
        };
      }
      // Update batting flags based on effective striker/non-striker
      const effStrikerId = strikeUpdates.currentStrikerId || (currentMatch?.currentStrikerId || strikerSel);
      const effNonStrikerId = strikeUpdates.currentNonStrikerId || (currentMatch?.currentNonStrikerId || nonStrikerSel);
      if (Array.isArray(inn.batting)) {
        inn.batting.forEach(x => { x.isOnStrike = false; x.isNonStrike = false; });
        const sb = inn.batting.find(x => (x.playerId===effStrikerId || x.id===effStrikerId));
        const nb = inn.batting.find(x => (x.playerId===effNonStrikerId || x.id===effNonStrikerId));
        if (sb) sb.isOnStrike = true;
        if (nb) nb.isNonStrike = true;
      }

      // Persist updates
      await persistMatch({
        team1: next.team1,
        team2: next.team2,
        currentOver: next.currentOver,
        currentBall: next.currentBall,
        recentBalls: next.recentBalls,
        innings,
        lastUpdated: new Date(),
        // Store a simple tick to indicate strike swap (clients may use in future)
        strikeSwapTick: swapStrike ? ((currentMatch?.strikeSwapTick || 0) + 1) : (currentMatch?.strikeSwapTick || 0),
        ...bowlerUpdates,
        ...strikeUpdates,
      });

      // Push into local undo stack (cap at 3)
      setUndoStack((prevStack) => {
        const nextStack = [{ prev } , ...prevStack];
        return nextStack.slice(0, 3);
      });
      if (swapStrike) {
        // update local selections so UI reflects new striker
        if (strikeUpdates.currentStrikerId && strikeUpdates.currentNonStrikerId) {
          setStrikerSel(strikeUpdates.currentStrikerId);
          setNonStrikerSel(strikeUpdates.currentNonStrikerId);
        }
      }
      if (legal && next.currentBall === 0) {
        setMessage(`Recorded: ${chip}. Over finished — please select a new bowler. Strike changed.`);
      } else {
        setMessage(`Recorded: ${chip}`);
      }

      // Auto advance/end checks
      await maybeAutoAdvanceOrComplete(next, innings);
    } catch (e) {
      setMessage('Error recording ball: ' + (e?.message || String(e)));
    }
  };

  // Manual strike swap
  const swapStrikeManual = async () => {
    try {
      if (!strikerSel || !nonStrikerSel) { setMessage('Set striker and non-striker first.'); return; }
      const batRoster = battingTeamSel==='team1' ? (team1Roster||[]) : (team2Roster||[]);
      const s = batRoster.find(p => (p.id||p.playerId)===strikerSel);
      const n = batRoster.find(p => (p.id||p.playerId)===nonStrikerSel);
      // Update innings flags as well
      const { innings, idx } = getInningsCopy();
      const inn = innings[idx];
      if (Array.isArray(inn.batting)) {
        inn.batting.forEach(x => { x.isOnStrike = false; x.isNonStrike = false; });
        const sb = inn.batting.find(x => (x.playerId=== (n?.id||n?.playerId) || x.id=== (n?.id||n?.playerId)));
        const nb2 = inn.batting.find(x => (x.playerId=== (s?.id||s?.playerId) || x.id=== (s?.id||s?.playerId)));
        if (sb) sb.isOnStrike = true;
        if (nb2) nb2.isNonStrike = true;
      }
      await persistMatch({
        currentStrikerId: n ? (n.id||n.playerId) : '',
        currentStrikerName: n ? n.name : '',
        currentNonStrikerId: s ? (s.id||s.playerId) : '',
        currentNonStrikerName: s ? s.name : '',
        strikeSwapTick: (currentMatch?.strikeSwapTick||0) + 1,
        innings,
      });
      setStrikerSel(n ? (n.id||n.playerId) : '');
      setNonStrikerSel(s ? (s.id||s.playerId) : '');
      setMessage('Strike swapped.');
    } catch (e) {
      setMessage('Error swapping strike: ' + (e?.message || String(e)));
    }
  };

  // Wicket workflow: open modal, then commit ball and lastWicket details
  const onWicketClick = () => {
    const batKey = battingTeamSel === 'team2' ? 'team2' : 'team1';
    setWicketBatter(strikerSel || '');
    setWicketType('bowled');
    setWicketFielder('');
    setShowWicketModal(true);
  };

  const commitWicket = async () => {
    try {
      if (!wicketBatter || !wicketType) { setMessage('Select batter and dismissal type.'); return; }
      // First, record the wicket ball (advances ball, increments wickets)
      // We briefly inject 'W' chip path: mimic recordBall for W only
      const t1 = currentMatch?.team1 || { runs: 0, wickets: 0 };
      const t2 = currentMatch?.team2 || { runs: 0, wickets: 0 };
      const battingKey = (currentMatch?.battingTeam === 'team2') ? 'team2' : 'team1';
      // Guard for brand-new innings: force 0.0 as starting over
      const { innings, idx } = getInningsCopy();
      const inn = innings[idx];
      let prevOver = Number(currentMatch?.currentOver) || 0;
      let prevBall = Number(currentMatch?.currentBall) || 0;
      const isNewInnings = ((inn?.total?.overs === '0.0' || inn?.total?.overs === '0' || !inn?.total?.overs) && Array.isArray(currentMatch?.recentBalls) && currentMatch.recentBalls.length === 0);
      if (isNewInnings) { prevOver = 0; prevBall = 0; }
      const prev = {
        team1: { runs: t1.runs || 0, wickets: t1.wickets || 0 },
        team2: { runs: t2.runs || 0, wickets: t2.wickets || 0 },
        over: prevOver,
        ball: prevBall,
        recentLen: Array.isArray(currentMatch?.recentBalls) ? currentMatch.recentBalls.length : 0,
      };
      const next = {
        team1: { ...t1 },
        team2: { ...t2 },
        currentOver: prev.over,
        currentBall: prev.ball,
        recentBalls: Array.isArray(currentMatch?.recentBalls) ? [...currentMatch.recentBalls, 'W'] : ['W'],
      };
  if (battingKey === 'team1') next.team1.wickets = Math.max(0, Math.min(maxWickets, (t1.wickets || 0) + 1));
  else next.team2.wickets = Math.max(0, Math.min(maxWickets, (t2.wickets || 0) + 1));
      // advance legal ball
      const b = (prev.ball || 0) + 1;
      if (b >= 6) { next.currentBall = 0; next.currentOver = (prev.over || 0) + 1; }
      else { next.currentBall = b; next.currentOver = prev.over || 0; }

      // Innings updates: striker faced one ball and is out; bowler balls++, and wickets++ except run out
  // inn already available
      const striker = findOrAddBatter(inn, strikerSel, currentMatch?.currentStrikerName || '');
      const nonStriker = findOrAddBatter(inn, nonStrikerSel, currentMatch?.currentNonStrikerName || '');
      const bwEntry2 = findOrAddBowler(inn, bowlerSel, currentMatch?.currentBowlerName || '');
      if (typeof bwEntry2._thisOverRuns !== 'number') bwEntry2._thisOverRuns = 0;
      // Count legal delivery for bowler
      bwEntry2.balls = (bwEntry2.balls || 0) + 1;
      // Determine who is out
      const outIsStriker = wicketBatter === strikerSel;
      const outBatter = outIsStriker ? striker : nonStriker;
      // Ball faced only by striker when striker is out; otherwise non-striker out without facing
      if (outIsStriker) striker.balls = (striker.balls || 0) + 1;
      if (wicketType !== 'run out') bwEntry2.wickets = (bwEntry2.wickets || 0) + 1;
      outBatter.isOut = true;
      const fName = (wicketType==='caught'||wicketType==='run out'||wicketType==='stumped')
        ? (((battingTeamSel==='team1'? team2Roster: team1Roster).find(p=> (p.id||p.playerId)===wicketFielder)?.name) || '')
        : '';
      outBatter.howOut = { type: wicketType, bowler: currentMatch?.currentBowlerName || '', fielder: fName };
      // Wicket ball with no runs counts as a dot
      bwEntry2.dots = (bwEntry2.dots || 0) + 1;
      // Over finished check for maiden
      if (next.currentBall === 0) {
        if ((bwEntry2._thisOverRuns || 0) === 0) {
          bwEntry2.maidens = (bwEntry2.maidens || 0) + 1;
        }
        bwEntry2._thisOverRuns = 0;
      }
      // Update totals
      const totalRuns = (battingKey === 'team1') ? next.team1.runs : next.team2.runs;
      const totalWickets = (battingKey === 'team1') ? next.team1.wickets : next.team2.wickets;
      inn.total = { ...(inn.total||{}), runs: totalRuns, wickets: totalWickets, overs: `${next.currentOver}.${next.currentBall}`, extras: (inn.total?.extras || { wides:0,noBalls:0,byes:0,legByes:0,penalties:0 }) };
      // Fall of wickets tracking per-innings
      if (!Array.isArray(inn.fow)) inn.fow = [];
  const outNameForFow = outIsStriker ? (striker.name) : (nonStriker.name);
  inn.fow.push({ score: totalRuns, wicket: totalWickets, over: `${next.currentOver}.${next.currentBall}`, batter: outNameForFow });

      // Persist base wicket update
      await persistMatch({
        team1: next.team1,
        team2: next.team2,
        currentOver: next.currentOver,
        currentBall: next.currentBall,
        recentBalls: next.recentBalls,
        innings,
        lastUpdated: new Date(),
      });

      setUndoStack((prevStack) => [{ prev }, ...prevStack].slice(0,3));

      // Now persist lastWicket details
      const batRoster = (battingTeamSel === 'team2' ? team2Roster : team1Roster) || [];
      const fieldRoster = (battingTeamSel === 'team2' ? team1Roster : team2Roster) || [];
  const batter = batRoster.find(p => (p.id||p.playerId) === wicketBatter);
  const fldBowler = fieldRoster.find(p => (p.id||p.playerId) === bowlerSel);
      const fielder = fieldRoster.find(p => (p.id||p.playerId) === wicketFielder);
      const lastWicket = {
        batterId: batter ? (batter.id||batter.playerId) : wicketBatter,
        batterName: batter ? batter.name : (currentMatch?.currentStrikerName || ''),
        type: wicketType,
  bowlerId: fldBowler ? (fldBowler.id||fldBowler.playerId) : (currentMatch?.currentBowlerId || ''),
  bowlerName: fldBowler ? fldBowler.name : (currentMatch?.currentBowlerName || ''),
        fielderId: fielder ? (fielder.id||fielder.playerId) : (wicketType==='caught' || wicketType==='run out' || wicketType==='stumped' ? wicketFielder : ''),
        fielderName: fielder ? fielder.name : '',
        over: next.currentOver,
        ball: next.currentBall,
      };
  await persistMatch({ lastWicket });
      setShowWicketModal(false);
      // If team is all out, do not prompt for a new batsman
      if (totalWickets >= maxWickets) {
        setShowNewBatsmanModal(false);
        setMessage('Wicket recorded. All out.');
      } else {
        // Open new batsman selection modal; determine who was out (striker or non-striker)
        const role = (wicketBatter === strikerSel) ? 'striker' : 'non-striker';
        setOutRole(role);
        setNewBatsmanId('');
        setShowNewBatsmanModal(true);
        setMessage('Wicket recorded. Select new batsman.');
      }

      // Auto completion check (all out or over finished)
      await maybeAutoAdvanceOrComplete(next, innings);
    } catch (e) {
      setMessage('Error saving wicket: ' + (e?.message || String(e)));
    }
  };

  // Compute candidates for new batsman (rest of batting lineup)
  const newBatsmanCandidates = () => {
    const roster = battingTeamSel==='team1' ? (team1Roster||[]) : (team2Roster||[]);
    const inn = (Array.isArray(currentMatch?.innings) ? currentMatch.innings.find(i=> i.teamKey === (battingTeamSel==='team2'?'team2':'team1')) : null);
    // Exclude anyone who has already batted in this innings (cannot bat again), plus the out batter and the other current batter
    const battedIds = new Set(Array.isArray(inn?.batting) ? inn.batting.map(b=> b.playerId || b.id).filter(Boolean) : []);
    const excludeIds = new Set([wicketBatter, outRole==='striker'? nonStrikerSel : strikerSel].filter(Boolean));
    return roster.filter(p => !battedIds.has(p.id||p.playerId) && !excludeIds.has(p.id||p.playerId));
  };

  // Confirm new batsman selection and update striker/non-striker accordingly
  const confirmNewBatsman = async () => {
    try {
      if (!newBatsmanId) { setMessage('Select a new batsman.'); return; }
      const roster = battingTeamSel==='team1' ? (team1Roster||[]) : (team2Roster||[]);
      const nb = roster.find(p => (p.id||p.playerId)===newBatsmanId);
      if (!nb) { setMessage('Player not found.'); return; }
      const updates = {};
      if (outRole === 'striker') {
        updates.currentStrikerId = nb.id||nb.playerId;
        updates.currentStrikerName = nb.name;
        setStrikerSel(nb.id||nb.playerId);
      } else {
        updates.currentNonStrikerId = nb.id||nb.playerId;
        updates.currentNonStrikerName = nb.name;
        setNonStrikerSel(nb.id||nb.playerId);
      }
      // Ensure batter exists in innings batting list (creates with 0/0)
      const { innings, idx } = getInningsCopy();
      const inn = innings[idx];
      findOrAddBatter(inn, nb.id||nb.playerId, nb.name);
      // Update flags for new striker/non-striker
      if (Array.isArray(inn.batting)) {
        inn.batting.forEach(x => { x.isOnStrike = false; x.isNonStrike = false; });
        const sid = updates.currentStrikerId || (currentMatch?.currentStrikerId || '');
        const nid = updates.currentNonStrikerId || (currentMatch?.currentNonStrikerId || '');
        const sb = inn.batting.find(x => (x.playerId===sid || x.id===sid));
        const nb2 = inn.batting.find(x => (x.playerId===nid || x.id===nid));
        if (sb) sb.isOnStrike = true;
        if (nb2) nb2.isNonStrike = true;
      }
      await persistMatch({ ...updates, innings });
      setShowNewBatsmanModal(false);
      setMessage('New batsman set.');
    } catch (e) {
      setMessage('Error setting new batsman: ' + (e?.message || String(e)));
    }
  };

  const undoOne = async () => {
    if (!currentMatch || undoStack.length === 0) return;
    try {
      const [{ prev }, ...rest] = undoStack;
      const rb = Array.isArray(currentMatch?.recentBalls) ? currentMatch.recentBalls.slice(0, prev.recentLen) : [];
      await persistMatch({
        team1: { ...(currentMatch?.team1||{}), runs: prev.team1.runs, wickets: prev.team1.wickets },
        team2: { ...(currentMatch?.team2||{}), runs: prev.team2.runs, wickets: prev.team2.wickets },
        currentOver: prev.over,
        currentBall: prev.ball,
        recentBalls: rb,
        lastUpdated: new Date(),
      });
      setUndoStack(rest);
      setMessage('Undid last ball.');
    } catch (e) {
      setMessage('Error undoing: ' + (e?.message || String(e)));
    }
  };

  const undoThree = async () => {
    for (let i = 0; i < 3; i++) {
      if (undoStack.length === 0) break;
      await undoOne();
    }
  };

  const swapTeams = () => {
    setTeam1(team2);
    setTeam2(team1);
  };

  const createMatch = async (e) => {
    e.preventDefault();
    if (!isUmpire) {
      setMessage('Access denied: Only an umpire can create matches.');
      return;
    }
    if (!team1 || !team2 || team1 === team2) {
      setMessage('Please choose two different teams.');
      return;
    }
    try {
      setLoading(true);
      setMessage('');
      const t1Obj = (Array.isArray(teamOptions) ? teamOptions.find(t=> t.name === team1) : null) || { name: team1 };
      const t2Obj = (Array.isArray(teamOptions) ? teamOptions.find(t=> t.name === team2) : null) || { name: team2 };
      const payload = {
        title: `${team1} vs ${team2}`,
        date,
        venue,
        venueMapUrl: venueMapUrl || null,
  totalOvers: parseInt(totalOvers) || 20,
  numPlayers: parseInt(playersPerSideSetup) || 11,
  playersPerSide: parseInt(playersPerSideSetup) || 11,
        team1: { name: t1Obj.name, logoUrl: t1Obj.logoUrl || t1Obj.logo, runs: 0, wickets: 0, overs: 0 },
        team2: { name: t2Obj.name, logoUrl: t2Obj.logoUrl || t2Obj.logo, runs: 0, wickets: 0, overs: 0 },
        status: 'upcoming',
        currentOver: 0,
        currentBall: 0,
        recentBalls: [],
        result: null,
        lastUpdated: new Date(),
      };
      const ref = await addDoc(collection(db, 'matches'), payload);
      if (makeCurrent) {
        await setDoc(doc(db, 'matches', 'current-match'), { ...payload, id: ref.id, status: 'upcoming', lastUpdated: new Date() });
      }
      setCreatedId(ref.id);
      setMessage('Match created successfully.');
    } catch (e) {
      setMessage('Error creating match: ' + (e?.message || String(e)));
    } finally {
      setLoading(false);
    }
  };

  const setStatus = async (matchId, status) => {
    try {
      await updateDoc(doc(db, 'matches', matchId), { status });
      setMessage(`Status set to '${status}'.`);
    } catch (e) {
      setMessage('Error updating status: ' + (e?.message || String(e)));
    }
  };

  const setAsCurrent = async (matchDoc) => {
    try {
      // Preserve the actual match id on the shadow doc so future updates also write to the real match document
      const payload = { ...matchDoc };
      await setDoc(doc(db, 'matches', 'current-match'), { ...payload, id: matchDoc.id, lastUpdated: new Date() });
      setMessage(`'${matchDoc.title}' set as current match.`);
    } catch (e) {
      setMessage('Error setting current match: ' + (e?.message || String(e)));
    }
  };

  const setCurrentAndLive = async (matchDoc) => {
    try {
      // Keep the id to allow persistMatch() to update the underlying match doc during live scoring
      const payload = { ...matchDoc };
      await setDoc(doc(db, 'matches', 'current-match'), { ...payload, id: matchDoc.id, status: 'live', lastUpdated: new Date() });
      await updateDoc(doc(db, 'matches', matchDoc.id), { status: 'live' });
      setMessage(`'${matchDoc.title}' set as current & live.`);
    } catch (e) {
      setMessage('Error setting current & live: ' + (e?.message || String(e)));
    }
  };

  // Begin editing a match inline
  const beginEditMatch = (m) => {
    setEditingId(m.id);
    setEditTitle(m.title || `${m?.team1?.name||'Team 1'} vs ${m?.team2?.name||'Team 2'}`);
    // normalize date to YYYY-MM-DD if possible
    const d = typeof m.date === 'string' ? m.date : (m?.date?.toDate ? m.date.toDate().toISOString().slice(0,10) : (m?.date?.seconds ? new Date(m.date.seconds*1000).toISOString().slice(0,10) : ''));
    setEditDate(d || '');
    setEditVenue(m.venue || '');
    setEditOvers(String(m.totalOvers || 20));
  };

  const cancelEditMatch = () => {
    setEditingId('');
    setEditTitle('');
    setEditDate('');
    setEditVenue('');
    setEditOvers('');
  };

  const saveEditMatch = async () => {
    if (!editingId) return;
    try {
      const updates = {
        title: editTitle,
        date: editDate,
        venue: editVenue,
        totalOvers: parseInt(editOvers)||20,
        lastUpdated: new Date(),
      };
      await updateDoc(doc(db,'matches', editingId), updates);
      // keep shadow in sync if this is the current match
      if (currentMatch && (currentMatch.id === editingId || (!currentMatch.id && editingId === 'current-match'))) {
        await updateDoc(doc(db,'matches','current-match'), updates);
      }
      setMessage('Match updated.');
    } catch (e) {
      setMessage('Error updating match: ' + (e?.message || String(e)));
    } finally {
      cancelEditMatch();
    }
  };

  const deleteMatchConfirm = async (m) => {
    const isCurrent = !!(currentMatch && (currentMatch.id === m.id || (!currentMatch.id && m.id === 'current-match')));
    if (isCurrent && (m.status === 'live' || m.status === 'break')) {
      alert('Cannot delete the active live match. Please end or reset it first.');
      return;
    }
    const ok = window.confirm(`Delete match "${m.title || m.id}"? This cannot be undone.`);
    if (!ok) return;
    try {
      await deleteDoc(doc(db,'matches', m.id));
      // If we deleted the current match, also clear the shadow doc
      if (isCurrent) {
        await setDoc(doc(db,'matches','current-match'), { status: 'upcoming', lastUpdated: new Date() });
      }
      setMessage('Match deleted.');
    } catch (e) {
      setMessage('Error deleting match: ' + (e?.message || String(e)));
    }
  };

  // Finalize match and update cumulative player stats in 'players' and 'playerProfiles'
  const finalizeMatchAndUpdateStats = async () => {
    try {
      const inns = Array.isArray(currentMatch?.innings) ? currentMatch.innings : [];
      const t1Roster = Array.isArray(currentMatch?.team1?.players) ? currentMatch.team1.players : [];
      const t2Roster = Array.isArray(currentMatch?.team2?.players) ? currentMatch.team2.players : [];
      const playedIds = new Set([...t1Roster, ...t2Roster].map(p => p.id||p.playerId).filter(Boolean));
      const agg = {}; // per-player aggregates for this match
      inns.forEach(inn => {
        const batting = Array.isArray(inn.batting) ? inn.batting : [];
        batting.forEach(b => {
          const pid = b.playerId || b.id; if (!pid) return;
          if (!agg[pid]) agg[pid] = { batRuns:0, batBalls:0, fours:0, sixes:0, hs:0, bowlWkts:0, bowlBalls:0, bowlRuns:0, dots:0, maidens:0, best:0 };
          agg[pid].batRuns += (parseInt(b.runs)||0);
          agg[pid].batBalls += (parseInt(b.balls)||0);
          agg[pid].fours += (parseInt(b.fours)||0);
          agg[pid].sixes += (parseInt(b.sixes)||0);
          agg[pid].hs = Math.max(agg[pid].hs, (parseInt(b.runs)||0));
        });
        const bowling = Array.isArray(inn.bowling) ? inn.bowling : [];
        bowling.forEach(bw => {
          const pid = bw.playerId || bw.id; if (!pid) return;
          if (!agg[pid]) agg[pid] = { batRuns:0, batBalls:0, fours:0, sixes:0, hs:0, bowlWkts:0, bowlBalls:0, bowlRuns:0, dots:0, maidens:0, best:0 };
          const wk = parseInt(bw.wickets)||0;
          agg[pid].bowlWkts += wk;
          agg[pid].bowlBalls += (parseInt(bw.balls)||0);
          agg[pid].bowlRuns += (parseInt(bw.runsConceded)||0);
          agg[pid].dots += (parseInt(bw.dots)||0);
          agg[pid].maidens += (parseInt(bw.maidens)||0);
          agg[pid].best = Math.max(agg[pid].best, wk);
        });
      });

      // Update each player: players (increments) and playerProfiles (absolute totals + rates)
      for (const pid of playedIds) {
        const a = agg[pid] || { batRuns:0, batBalls:0, fours:0, sixes:0, hs:0, bowlWkts:0, bowlBalls:0, bowlRuns:0, dots:0, maidens:0, best:0 };
        // Read existing players doc to compute derived rates/bands for fantasy points
        let prevPlayers = {};
        try {
          const pSnap = await getDoc(doc(db, 'players', pid));
          if (pSnap.exists()) prevPlayers = pSnap.data() || {};
        } catch {}
        const plRuns = (parseInt(prevPlayers.runs)||0) + a.batRuns;
        const plBallsFaced = (parseInt(prevPlayers.ballsFaced)||0) + a.batBalls;
        const plWkts = (parseInt(prevPlayers.wickets)||0) + a.bowlWkts;
        const plBallsBowled = (parseInt(prevPlayers.ballsBowled)||0) + a.bowlBalls;
        const plOvers = plBallsBowled > 0 ? (plBallsBowled/6) : 0;
        const plRunsConc = (parseInt(prevPlayers.runsConceded)||0) + a.bowlRuns;
        const plDotBalls = (parseInt(prevPlayers.dotBalls)||0) + a.dots;
        const plMaidens = (parseInt(prevPlayers.maidens)||0) + a.maidens;
        const plFours = (parseInt(prevPlayers.fours)||0) + a.fours;
        const plSixes = (parseInt(prevPlayers.sixes)||0) + a.sixes;
        const plStrike = plBallsFaced > 0 ? (plRuns * 100) / plBallsFaced : null;
        const plEco = plOvers > 0 ? (plRunsConc / plOvers) : null;
        const plHS = Math.max(parseInt(prevPlayers.highestScore)||0, a.hs||0);
        const plBest = Math.max(parseInt(prevPlayers.bestWickets)||0, a.best||0);
        try {
          await updateDoc(doc(db, 'players', pid), {
            matches: increment(1),
            runs: plRuns,
            wickets: plWkts,
            fours: plFours,
            sixes: plSixes,
            ballsFaced: plBallsFaced,
            ballsBowled: plBallsBowled,
            oversBowled: plOvers,
            runsConceded: plRunsConc,
            dotBalls: plDotBalls,
            maidens: plMaidens,
            highestScore: plHS,
            bestWickets: plBest,
            strikeRate: plStrike != null ? Math.round(plStrike * 100) / 100 : null,
            economy: plEco != null ? Math.round(plEco * 100) / 100 : null,
          });
        } catch {}

        // Read profile to compute derived rates and maxima; create if missing baseline
        let prev = {};
        try {
          const snap = await getDoc(doc(db, 'playerProfiles', pid));
          if (snap.exists()) prev = snap.data() || {};
        } catch {}

        const totalRuns = (parseInt(prev.totalRuns)||0) + a.batRuns;
        const totalBallsFaced = (parseInt(prev.ballsFaced)||0) + a.batBalls;
        const totalFours = (parseInt(prev.fours)||0) + a.fours;
        const totalSixes = (parseInt(prev.sixes)||0) + a.sixes;
        const highestScore = Math.max(parseInt(prev.highestScore)||0, a.hs||0);

        const totalWickets = (parseInt(prev.totalWickets)||0) + a.bowlWkts;
        const ballsBowledTotal = (parseInt(prev.ballsBowled)||0) + a.bowlBalls;
        const oversBowled = ballsBowledTotal > 0 ? (ballsBowledTotal/6) : 0;
        const runsConcededTotal = (parseInt(prev.runsConceded)||0) + a.bowlRuns;
        const dotBalls = (parseInt(prev.dotBalls)||0) + a.dots;
        const maidens = (parseInt(prev.maidens)||0) + a.maidens;
        const bestWickets = Math.max(parseInt(prev.bestWickets)||0, a.best||0);
        const strikeRate = totalBallsFaced > 0 ? (totalRuns * 100) / totalBallsFaced : null;
        const economy = oversBowled > 0 ? (runsConcededTotal / oversBowled) : null;

        const profileUpdates = {
          totalMatches: increment(1),
          totalRuns,
          ballsFaced: totalBallsFaced,
          fours: totalFours,
          sixes: totalSixes,
          highestScore,
          totalWickets,
          ballsBowled: ballsBowledTotal,
          oversBowled,
          runsConceded: runsConcededTotal,
          dotBalls,
          maidens,
          bestWickets,
          // Store rounded rates to 2 decimals for display consistency
          strikeRate: strikeRate != null ? Math.round(strikeRate * 100) / 100 : null,
          economy: economy != null ? Math.round(economy * 100) / 100 : null,
        };
        try {
          await updateDoc(doc(db, 'playerProfiles', pid), profileUpdates);
        } catch {
          try { await setDoc(doc(db, 'playerProfiles', pid), profileUpdates, { merge: true }); } catch {}
        }
      }
      // Unlock teams in Firestore after match completion
      const t1 = currentMatch?.team1 ? { ...currentMatch.team1, rosterLocked: false } : { rosterLocked: false };
      const t2 = currentMatch?.team2 ? { ...currentMatch.team2, rosterLocked: false } : { rosterLocked: false };
      await persistMatch({ team1: t1, team2: t2 });
      // Reset control form selections after match completion
      resetControlFormSelections();
    } catch (e) {
      console.warn('Error updating player stats:', e);
    }
  };

  // Helper function to reset all control panel selections
  const resetControlFormSelections = () => {
    setBattingTeamSel('');
    setStrikerSel('');
    setNonStrikerSel('');
    setBowlerSel('');
    setWicketBatter('');
    setWicketType('bowled');
    setWicketFielder('');
    setNewBatsmanId('');
    setOutRole('striker');
    setUndoStack([]);
    // Reset team rosters and locks
    setTeam1Roster([]);
    setTeam2Roster([]);
    setT1Locked(false);
    setT2Locked(false);
    // Reset override fields
    setOvrT1Runs('');
    setOvrT1Wkts('');
    setOvrT2Runs('');
    setOvrT2Wkts('');
    setOvrOver('');
    setOvrBall('');
  };

  const createPlayer = async (e) => {
    e.preventDefault();
    if (!isUmpire) { setMessage('Access denied: Only an umpire can create players.'); return; }
    if (!pName.trim()) { setMessage('Error: Player name is required.'); return; }
    const ageNum = parseInt(pAge, 10);
    if (!Number.isFinite(ageNum) || ageNum < 0) { setMessage('Error: Provide a valid age.'); return; }
    const jerseyNum = parseInt(pJerseyNumber, 10);
    if (pJerseyNumber && (!Number.isFinite(jerseyNum) || jerseyNum < 0)) { setMessage('Error: Invalid jersey number.'); return; }
    try {
      setLoading(true);
      setMessage('');
      // Only persist avatar if it's a custom uploaded URL (not the gender default)
      const defaultMale = '/Teams/imgImage8.png';
      const defaultFemale = '/Teams/imgImage48.png';
      const avatarVal = (pAvatar || '').trim();
      const isDefaultAvatar = avatarVal === defaultMale || avatarVal === defaultFemale;
      const payload = {
        name: pName.trim(),
        age: ageNum,
        gender: pGender,
        ...(avatarVal && !isDefaultAvatar ? { avatar: avatarVal } : {}),
        role: pRole,
        battingStyle: pBattingStyle,
        // default stats so Players page shows values
        matches: 0,
        runs: 0,
        wickets: 0,
        strikeRate: 0,
        createdAt: new Date(),
        // Default 3D model placeholder until a custom one is uploaded
        modelUrl: '/model.glb',
      };
      if (Number.isFinite(jerseyNum)) payload.jerseyNumber = jerseyNum;
      if (pStatus === 'unavailable') payload.status = 'unavailable';
      await addDoc(collection(db, 'players'), payload);
      setMessage('Player created successfully.');
  setPName(''); setPAge(''); setPGender('male'); setPAvatar('/Teams/imgImage8.png'); setPStatus('available'); setPRole('batsman'); setPBattingStyle('right-handed');
      setPJerseyNumber('');
    } catch (e) {
      setMessage('Error creating player: ' + (e?.message || String(e)));
    } finally {
      setLoading(false);
    }
  };

  if (!isUmpire) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 flex flex-col items-center justify-center">
        <div className="max-w-lg w-full bg-white rounded-lg shadow-md p-8 text-center">
          <h1 className="text-3xl font-bold mb-4">Umpire Access Only</h1>
          <p className="mb-4 text-gray-700">You do not have permission to access this page.</p>
          <div className="mb-2 text-sm text-gray-500">Debug info:</div>
          <pre className="bg-gray-100 rounded p-2 text-xs text-left overflow-x-auto mb-4">{JSON.stringify(userProfile, null, 2)}</pre>
          <div className="text-xs text-gray-400">Ask an admin to grant you umpire access (isUmpire) or use an admin account.</div>
        </div>
      </div>
    );
  }

  

  const createTeam = async (e) => {
    e.preventDefault();
    if (!isUmpire) { setMessage('Access denied: Only an umpire can create teams.'); return; }
    if (!tName.trim()) { setMessage('Error: Team name is required.'); return; }
    try {
      setTLoading(true);
      let logoToSave = tLogoUrl || '';
      // If a file was selected but not yet converted, convert it now.
      if (tLogoFile && !logoToSave) {
        setTUploading(true);
        try {
          const dataUrl = await readImageInline(tLogoFile);
          logoToSave = dataUrl || '';
          setTLogoUrl(logoToSave);
          try { setTLogoPreview(logoToSave); } catch {}
        } catch (err) {
          console.error('Team logo read failed', err);
          setMessage('Error reading logo: ' + (err?.message || String(err)));
        } finally {
          setTUploading(false);
        }
      }
      const payload = { name: tName.trim(), logoUrl: logoToSave || '' };
      await addDoc(collection(db, 'teams'), payload);
      setMessage('Team created successfully.');
      try { window.alert('Team created successfully.'); } catch {}
      setTName('');
      setTLogoUrl('');
      setTLogoFile(null);
      setTLogoPreview('');
    } catch (e) {
      setMessage('Error creating team: ' + (e?.message || String(e)));
    } finally {
      setTLoading(false);
    }
  };

  const beginEditTeam = (t) => {
    setTeamEditingId(t.id);
    setTeName(t.name || '');
    setTeLogoUrl(t.logoUrl || t.logo || '');
  };

  const saveEditTeam = async (id) => {
    if (!id) return;
    try {
      await updateDoc(doc(db, 'teams', id), { name: teName, logoUrl: teLogoUrl });
      setMessage('Team updated.');
      try { window.alert('Team updated successfully.'); } catch {}
    } catch (e) {
      setMessage('Error updating team: ' + (e?.message || String(e)));
    } finally {
      setTeamEditingId('');
    }
  };

  const deleteTeamConfirm = async (t) => {
    if (!t?.id) return;
    const ok = window.confirm(`Delete team "${t.name}"? This cannot be undone.`);
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'teams', t.id));
      setMessage('Team deleted.');
    } catch (e) {
      setMessage('Error deleting team: ' + (e?.message || String(e)));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-gray-900">Umpire</h1>
          <p className="text-gray-600">Quick setup and match management</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-4 overflow-x-auto whitespace-nowrap px-3" aria-label="Tabs">
              {[{id:'setup',name:'Quick Setup'},{id:'matches',name:'Matches'},{id:'players',name:'Players'},{id:'teams',name:'Teams'},{id:'control',name:'Control'}].map(t => (
                <button
                  key={t.id}
                  onClick={()=>setActiveTab(t.id)}
                  className={`shrink-0 whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm ${activeTab===t.id? 'border-brand-primary text-brand-primary':'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                >
                  {t.name}
                </button>
              ))}
            </nav>
          </div>
          <div className="p-4 sm:p-6">
            {activeTab === 'setup' && (
              <div className="max-w-3xl mx-auto">
                <div className="text-center mb-2 sm:mb-4">
                  <p className="text-gray-600">Create a quick match by selecting any two teams</p>
                </div>

        {message && (
          <div className={`mb-6 px-4 py-3 rounded ${message.toLowerCase().startsWith('error') ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-green-100 text-green-800 border border-green-300'}`}>
            {message}
            {createdId && (
              <div className="mt-2 text-sm">
                <a className="underline" href={`/scorecard/${createdId}`}>View scorecard</a>
                <span className="mx-2">•</span>
                <a className="underline" href={`/match/${createdId}`}>Match details</a>
              </div>
            )}
          </div>
        )}

        <form onSubmit={createMatch} className="bg-white rounded-lg shadow p-6 space-y-4">
          {teamOptions.length === 0 && (
            <div className="mb-3 p-3 rounded border border-yellow-300 bg-yellow-50 text-yellow-800 text-sm">
              No teams found. Please create teams in the Teams tab before creating a match.
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Team 1</label>
              <select className="w-full border rounded px-3 py-2" value={team1} onChange={(e)=>{ setTeam1(e.target.value); if (e.target.value === team2) setTeam2(otherOf(e.target.value)); }} disabled={teamOptions.length===0}>
                {teamOptions.length===0 ? (
                  <option value="">No teams available</option>
                ) : (
                  teamOptions.map(t=> <option key={t.id||t.name} value={t.name}>{t.name}</option>)
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Team 2</label>
              <select className="w-full border rounded px-3 py-2" value={team2} onChange={(e)=>{ setTeam2(e.target.value); if (e.target.value === team1) setTeam1(otherOf(e.target.value)); }} disabled={teamOptions.length<2}>
                {teamOptions.length===0 ? (
                  <option value="">No teams available</option>
                ) : (
                  teamOptions.map(t=> <option key={t.id||t.name} value={t.name}>{t.name}</option>)
                )}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button type="button" onClick={swapTeams} className="text-sm text-blue-700 underline">Swap</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Venue</label>
              <input type="text" className="w-full border rounded px-3 py-2" value={venue} onChange={e=>setVenue(e.target.value)} placeholder="Ground / City" required />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Date</label>
              <input type="date" className="w-full border rounded px-3 py-2" value={date} onChange={e=>setDate(e.target.value)} required />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Google Maps Location <span className="text-gray-500 text-xs">(optional)</span>
            </label>
            <input 
              type="url" 
              className="w-full border rounded px-3 py-2" 
              value={venueMapUrl} 
              onChange={e=>setVenueMapUrl(e.target.value)} 
              placeholder="https://maps.google.com/?q=..." 
            />
            <p className="text-xs text-gray-500 mt-1">
              Paste Google Maps link (will be clickable for users on mobile)
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Total Overs</label>
              <input type="number" min={1} max={50} className="w-full border rounded px-3 py-2" value={totalOvers} onChange={e=>setTotalOvers(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Players per Side</label>
              <input type="number" min={5} max={11} className="w-full border rounded px-3 py-2" value={playersPerSideSetup} onChange={e=>setPlayersPerSideSetup(e.target.value)} required />
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={makeCurrent} onChange={e=>setMakeCurrent(e.target.checked)} />
                <span className="text-sm">Set as Current</span>
              </label>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button type="submit" disabled={loading || teamOptions.length<2 || !team1 || !team2 || team1===team2} className="btn-primary disabled:opacity-50">
              {loading ? 'Creating…' : 'Create Match'}
            </button>
          </div>
        </form>
              </div>
            )}

            {activeTab === 'teams' && (
              <div className="max-w-5xl mx-auto">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Manage Teams</h2>
                <form onSubmit={createTeam} className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                    <div className="sm:col-span-1">
                      <label className="block text-sm text-gray-700 mb-1">Team Name</label>
                      <input type="text" className="w-full border rounded px-3 py-2" value={tName} onChange={e=> setTName(e.target.value)} placeholder="Enter team name" required />
                    </div>
                    <div className="sm:col-span-1">
                      <label className="block text-sm text-gray-700 mb-1">Upload Logo</label>
                      <input type="file" accept="image/*" onChange={(e)=>{
                        const file = e.target.files && e.target.files[0];
                        if (!file) return;
                        try {
                          try { const localUrl = URL.createObjectURL(file); setTLogoPreview(localUrl); } catch {}
                          setTLogoFile(file);
                          setMessage('Logo selected. It will be uploaded when you create the team.');
                        } catch (err) {
                          setMessage('Error preparing logo: ' + (err?.message || String(err)));
                        }
                      }} />
                    </div>
                    <div className="sm:col-span-1 flex items-center gap-3">
                      {(tLogoPreview || tLogoUrl) ? (
                        <img src={tLogoPreview || tLogoUrl} alt="team logo preview" className="w-12 h-12 rounded border object-cover" />
                      ) : (
                        <div className="text-xs text-gray-500">No logo selected</div>
                      )}
                    </div>
                  </div>
                  <div>
                    <button type="submit" disabled={tLoading || tUploading} className="btn-primary disabled:opacity-50">{tLoading || tUploading ? 'Saving…' : 'Create Team'}</button>
                  </div>
                </form>

                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xl font-semibold">All Teams</h3>
                    <div className="text-sm text-gray-500">{Array.isArray(teams)?teams.length:0} total</div>
                  </div>
                  {(!Array.isArray(teams) || teams.length===0) ? (
                    <div className="text-sm text-gray-500">No teams yet. Create your first team above.</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {teams.map(t => {
                        const isEdit = teamEditingId === t.id;
                        return (
                          <div key={t.id||t.name} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col">
                            {!isEdit ? (
                              <>
                                <div className="flex items-center gap-3">
                                  <TeamLogo team={t} size={48} className="border" />
                                  <div>
                                    <div className="font-semibold">{t.name}</div>
                                    {/* <div className="text-xs text-gray-500 break-all">{''}</div> */}
                                  </div>
                                </div>
                              </>
                            ) : (
                              <div className="space-y-2">
                                <div>
                                  <label className="block text-xs text-gray-600">Team Name</label>
                                  <input className="w-full border rounded px-2 py-1 text-sm" value={teName} onChange={e=> setTeName(e.target.value)} />
                                </div>
                                <div className="flex items-center gap-2">
                                  <label className="text-xs text-gray-600">Upload New Logo</label>
                                  <input type="file" accept="image/*" onChange={async(e)=>{
                                    const file = e.target.files && e.target.files[0];
                                    if (!file) return;
                                    try {
                                      try { const local = URL.createObjectURL(file); setTLogoPreview(local); } catch {}
                                      const dataUrl = await readImageInline(file);
                                      setTeLogoUrl(dataUrl);
                                    } catch (err) {
                                      setMessage('Error uploading logo: ' + (err?.message || String(err)));
                                    }
                                  }} />
                                </div>
                                {(tLogoPreview || teLogoUrl) && (
                                  <div className="mt-2">
                                    <img src={tLogoPreview || teLogoUrl} alt="team logo preview" className="w-12 h-12 rounded border object-cover" />
                                  </div>
                                )}
                              </div>
                            )}
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              {!isEdit ? (
                                <>
                                  <button className="bg-yellow-50 border border-yellow-300 hover:bg-yellow-100 text-yellow-800 px-3 py-2 rounded text-sm" onClick={()=> beginEditTeam(t)}>Edit</button>
                                  <button className="bg-red-50 border border-red-300 hover:bg-red-100 text-red-700 px-3 py-2 rounded text-sm" onClick={()=> deleteTeamConfirm(t)}>Delete</button>
                                </>
                              ) : (
                                <>
                                  <button className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm" onClick={()=> saveEditTeam(t.id)}>Save</button>
                                  <button className="bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 px-3 py-2 rounded text-sm" onClick={()=> setTeamEditingId('')}>Cancel</button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'matches' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div></div>
                  <button onClick={()=>setActiveTab('setup')} className="bg-brand-primary hover:bg-brand-primaryDark text-white text-sm px-3 py-2 rounded">Add Match</button>
                </div>
                {[{title:'Live', list: groups.live}, {title:'Upcoming', list: groups.upcoming}, {title:'Completed', list: groups.completed}].map((sec) => (
                  <div key={sec.title}>
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-xl font-semibold">{sec.title}</h2>
                      <div className="text-sm text-gray-500">{sec.list.length} {sec.list.length===1?'match':'matches'}</div>
                    </div>
                    {sec.list.length === 0 ? (
                      <div className="text-sm text-gray-500 py-4">No matches.</div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {sec.list.map((m)=> {
                          const rostersReady = !!(m?.team1?.rosterLocked && m?.team2?.rosterLocked);
                          const isEditing = editingId === m.id;
                          return (
                          <div key={m.id} className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col">
                            {!isEditing ? (
                              <>
                              <p>Match id {m.id}</p>
                                <div className="text-xs text-gray-500">{m.date} • {m.venue}</div>
                                <div className="font-semibold mt-1">{m.title}</div>
                                <div className="text-sm text-gray-700 mt-1">{m.team1?.name} vs {m.team2?.name}</div>
                              </>
                            ) : (
                              <div className="grid grid-cols-1 gap-2">
                                <div>
                                  <label className="block text-xs text-gray-600">Title</label>
                                  <input className="w-full border rounded px-2 py-1 text-sm" value={editTitle} onChange={e=>setEditTitle(e.target.value)} />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-xs text-gray-600">Date</label>
                                    <input type="date" className="w-full border rounded px-2 py-1 text-sm" value={editDate} onChange={e=>setEditDate(e.target.value)} />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-600">Overs</label>
                                    <input type="number" min={1} max={50} className="w-full border rounded px-2 py-1 text-sm" value={editOvers} onChange={e=>setEditOvers(e.target.value)} />
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-600">Venue</label>
                                  <input className="w-full border rounded px-2 py-1 text-sm" value={editVenue} onChange={e=>setEditVenue(e.target.value)} />
                                </div>
                              </div>
                            )}
                            <div className="mt-2 flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-full text-xs ${m.status==='live'?'bg-red-100 text-red-700': m.status==='completed'?'bg-green-100 text-green-700': m.status==='break'?'bg-yellow-100 text-yellow-800':'bg-blue-100 text-blue-700'}`}>{(m.status||'upcoming').toUpperCase()}</span>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <select className="border rounded px-2 py-2 text-sm" value={m.status||'upcoming'} onChange={async(e)=>{ await setStatus(m.id, e.target.value); }}>
                                <option value="upcoming">Upcoming</option>
                                <option value="live">Live</option>
                                <option value="completed">Completed</option>
                                <option value="break">Break</option>
                              </select>
                              <button
                                className="bg-gray-800 hover:bg-gray-900 text-white px-3 py-2 rounded text-sm"
                                onClick={async()=> setAsCurrent(m)}
                              >Set Current</button>
                              <button
                                className={`text-white px-3 py-2 rounded text-sm ${rostersReady ? 'bg-brand-primary hover:bg-brand-primaryDark' : 'bg-gray-400 cursor-not-allowed'}`}
                                onClick={async()=> rostersReady && setCurrentAndLive(m)}
                                disabled={!rostersReady}
                                title={!rostersReady ? 'Lock both teams to go Live' : ''}
                              >Current + Live</button>
                              <button
                                className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 px-3 py-2 rounded text-sm"
                                onClick={()=> window.location.href = `/scorecard/${m.id}`}
                              >Scorecard</button>
                              {!isEditing ? (
                                <button
                                  className="bg-yellow-50 border border-yellow-300 hover:bg-yellow-100 text-yellow-800 px-3 py-2 rounded text-sm"
                                  onClick={()=> beginEditMatch(m)}
                                >Edit</button>
                              ) : (
                                <div className="grid grid-cols-2 gap-2 col-span-2">
                                  <button className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm" onClick={saveEditMatch}>Save</button>
                                  <button className="bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 px-3 py-2 rounded text-sm" onClick={cancelEditMatch}>Cancel</button>
                                </div>
                              )}
                              <button
                                className="bg-red-50 border border-red-300 hover:bg-red-100 text-red-700 px-3 py-2 rounded text-sm"
                                onClick={()=> deleteMatchConfirm(m)}
                              >Delete</button>
                            </div>
                          </div>
                        );})}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'players' && (
              <div className="max-w-5xl mx-auto">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Manage Players</h2>
                <form onSubmit={createPlayer} className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Name</label>
                      <input type="text" className="w-full border rounded px-3 py-2" value={pName} onChange={e=>setPName(e.target.value)} placeholder="Player name" required />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Age</label>
                      <input type="number" min={0} className="w-full border rounded px-3 py-2" value={pAge} onChange={e=>setPAge(e.target.value)} placeholder="Age" required />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Jersey Number (optional)</label>
                      <input type="number" min={0} className="w-full border rounded px-3 py-2" value={pJerseyNumber} onChange={e=>setPJerseyNumber(e.target.value)} placeholder="e.g. 18" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Gender</label>
                      <select className="w-full border rounded px-3 py-2" value={pGender} onChange={e=>{ const g=e.target.value; setPGender(g);
                        // If current avatar is a custom upload keep it; otherwise swap to the gender default.
                        setPAvatar(prev => {
                          if (isCustomAvatar(prev)) return prev;
                          return g==='female'? '/Teams/imgImage48.png' : '/Teams/imgImage8.png';
                        });
                        if (!isCustomAvatar(pAvatar)) setPAvatarPreview('');
                      }}>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-3">
                      <img src={pAvatarPreview || pAvatar} alt="avatar preview" className="w-12 h-12 rounded-full border object-cover" />
                      <div className="text-xs text-gray-600">Choose default avatar or upload a photo</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                    <div className="flex items-center gap-2">
                      <button type="button" className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm" onClick={()=> { setPAvatar(pGender==='female'? '/Teams/imgImage48.png' : '/Teams/imgImage8.png'); setPAvatarPreview(''); }}>Use Default Avatar</button>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="block text-sm text-gray-700">Upload Photo</label>
                      <input type="file" accept="image/*" onChange={async(e)=>{
                        const file = e.target.files && e.target.files[0];
                        if (!file) return;
                        try {
                          setPUploading(true);
                          try { const localUrl = URL.createObjectURL(file); setPAvatarPreview(localUrl); } catch {}
                          const dataUrl = await readImageInline(file);
                          setPAvatar(dataUrl);
                          setPAvatarPreview(dataUrl);
                        } catch (err) {
                          setMessage('Error uploading photo: ' + (err?.message || String(err)));
                        } finally {
                          setPUploading(false);
                        }
                      }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Role</label>
                      <select className="w-full border rounded px-3 py-2" value={pRole} onChange={e=> setPRole(e.target.value)}>
                        <option value="batsman">Batsman</option>
                        <option value="bowler">Bowler</option>
                        <option value="all-rounder">All Rounder</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Batting Style</label>
                      <select className="w-full border rounded px-3 py-2" value={pBattingStyle} onChange={e=> setPBattingStyle(e.target.value)}>
                        <option value="right-handed">Right Handed</option>
                        <option value="left-handed">Left Handed</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Status (optional)</label>
                      <select className="w-full border rounded px-3 py-2" value={pStatus} onChange={e=>setPStatus(e.target.value)}>
                        <option value="available">Available (default)</option>
                        <option value="unavailable">Unavailable</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <button type="submit" disabled={loading || pUploading} className="btn-primary disabled:opacity-50">{loading ? 'Saving…' : (pUploading ? 'Uploading photo…' : 'Create Player')}</button>
                  </div>
                </form>
                <p className="text-xs text-gray-500 mt-3">Players appear instantly under the Players tab for users.</p>

                {/* Players List */}
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xl font-semibold">All Players</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {(allPlayers||[]).map(pl => {
                      const isEdit = playerEditingId === pl.id;
                      const avatar = getPlayerAvatar(pl);
                      return (
                        <div key={pl.id} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col items-center text-center">
                          {!isEdit ? (
                            <>
                              <img src={avatar} alt={pl.name} className="w-16 h-16 rounded-full border mb-2 object-cover" />
                              <div className="font-semibold">{pl.name}</div>
                              <div className="text-xs text-gray-500">{pl.gender || 'player'}{pl.age?`, ${pl.age}`:''}</div>
                              {pl.jerseyNumber != null && pl.jerseyNumber !== '' && (
                                <div className="text-xs font-semibold text-blue-600 mt-1">#{pl.jerseyNumber}</div>
                              )}
                              {(pl.role || pl.battingStyle) && (
                                <div className="text-[11px] text-gray-600 mt-1 capitalize">
                                  {pl.role && <span className="inline-block px-2 py-[2px] rounded-full bg-gray-100 border border-gray-200 mr-1">{pl.role}</span>}
                                  {pl.battingStyle && <span className="inline-block px-2 py-[2px] rounded-full bg-gray-100 border border-gray-200">{pl.battingStyle}</span>}
                                </div>
                              )}
                              {pl.status && <div className="mt-1 text-xs px-2 py-0.5 rounded-full border inline-block capitalize">{pl.status}</div>}
                            </>
                          ) : (
                            <div className="w-full space-y-2 text-left">
                              <div>
                                <label className="block text-xs text-gray-600">Name</label>
                                <input className="w-full border rounded px-2 py-1 text-sm" value={epName} onChange={e=>setEpName(e.target.value)} />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-xs text-gray-600">Age</label>
                                  <input type="number" className="w-full border rounded px-2 py-1 text-sm" value={epAge} onChange={e=>setEpAge(e.target.value)} />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-600">Gender</label>
                                  <select className="w-full border rounded px-2 py-1 text-sm" value={epGender} onChange={e=>{ const g=e.target.value; setEpGender(g);
                                    setEpAvatar(prev => {
                                      if (isCustomAvatar(prev)) return prev;
                                      return g==='female'? '/Teams/imgImage48.png' : '/Teams/imgImage8.png';
                                    });
                                    if (!isCustomAvatar(epAvatar)) setEpAvatarPreview('');
                                  }}>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-600">Jersey #</label>
                                  <input type="number" className="w-full border rounded px-2 py-1 text-sm" value={epJerseyNumber} onChange={e=>setEpJerseyNumber(e.target.value)} placeholder="e.g. 18" />
                                </div>
                              </div>
                              <div>
                                <div className="mt-2 flex items-center gap-2">
                                  <label className="text-xs text-gray-600">Upload New Photo</label>
                                  <input type="file" accept="image/*" onChange={async(e)=>{
                                    const file = e.target.files && e.target.files[0];
                                    if (!file) return;
                                    try {
                                      try { const localUrl = URL.createObjectURL(file); setEpAvatarPreview(localUrl); } catch {}
                                      const dataUrl = await readImageInline(file);
                                      setEpAvatar(dataUrl);
                                      setEpAvatarPreview(dataUrl);
                                    } catch (err) {
                                      setMessage('Error uploading photo: ' + (err?.message || String(err)));
                                    }
                                  }} />
                                </div>
                                {(epAvatarPreview || epAvatar) && (
                                  <div className="mt-2">
                                    <img src={epAvatarPreview || epAvatar} alt="avatar preview" className="w-12 h-12 rounded-full border object-cover" />
                                  </div>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-xs text-gray-600">Role</label>
                                  <select className="w-full border rounded px-2 py-1 text-sm" value={epRole||''} onChange={e=> setEpRole(e.target.value)}>
                                    <option value="">Select</option>
                                    <option value="batsman">Batsman</option>
                                    <option value="bowler">Bowler</option>
                                    <option value="all-rounder">All Rounder</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-600">Batting Style</label>
                                  <select className="w-full border rounded px-2 py-1 text-sm" value={epBattingStyle||''} onChange={e=> setEpBattingStyle(e.target.value)}>
                                    <option value="">Select</option>
                                    <option value="right-handed">Right Handed</option>
                                    <option value="left-handed">Left Handed</option>
                                  </select>
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600">Status</label>
                                <select className="w-full border rounded px-2 py-1 text-sm" value={epStatus} onChange={e=>setEpStatus(e.target.value)}>
                                  <option value="available">Available</option>
                                  <option value="unavailable">Unavailable</option>
                                </select>
                              </div>
                            </div>
                          )}
                          <div className="mt-3 grid grid-cols-2 gap-2 w-full">
                            {!isEdit ? (
                              <>
                                <button className="bg-yellow-50 border border-yellow-300 hover:bg-yellow-100 text-yellow-800 px-3 py-2 rounded text-sm" onClick={()=>{
                                  setPlayerEditingId(pl.id);
                                  setEpName(pl.name||'');
                                  setEpAge(String(pl.age||''));
                                  setEpGender(pl.gender||'male');
                                  setEpAvatar(pl.avatar || (pl.gender==='female'?'/Teams/imgImage48.png':'/Teams/imgImage8.png'));
                                  setEpStatus(pl.status||'available');
                                  setEpJerseyNumber(String(pl.jerseyNumber || pl.jerseyNo || pl.jersey || ''));
                                  try { setEpRole(pl.role||''); setEpBattingStyle(pl.battingStyle||''); } catch {}
                                }}>Edit</button>
                                <button className="bg-red-50 border border-red-300 hover:bg-red-100 text-red-700 px-3 py-2 rounded text-sm" onClick={async()=>{
                                  if (!window.confirm(`Delete player "${pl.name}"?`)) return;
                                  try { await deleteDoc(doc(db,'players', pl.id)); setMessage('Player deleted.'); } catch(e){ setMessage('Error deleting: '+(e?.message||String(e))); }
                                }}>Delete</button>
                              </>
                            ) : (
                              <>
                                <button className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm" onClick={async()=>{
                                  try {
                                    const defaultMale = '/Teams/imgImage8.png';
                                    const defaultFemale = '/Teams/imgImage48.png';
                                    const avatarVal = (epAvatar || '').trim();
                                    const isDefaultAvatar = avatarVal === defaultMale || avatarVal === defaultFemale;
                                    const updates = { name: epName, age: parseInt(epAge)||0, gender: epGender, status: epStatus };
                                    if (typeof epRole === 'string') updates.role = epRole;
                                    if (typeof epBattingStyle === 'string') updates.battingStyle = epBattingStyle;
                                    if (epJerseyNumber) {
                                      const jn = parseInt(epJerseyNumber,10);
                                      if (Number.isFinite(jn)) updates.jerseyNumber = jn; else setMessage('Invalid jersey number (ignored).');
                                    }
                                    if (avatarVal && !isDefaultAvatar) {
                                      updates.avatar = avatarVal;
                                    } else {
                                      // If reverting to default we remove the avatar field so fallbacks apply
                                      updates.avatar = '';
                                    }
                                    await updateDoc(doc(db,'players', pl.id), updates);
                                    setMessage('Player updated.');
                                  } catch(e){ setMessage('Error updating: '+(e?.message||String(e))); }
                                  setPlayerEditingId('');
                                }}>Save</button>
                                <button className="bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 px-3 py-2 rounded text-sm" onClick={()=> setPlayerEditingId('')}>Cancel</button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'control' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Match Control</h2>
                {!currentMatch && (
                  <div className="text-sm text-gray-500">No current match set. Use Matches tab → Set Current.</div>
                )}
                {currentMatch && (
                  <>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <div><span className="font-medium">Title:</span> {currentMatch?.title}</div>
                          <div><span className="font-medium">Status:</span> {currentMatch?.status}</div>
                          <div><span className="font-medium">Venue:</span> {currentMatch?.venue}</div>
                          <div><span className="font-medium">Date:</span> {currentMatch?.date}</div>
                        </div>
                        <div>
                          <div><span className="font-medium">Over:</span> {currentMatch?.currentOver}.{currentMatch?.currentBall}</div>
                          <div><span className="font-medium">Players per side:</span> {playersPerSide}</div>
                          <div><span className="font-medium">Team 1:</span> {currentMatch?.team1?.name} - {currentMatch?.team1?.runs}/{currentMatch?.team1?.wickets}</div>
                          <div><span className="font-medium">Team 2:</span> {currentMatch?.team2?.name} - {currentMatch?.team2?.runs}/{currentMatch?.team2?.wickets}</div>
                        </div>
                      </div>
                    </div>

                    {/* Roster Editors */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h3 className="text-lg font-semibold mb-2">Team 1 Roster ({currentMatch?.team1?.name || 'Team 1'})</h3>
                      <RosterEditor
                        teamKey="team1"
                        roster={team1Roster}
                        setRoster={setTeam1Roster}
                        locked={t1Locked}
                        playersPerSide={playersPerSide}
                        allPlayers={allPlayers}
                        otherTeamRoster={team2Roster}
                      />
                      <div className="flex gap-2 mt-2 items-center">
                        {!t1Locked ? (
                          <>
                            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded" onClick={async()=>{
                              const t = currentMatch?.team1 || {}; const next = { ...t, players: team1Roster, numPlayers: team1Roster.length };
                              await updateDoc(doc(db,'matches','current-match'), { team1: next });
                              if (currentMatch?.id) await updateDoc(doc(db,'matches', currentMatch.id), { team1: next });
                              setMessage('Team 1 saved.');
                            }}>Save Team 1</button>
                            <button className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded" onClick={async()=>{
                              const t = currentMatch?.team1 || {}; const next = { ...t, players: team1Roster, numPlayers: team1Roster.length, rosterLocked: true };
                              await updateDoc(doc(db,'matches','current-match'), { team1: next });
                              if (currentMatch?.id) await updateDoc(doc(db,'matches', currentMatch.id), { team1: next });
                              setT1Locked(true); setMessage('Team 1 locked.');
                            }}>Lock Team 1</button>
                          </>
                        ) : (
                          <>
                            <span className="text-green-700 font-medium">Locked</span>
                            <button className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded" onClick={async()=>{
                              const t = currentMatch?.team1 || {}; const next = { ...t, rosterLocked: false };
                              await updateDoc(doc(db,'matches','current-match'), { team1: next });
                              if (currentMatch?.id) await updateDoc(doc(db,'matches', currentMatch.id), { team1: next });
                              setT1Locked(false);
                            }}>Edit</button>
                          </>
                        )}
                      </div>

                      <h3 className="text-lg font-semibold mt-6 mb-2">Team 2 Roster ({currentMatch?.team2?.name || 'Team 2'})</h3>
                      <RosterEditor
                        teamKey="team2"
                        roster={team2Roster}
                        setRoster={setTeam2Roster}
                        locked={t2Locked}
                        playersPerSide={playersPerSide}
                        allPlayers={allPlayers}
                        otherTeamRoster={team1Roster}
                      />
                      <div className="flex gap-2 mt-2 items-center">
                        {!t2Locked ? (
                          <>
                            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded" onClick={async()=>{
                              const t = currentMatch?.team2 || {}; const next = { ...t, players: team2Roster, numPlayers: team2Roster.length };
                              await updateDoc(doc(db,'matches','current-match'), { team2: next });
                              if (currentMatch?.id) await updateDoc(doc(db,'matches', currentMatch.id), { team2: next });
                              setMessage('Team 2 saved.');
                            }}>Save Team 2</button>
                            <button className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded" onClick={async()=>{
                              const t = currentMatch?.team2 || {}; const next = { ...t, players: team2Roster, numPlayers: team2Roster.length, rosterLocked: true };
                              await updateDoc(doc(db,'matches','current-match'), { team2: next });
                              if (currentMatch?.id) await updateDoc(doc(db,'matches', currentMatch.id), { team2: next });
                              setT2Locked(true); setMessage('Team 2 locked.');
                            }}>Lock Team 2</button>
                          </>
                        ) : (
                          <>
                            <span className="text-green-700 font-medium">Locked</span>
                            <button className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded" onClick={async()=>{
                              const t = currentMatch?.team2 || {}; const next = { ...t, rosterLocked: false };
                              await updateDoc(doc(db,'matches','current-match'), { team2: next });
                              if (currentMatch?.id) await updateDoc(doc(db,'matches', currentMatch.id), { team2: next });
                              setT2Locked(false);
                            }}>Edit</button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Toss Selection */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold mb-3">Toss</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">Winner</label>
                          <select className="w-full border rounded px-3 py-2" value={tossWinnerSel} onChange={e=> setTossWinnerSel(e.target.value)}>
                            <option value="">Select team</option>
                            <option value="team1">{currentMatch?.team1?.name || 'Team 1'}</option>
                            <option value="team2">{currentMatch?.team2?.name || 'Team 2'}</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">Decision</label>
                          <select className="w-full border rounded px-3 py-2" value={tossDecisionSel} onChange={e=> setTossDecisionSel(e.target.value)}>
                            <option value="bat">Bat</option>
                            <option value="bowl">Bowl</option>
                          </select>
                        </div>
                        <div className="flex items-end">
                          <button className="btn-primary" onClick={async()=>{
                            const toss = { winner: tossWinnerSel, decision: tossDecisionSel };
                            await updateDoc(doc(db,'matches','current-match'), { toss });
                            if (currentMatch?.id) await updateDoc(doc(db,'matches', currentMatch.id), { toss });
                            setMessage('Toss saved.');
                          }}>Save Toss</button>
                        </div>
                      </div>
                      {tossWinnerSel && (
                        <div className="text-sm text-gray-600 mt-2">
                          {(tossWinnerSel==='team1'? (currentMatch?.team1?.name||'Team 1') : (currentMatch?.team2?.name||'Team 2'))} won the toss and choose to {tossDecisionSel==='bat'?'bat':'bowl'} first.
                        </div>
                      )}
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <button onClick={async()=>{
                        if (!t1Locked || !t2Locked) { setMessage('Lock both teams before starting the match.'); return; }
                        await updateDoc(doc(db,'matches','current-match'), { status: 'live', lastUpdated: new Date() });
                        if (currentMatch?.id) await updateDoc(doc(db,'matches', currentMatch.id), { status: 'live' });
                        setMessage('Match set to Live.');
                        try { window.alert('Match set to Live successfully.'); } catch {}
                      }} className={`flex items-center justify-center space-x-2 text-white py-3 px-4 rounded ${t1Locked && t2Locked ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'}`} disabled={!t1Locked || !t2Locked}>Start Match</button>
                      <button onClick={async()=>{
                        if (!window.confirm('Are you sure you want to end the innings?')) return;
                        // If first innings, start second with target; if second, compute result
                        const battingKey = currentMatch?.battingTeam === 'team2' ? 'team2' : 'team1';
                        const otherKey = battingKey==='team1'?'team2':'team1';
                        const inns = Array.isArray(currentMatch?.innings) ? currentMatch.innings : [];
                        const hasFirstInnings = inns.some(i=> i?.teamKey === otherKey);
                        if (hasFirstInnings) {
                          if (!(currentMatch?.awards?.manOfTheMatchId)) { setMessage('Please select Man of the Match in Awards before completing the match.'); return; }
                          // Second innings -> complete match
                          const result = computeResult(inns);
                          await persistMatch({ status: 'completed', result, completedAt: new Date(), lastUpdated: new Date() });
                          await finalizeMatchAndUpdateStats();
                          setMessage('Match completed.');
                          try { window.alert('Match completed successfully.'); } catch {}
                        } else {
                          // First innings -> start second
                          await startNextInnings();
                          try { window.alert('Innings ended successfully.'); } catch {}
                        }
                      }} className="flex items-center justify-center space-x-2 bg-yellow-600 hover:bg-yellow-700 text-white py-3 px-4 rounded">End Innings</button>
                      <button onClick={async()=>{
                        if (!window.confirm('Are you sure you want to end the match?')) return;
                        if (!(currentMatch?.awards?.manOfTheMatchId)) { setMessage('Please select Man of the Match in Awards before completing the match.'); return; }
                        const inns = Array.isArray(currentMatch?.innings) ? currentMatch.innings : [];
                        const result = computeResult(inns) || 'Match completed';
                        await persistMatch({ status: 'completed', result, completedAt: new Date(), lastUpdated: new Date() });
                        await finalizeMatchAndUpdateStats();
                        setMessage('Match completed.');
                        try { window.alert('Match completed successfully.'); } catch {}
                      }} className="flex items-center justify-center space-x-2 bg-gray-700 hover:bg-gray-800 text-white py-3 px-4 rounded">End Match</button>
                      <button onClick={async()=>{
                        if (!window.confirm('Are you sure you want to reset the match? This will clear scores and innings.')) return;
                        await resetMatch();
                        try { window.alert('Match reset successfully.'); } catch {}
                      }} className="flex items-center justify-center space-x-2 bg-brand-primary hover:bg-brand-primaryDark text-white py-3 px-4 rounded">Reset</button>
                    </div>

                    {/* Match Options */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold mb-3">Match Options</h3>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">Super Over</div>
                          <div className="text-xs text-gray-600">Enable to indicate the match will proceed to a Super Over.</div>
                        </div>
                        <label className="inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only" checked={superOver} onChange={async (e)=>{
                            const v = e.target.checked; setSuperOver(v);
                            await updateDoc(doc(db,'matches','current-match'), { isSuperOver: v });
                            if (currentMatch?.id) await updateDoc(doc(db,'matches', currentMatch.id), { isSuperOver: v });
                          }} />
                          <span className={`w-12 h-6 flex items-center bg-gray-300 rounded-full p-1 transition-all ${superOver? 'bg-green-500':''}`}>
                            <span className={`bg-white w-4 h-4 rounded-full shadow transform transition ${superOver? 'translate-x-6':''}`}></span>
                          </span>
                        </label>
                      </div>
                      {superOver && (
                        <div className="mt-2 text-sm text-green-700">Super Over enabled. This will be shown to users on the Live and Scorecard pages.</div>
                      )}
                    </div>

                    {/* Selections: Batting and Bowling */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold mb-3">Set Batting & Bowling</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">Batting Team</label>
                          <select className="w-full border rounded px-3 py-2" value={battingTeamSel} onChange={(e)=> setBattingTeamSel(e.target.value)}>
                            <option value="team1">{currentMatch?.team1?.name || 'Team 1'}</option>
                            <option value="team2">{currentMatch?.team2?.name || 'Team 2'}</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">Bowler</label>
                          <select className="w-full border rounded px-3 py-2" value={bowlerSel} onChange={(e)=> setBowlerSel(e.target.value)}>
                            <option value="">Select bowler</option>
                            { (battingTeamSel==='team2' ? team1Roster : team2Roster).map(p=> (
                              <option key={`bw-${p.id||p.playerId}`} value={p.id||p.playerId}>{p.name}</option>
                            )) }
                          </select>
                          <div className="flex gap-2 mt-2">
                            <button className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded" onClick={()=>{ setBowlerSel(''); }}>Dismiss Bowler</button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">Striker</label>
                          <select className="w-full border rounded px-3 py-2" value={strikerSel} onChange={(e)=> setStrikerSel(e.target.value)}>
                            <option value="">Select striker</option>
                            { (battingTeamSel==='team1' ? team1Roster : team2Roster).map(p=> (
                              <option key={`st-${p.id||p.playerId}`} value={p.id||p.playerId}>{p.name}</option>
                            )) }
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">Non-Striker</label>
                          <select className="w-full border rounded px-3 py-2" value={nonStrikerSel} onChange={(e)=> setNonStrikerSel(e.target.value)}>
                            <option value="">Select non-striker</option>
                            { (battingTeamSel==='team1' ? team1Roster : team2Roster).filter(p=> (p.id||p.playerId) !== strikerSel).map(p=> (
                              <option key={`ns-${p.id||p.playerId}`} value={p.id||p.playerId}>{p.name}</option>
                            )) }
                          </select>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button className="btn-primary" onClick={saveSelections}>Save Selections</button>
                      </div>
                    </div>

                    {/* Ball-by-ball Controls */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold mb-3">Ball-by-ball Controls</h3>
                      <div className="text-sm text-gray-600 mb-2">Over {currentMatch?.currentOver}.{currentMatch?.currentBall} • Batting: {currentMatch?.battingTeam || 'team1'}</div>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
                        <button className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded" onClick={()=>recordBall('.')}>•</button>
                        <button className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded" onClick={()=>recordBall('1')}>1</button>
                        <button className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded" onClick={()=>recordBall('2')}>2</button>
                        <button className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded" onClick={()=>recordBall('3')}>3</button>
                        <button className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded" onClick={()=>recordBall('4')}>4</button>
                        <button className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded" onClick={()=>recordBall('6')}>6</button>
                        <button className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded" onClick={onWicketClick}>W</button>
                        <div className="col-span-3 sm:col-span-3 flex items-center gap-2">
                          <button className="px-3 py-2 bg-yellow-100 hover:bg-yellow-200 rounded" title="Wide (variable, ball does not count)" onClick={()=>recordBall('Wd', wdExtra)}>Wd</button>
                          <input type="number" min={1} max={6} className="w-16 border rounded px-2 py-1 text-sm" value={wdExtra} onChange={e=> setWdExtra(e.target.value)} />
                          <button className="px-3 py-2 bg-yellow-100 hover:bg-yellow-200 rounded" title="No ball (1 + extra, ball does not count)" onClick={()=>recordBall('Nb', nbExtra)}>Nb</button>
                          <input type="number" min={0} max={6} className="w-16 border rounded px-2 py-1 text-sm" value={nbExtra} onChange={e=> setNbExtra(e.target.value)} />
                        </div>
                        <div className="col-span-3 sm:col-span-3 flex items-center gap-2 mt-2 sm:mt-0">
                          <button className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded" title="Byes (legal delivery)" onClick={()=>recordBall('B', bExtra)}>B</button>
                          <input type="number" min={1} max={6} className="w-16 border rounded px-2 py-1 text-sm" value={bExtra} onChange={e=> setBExtra(e.target.value)} />
                          <button className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded" title="Leg Byes (legal delivery)" onClick={()=>recordBall('Lb', lbExtra)}>Lb</button>
                          <input type="number" min={1} max={6} className="w-16 border rounded px-2 py-1 text-sm" value={lbExtra} onChange={e=> setLbExtra(e.target.value)} />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button className="px-3 py-2 bg-white border border-gray-300 hover:bg-gray-50 rounded" onClick={undoOne} disabled={undoStack.length===0}>Undo</button>
                        <button className="px-3 py-2 bg-white border border-gray-300 hover:bg-gray-50 rounded" onClick={undoThree} disabled={undoStack.length===0}>Undo 3</button>
                        <button className="px-3 py-2 bg-white border border-gray-300 hover:bg-gray-50 rounded" onClick={swapStrikeManual}>Swap Strike</button>
                      </div>
                    </div>

                    {showWicketModal && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                        <div className="bg-white rounded-lg w-full max-w-md p-6">
                          <h4 className="text-lg font-semibold mb-3">Record Wicket</h4>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm text-gray-700 mb-1">Batter Out</label>
                              <select className="w-full border rounded px-3 py-2" value={wicketBatter} onChange={(e)=> setWicketBatter(e.target.value)}>
                                <option value="">Select batter</option>
                                {(() => {
                                  const items = [];
                                  if (strikerSel) items.push({ id: strikerSel, name: currentMatch?.currentStrikerName || (battingTeamSel==='team1'? team1Roster: team2Roster).find(p=> (p.id||p.playerId)===strikerSel)?.name || 'Striker' });
                                  if (nonStrikerSel) items.push({ id: nonStrikerSel, name: currentMatch?.currentNonStrikerName || (battingTeamSel==='team1'? team1Roster: team2Roster).find(p=> (p.id||p.playerId)===nonStrikerSel)?.name || 'Non-striker' });
                                  return items.map(p => (
                                    <option key={`wb-${p.id}`} value={p.id}>{p.name}</option>
                                  ));
                                })()}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm text-gray-700 mb-1">How Out</label>
                              <select className="w-full border rounded px-3 py-2" value={wicketType} onChange={(e)=> setWicketType(e.target.value)}>
                                <option value="bowled">Bowled</option>
                                <option value="caught">Caught</option>
                                <option value="lbw">LBW</option>
                                <option value="run out">Run Out</option>
                                <option value="stumped">Stumped</option>
                                <option value="hit wicket">Hit Wicket</option>
                              </select>
                            </div>
                            {(wicketType === 'caught' || wicketType === 'run out' || wicketType === 'stumped') && (
                              <div>
                                <label className="block text-sm text-gray-700 mb-1">Fielder</label>
                                <select className="w-full border rounded px-3 py-2" value={wicketFielder} onChange={(e)=> setWicketFielder(e.target.value)}>
                                  <option value="">Select fielder</option>
                                  { (battingTeamSel==='team1' ? team2Roster : team1Roster).map(p=> (
                                    <option key={`wf-${p.id||p.playerId}`} value={p.id||p.playerId}>{p.name}</option>
                                  )) }
                                </select>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center justify-end gap-2 mt-4">
                            <button className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded" onClick={()=> setShowWicketModal(false)}>Cancel</button>
                            <button className="btn-primary" onClick={commitWicket}>Save Wicket</button>
                          </div>
                        </div>
                      </div>
                    )}

                    {showNewBatsmanModal && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                        <div className="bg-white rounded-lg w-full max-w-md p-6">
                          <h4 className="text-lg font-semibold mb-3">Select New Batsman</h4>
                          <div>
                            <label className="block text-sm text-gray-700 mb-1">New batsman ({outRole==='striker' ? 'replaces striker' : 'replaces non-striker'})</label>
                            <select className="w-full border rounded px-3 py-2" value={newBatsmanId} onChange={(e)=> setNewBatsmanId(e.target.value)}>
                              <option value="">Select player</option>
                              {newBatsmanCandidates().map(p => (
                                <option key={`nb-${p.id||p.playerId}`} value={p.id||p.playerId}>{p.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex items-center justify-end gap-2 mt-4">
                            <button className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded" onClick={()=> setShowNewBatsmanModal(false)}>Cancel</button>
                            <button className="btn-primary" onClick={confirmNewBatsman}>Confirm</button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Score Overrides */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold mb-4">Update Scores</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">{currentMatch?.team1?.name || 'Team 1'} Runs</label>
                          <input type="number" className="w-full border rounded px-2 py-2" value={ovrT1Runs} onChange={e=> setOvrT1Runs(e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">{currentMatch?.team1?.name || 'Team 1'} Wickets</label>
                          <input type="number" className="w-full border rounded px-2 py-2" value={ovrT1Wkts} onChange={e=> setOvrT1Wkts(e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Current Over</label>
                          <input type="number" className="w-full border rounded px-2 py-2" value={ovrOver} onChange={e=> setOvrOver(e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">{currentMatch?.team2?.name || 'Team 2'} Runs</label>
                          <input type="number" className="w-full border rounded px-2 py-2" value={ovrT2Runs} onChange={e=> setOvrT2Runs(e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">{currentMatch?.team2?.name || 'Team 2'} Wickets</label>
                          <input type="number" className="w-full border rounded px-2 py-2" value={ovrT2Wkts} onChange={e=> setOvrT2Wkts(e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Current Ball (0-5)</label>
                          <input type="number" className="w-full border rounded px-2 py-2" value={ovrBall} onChange={e=> setOvrBall(e.target.value)} />
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <button className="btn-primary" onClick={async()=>{
                          const t1 = currentMatch?.team1 || {}; const t2 = currentMatch?.team2 || {};
                          const runs1 = Math.max(0, parseInt(ovrT1Runs)||0);
                          const wkts1 = Math.max(0, Math.min(maxWickets, parseInt(ovrT1Wkts)||0));
                          const runs2 = Math.max(0, parseInt(ovrT2Runs)||0);
                          const wkts2 = Math.max(0, Math.min(maxWickets, parseInt(ovrT2Wkts)||0));
                          const over = Math.max(0, parseInt(ovrOver)||0);
                          const ball = Math.max(0, Math.min(5, parseInt(ovrBall)||0));
                          await updateDoc(doc(db,'matches','current-match'), { team1: { ...t1, runs: runs1, wickets: wkts1 }, team2: { ...t2, runs: runs2, wickets: wkts2 }, currentOver: over, currentBall: ball });
                          if (currentMatch?.id) await updateDoc(doc(db,'matches', currentMatch.id), { team1: { ...t1, runs: runs1, wickets: wkts1 }, team2: { ...t2, runs: runs2, wickets: wkts2 }, currentOver: over, currentBall: ball });
                          setMessage('Scores updated.');
                        }}>Save Overrides</button>
                        <button className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded" onClick={()=>{
                          setOvrT1Runs(String(currentMatch?.team1?.runs ?? ''));
                          setOvrT1Wkts(String(currentMatch?.team1?.wickets ?? ''));
                          setOvrT2Runs(String(currentMatch?.team2?.runs ?? ''));
                          setOvrT2Wkts(String(currentMatch?.team2?.wickets ?? ''));
                          setOvrOver(String(currentMatch?.currentOver ?? ''));
                          setOvrBall(String(currentMatch?.currentBall ?? ''));
                        }}>Reset</button>
                      </div>
                    </div>

                    {/* Awards */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold mb-2">Awards</h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Man of the Match</label>
                          <select className="w-full border rounded px-3 py-2" value={currentMatch?.awards?.manOfTheMatchId || ''} onChange={async (e)=>{
                            const pid = e.target.value;
                            const prevId = currentMatch?.awards?.manOfTheMatchId || '';
                            const rosterCombined = [...(team1Roster||[]), ...(team2Roster||[])];
                            const name = rosterCombined.find(p=> (p.id||p.playerId)===pid)?.name || '';
                            const awards = { ...(currentMatch?.awards||{}), manOfTheMatchId: pid, manOfTheMatch: name };
                            await updateDoc(doc(db,'matches','current-match'), { awards });
                            if (currentMatch?.id) await updateDoc(doc(db,'matches', currentMatch.id), { awards });
                            // POTM increment logic: increment new selection; if changed, decrement previous
                            try {
                              if (pid && pid !== prevId) {
                                // increment new player
                                try { await updateDoc(doc(db,'players', pid), { potmAwards: increment(1) }); } catch {}
                                try { await updateDoc(doc(db,'playerProfiles', pid), { potmAwards: increment(1) }); } catch {}
                                // decrement previous player if previously set
                                if (prevId) {
                                  try { await updateDoc(doc(db,'players', prevId), { potmAwards: increment(-1) }); } catch {}
                                  try { await updateDoc(doc(db,'playerProfiles', prevId), { potmAwards: increment(-1) }); } catch {}
                                }
                              } else if (!pid && prevId) {
                                // Clearing selection: revert previous increment
                                try { await updateDoc(doc(db,'players', prevId), { potmAwards: increment(-1) }); } catch {}
                                try { await updateDoc(doc(db,'playerProfiles', prevId), { potmAwards: increment(-1) }); } catch {}
                              }
                            } catch {}
                            setMessage('Man of the Match saved.');
                            try { window.alert('Man of the Match saved successfully.'); } catch {}
                          }}>
                            <option value="">Select player</option>
                            {[...(team1Roster||[]), ...(team2Roster||[])].map(p=>{
                              const pid = p.id || p.playerId; return <option key={`mom-${pid}`} value={pid}>{p.name}</option>
                            })}
                          </select>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Umpire;