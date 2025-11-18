import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCollection, useDocument } from '../hooks/useFirestore';
import VideoLoader from '../components/VideoLoader';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { getPlayerAvatar } from '../utils/getPlayerAvatar';
import PlayerModelViewer from '../components/PlayerModelViewer';
import { calculateDream11Points, playerDocToStats } from '../utils/dream11Points';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';

function Stat({ label, value, highlight = false }) {
  return (
    <div className={`p-3 sm:p-4 rounded-xl ${highlight ? 'bg-[#f3f7ff] border border-[#cfd8ea]' : 'bg-white border border-[#e6eaf2]'} shadow-sm`}>
      <div className="text-xs text-[#8a93a0]">{label}</div>
      <div className="text-md sm:text-2xl font-normal text-[#111]">{value}</div>
    </div>
  );
}

export default function PlayerProfile() {
  const { playerId } = useParams();
  const navigate = useNavigate();
  const { data: player, loading: playerLoading, error: playerErr } = useDocument('players', playerId, { transport: 'ws' });
  const { data: allPlayers } = useCollection('players', 'name', [], 500, { enabled: true, poll: false });
  const { data: profile, loading: profileLoading } = useDocument('playerProfiles', playerId, { transport: 'ws' });
  const { userProfile } = useAuth();
  const [busy, setBusy] = useState(false);
  const gender = profile?.gender || 'male';
  // Memoized derived fields (unconditional at top-level to satisfy hooks rules)
  const bestHighlight = useMemo(() => profile?.bestStat || '—', [profile]);
  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${da}`;
  }, []);
  const isUnavailableToday = useMemo(() => {
    const list = Array.isArray(player?.unavailableDates) ? player.unavailableDates : [];
    if (list.includes(todayStr)) return true;
    if (player?.unavailable && (player.unavailable === true || player.unavailable?.date === todayStr)) return true;
    return false;
  }, [player, todayStr]);
  // IMPORTANT: All hooks (useMemo/useState/useEffect) must execute before any early return.
  // Move ranking/points related hooks ABOVE the conditional loading/error returns to avoid runtime hook count mismatch.
  const rankings = useMemo(() => {
    const arr = Array.isArray(allPlayers) ? allPlayers : [];
    const enriched = arr.map(p => ({ id: p.id, points: calculateDream11Points(playerDocToStats(p)), ref: p }));
    enriched.sort((a,b)=> (b.points - a.points) || String(a.ref?.name||'').localeCompare(String(b.ref?.name||'')));
    return enriched;
  }, [allPlayers]);
  const myRank = useMemo(() => {
    const idx = rankings.findIndex(r => r.id === playerId);
    return idx >= 0 ? (idx + 1) : null;
  }, [rankings, playerId]);
  const myPoints = useMemo(() => calculateDream11Points(playerDocToStats(player || {})), [player]);
  const rankBadge = useMemo(() => {
    if (!myRank) return { label: 'Unranked', className: 'bg-gray-200 text-gray-700 border-gray-300' };
    if (myRank === 1) return { label: 'Rank 1', className: 'bg-gradient-to-r from-yellow-300 to-yellow-500 text-yellow-900 border-yellow-600' };
    if (myRank === 2) return { label: 'Rank 2', className: 'bg-gradient-to-r from-gray-200 to-gray-400 text-gray-800 border-gray-500' };
    if (myRank === 3) return { label: 'Rank 3', className: 'bg-gradient-to-r from-amber-700 to-amber-500 text-white border-amber-700' };
    return { label: `Rank ${myRank}`, className: 'bg-white text-[#2c60ce] border-[#cfd8ea]' };
  }, [myRank]);
  // Select badge icon for top-3 ranks; assets located under /public
  const rankBadgeSrc = useMemo(() => {
    if (myRank === 1) return '/BatchGolden.svg';
    if (myRank === 2) return '/BatchSilver.svg';
    if (myRank === 3) return '/BatchBronze.svg';
    return null;
  }, [myRank]);

  const toggleAvailability = async () => {
    if (!playerId) return;
    try {
      setBusy(true);
      const ref = doc(db, 'players', playerId);
      if (isUnavailableToday) {
        await updateDoc(ref, { unavailableDates: arrayRemove(todayStr) });
      } else {
        await updateDoc(ref, { unavailableDates: arrayUnion(todayStr) });
      }
    } finally {
      setBusy(false);
    }
  };

  // Early returns placed AFTER all hooks declarations
  if (playerLoading || profileLoading) return <VideoLoader className="py-12" />;
  if (playerErr) return <div className="p-6 text-red-600">Error: {playerErr.message}</div>;
  if (!player) return <div className="p-6">Player not found</div>;

  // Unified stats (fallback through profile -> player fields)
  const num = (v) => (Number.isFinite(v) ? v : 0);
  const matches = num(profile?.totalMatches ?? player?.matches);
  const runs = num(profile?.totalRuns ?? player?.runs);
  const wickets = num(profile?.totalWickets ?? player?.wickets);
  let strikeRate = Number.isFinite(profile?.strikeRate ?? player?.strikeRate) ? (profile?.strikeRate ?? player?.strikeRate) : null;
  let economy = Number.isFinite(profile?.economy ?? player?.economy) ? (profile?.economy ?? player?.economy) : null;
  // Fallback derive rates if not set explicitly
  const ballsFacedAgg = num(profile?.ballsFaced ?? player?.ballsFaced);
  const ballsBowledAgg = num(profile?.ballsBowled ?? player?.ballsBowled);
  if (strikeRate == null && ballsFacedAgg > 0) {
    strikeRate = Math.round(((runs * 100) / ballsFacedAgg) * 100) / 100;
  }
  if (economy == null && ballsBowledAgg > 0) {
    const overs = ballsBowledAgg / 6;
    economy = Math.round(((num(profile?.runsConceded ?? player?.runsConceded) / overs)) * 100) / 100;
  }
  const highestScore = num(profile?.highestScore ?? profile?.highScore ?? player?.highestScore ?? player?.highScore ?? player?.hs);
  const bestWickets = num(profile?.bestWickets ?? profile?.highWicket ?? player?.bestWickets ?? player?.highWicket ?? player?.best);
  const avatar = getPlayerAvatar(player) || getPlayerAvatar(profile);
  // Role & Batting style from player doc first, fallback to profile collection; final fallback 'Player'
  const role = (player?.role || player?.type || profile?.role || profile?.primaryRole || 'Player');
  const battingStyle = (player?.battingStyle || profile?.battingStyle || '').replace(/-/g,' ');
  // Ranking by Dream11 points across all players
  // const team = player?.team || profile?.team || '—';

  return (
    <div className="min-h-screen bg-[#f8f8f8]">
      <div className="max-w-5xl mx-auto pb-10 bg-white">

        {/* Hero: blue-white gradient with avatar and name */}
        {/* <div
          className="relative  overflow-hidden shadow-[0_6px_15px_0_rgba(0,0,0,0.08)]"
          style={{
            background: "linear-gradient(to bottom, #2C60CE 0%, #13306F 100%)",
          }}
        >
          <div className="h-10 sm:h-40 " />
          <div className=" px-4 sm:px-6 pb-5 pt-14 sm:pt-16 h-[162px] w-[393px]">
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="-mt-16 sm:-mt-20 w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white overflow-hidden shrink-0">
                {avatar ? (
                  <img src={avatar} alt={player.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-3xl font-extrabold" style={{background: 'linear-gradient(135deg, #2c60ce 0%, #5b82e6 60%)'}}>
                    {String(player.name || '?').charAt(0)}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-3xl font-extrabold text-[#111] leading-tight truncate">{player.name}</h1>
                <div className="flex items-center gap-2">
                  <div className="text-[#586172] text-sm sm:text-base truncate">{team}</div>
                  {isUnavailableToday && (
                    <span className="inline-flex items-center px-2 py-[2px] rounded-full text-[10px] font-semibold bg-[#ffe8e8] text-[#d92d20] border border-[#f3d6d6] whitespace-nowrap">Unavailable today</span>
                  )}
                </div>
                <div className="text-[#9ca4ab] text-xs sm:text-sm capitalize">{role}</div>
              </div>
              {userProfile?.isAdmin && (
                <div className="ml-auto -mt-14 sm:-mt-16">
                  <button
                    onClick={toggleAvailability}
                    disabled={busy}
                    className={`text-xs sm:text-sm px-3 py-1 rounded-full border ${isUnavailableToday ? 'bg-white text-[#d92d20] border-[#f3d6d6] hover:bg-[#fff7f7]' : 'bg-white text-[#2c60ce] border-[#cfd8ea] hover:bg-[#f3f7ff]'} transition`}
                  >
                    {busy ? 'Saving…' : (isUnavailableToday ? 'Make available today' : 'Mark unavailable today')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div> */}
        <div
          className="relative overflow-hidden shadow-[0_6px_15px_0_rgba(0,0,0,0.08)]"
          style={{
            background: "linear-gradient(to bottom, #2C60CE 0%, #13306F 100%)",
          }}
        >
          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="absolute top-3 left-3 sm:top-4 sm:left-4 inline-flex items-center justify-center text-white  z-10"
          >
            <ChevronLeftIcon className="w-6 h-6" />Back
          </button>
          {/* Container for content */}
          <div className="h-[180px] sm:h-[200px] relative flex justify-between items-end px-5 pb-3">
            {/* Jersey number watermark behind the avatar */}
            {(() => {
              const j = (player?.jerseyNumber ?? player?.jerseyNo ?? player?.jersey ?? profile?.jerseyNumber ?? profile?.jerseyNo ?? null);
              if (!j && j !== 0) return null;
              return (
                <div className="absolute right-1 -top-6 z-0 sm:right-8 sm:top-4 pointer-events-none select-none">
                  <div className="font-techno-race italic jersey-kerning text-white/20 leading-none text-[194px] sm:text-[96px]">{j}</div>
                </div>
              );
            })()}
            {/* Player Name - Bottom Left */}
            <div className="text-white">
              {/* If player.name has full name, split it for style */}
              <div className="flex items-center gap-[-15px]">
                <h2 className="text-lg sm:text-xl font-semibold leading-tight">
                  {player?.name}
                </h2>
                {rankBadgeSrc && (
                  <img
                    src={rankBadgeSrc}
                    alt={`Rank ${myRank} badge`}
                    className="w-12 h-12 sm:w-8 sm:h-8"
                  />
                )}
              </div>
              {/* <h1 className="text-2xl sm:text-3xl font-extrabold uppercase leading-tight">
                {player?.name?.split(" ")[1] || ""}
              </h1> */}

              {/* Team and Role */}
              <div className="mt-2 flex flex-col gap-1">
                <div className="flex flex-wrap gap-2">
            <div className={`border w-20 text-center rounded-2xl ${rankBadge.className} shadow`}>Rank {myRank ? `${myRank}` : '-'}</div>
              <div className="text-white w-20 text-[16px]  bg-[#2c60ce] text-center rounded-2xl">Points: {Math.round(myPoints)}</div>
          {/* </div> */}
                </div>

                {/* Unavailable Badge */}
                {isUnavailableToday && (
                  <span className="mt-1 inline-flex items-center px-2 py-[2px] rounded-full text-[10px] font-semibold bg-[#ffe8e8] text-[#d92d20] border border-[#f3d6d6] whitespace-nowrap">
                    Unavailable today
                  </span>
                )}
              </div>
            </div>

            {/* 3D Model / Avatar - Bottom Right */}
            <div className="w-[10rem] h-[10rem] sm:w-28 sm:h-28 shrink-0 mb-[-10px] relative z-10">
              <PlayerModelViewer modelUrl={player?.modelUrl || '/model.glb'} poster={avatar} alt={`3D model of ${player?.name || 'player'}`} />
            </div>
          </div>

          {/* Admin Section (Button Logic stays same) */}
          {userProfile?.isAdmin && (
            <div className="absolute top-4 right-4">
              <button
                onClick={toggleAvailability}
                disabled={busy}
                className={`text-xs sm:text-sm px-3 py-1 rounded-full border transition ${isUnavailableToday
                    ? "bg-white text-[#d92d20] border-[#f3d6d6] hover:bg-[#fff7f7]"
                    : "bg-white text-[#2c60ce] border-[#cfd8ea] hover:bg-[#f3f7ff]"
                  }`}
              >
                {busy
                  ? "Saving…"
                  : isUnavailableToday
                    ? "Make available today"
                    : "Mark unavailable today"}
              </button>
            </div>
          )}
        </div>
        {/* Personal Info */}
        {/* <div className="mt-6"> */}
          <div className="mt-6 p-4 sm:p-6]">
            <div className="flex items-center gap-2 mb-4">
              <img src="/Icon.svg" alt="Personal Info" className="w-6 h-6" />
              <span className="font-norma text-[18px]">Personal Info</span>
            </div>
            {(() => {
              const display = (v) => (v !== undefined && v !== null && String(v).trim() !== '' ? v : '—');
              const genderText = (player?.gender || profile?.gender) ? String(player?.gender || profile?.gender) : '—';
              const jerseyNo = (player?.jerseyNumber ?? player?.jerseyNo ?? player?.jersey ?? profile?.jerseyNumber ?? profile?.jerseyNo ?? '—');
              const bowlingStyle = (player?.bowlingStyle || profile?.bowlingStyle || '').replace(/-/g,' ').trim();
              const potmAwards = (() => {
                const v = (profile?.potmAwards ?? player?.potmAwards ?? (player?.awards && player.awards.potm) ?? (profile?.awards && profile.awards.potm));
                return Number.isFinite(v) ? v : (v ? v : 0);
              })();
              return (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white border border-[#e6eaf2] rounded-xl shadow-sm p-4">
                    <div className="text-xs text-[#8a93a0]">Age</div>
                    <div className="text-md sm:text-2xl font-normal text-[#111]">{display(player?.age)}</div>
                  </div>
                  <div className="p-3 sm:p-4 rounded-xl bg-white border border-[#e6eaf2] shadow-sm">
                    <div className="text-xs text-[#8a93a0]">Gender</div>
                    <div className="text-md sm:text-2xl font-normal text-[#111] capitalize">{display(genderText)}</div>
                    
                  </div>
                  <div className="bg-white border border-[#e6eaf2] rounded-xl shadow-sm p-4">
                    <div className="text-xs text-[#8a93a0]">Jersey No</div>
                    <div className="text-md sm:text-2xl font-normal text-[#111]">{display(jerseyNo)}</div>
                  </div>
                  <div className="bg-white border border-[#e6eaf2] rounded-xl shadow-sm p-4">
                    <div className="text-xs text-[#8a93a0]">Role</div>
                    <div className="text-md sm:text-2xl font-normal text-[#111]">{display(role)}</div>
                  </div>
                  <div className="bg-white border border-[#e6eaf2] rounded-xl shadow-sm p-4">
                    <div className="text-xs text-[#8a93a0]">Batting Style</div>
                    <div className="text-md sm:text-2xl font-normal text-[#111]">{display(battingStyle)}</div>
                  </div>
                  <div className="bg-white border border-[#e6eaf2] rounded-xl shadow-sm p-4">
                    <div className="text-xs text-[#8a93a0]">Bowling Style</div>
                    <div className="text-md sm:text-2xl font-normal text-[#111]">{display(bowlingStyle)}</div>
                  </div>
                  <div className="bg-white border border-[#e6eaf2] rounded-xl shadow-sm p-4">
                    <div className="text-xs text-[#8a93a0]">POTM Awards</div>
                    <div className="text-md sm:text-2xl font-normal text-[#111]">{display(potmAwards)}</div>
                  </div>
                </div>
              );
            })()}
          </div>
        {/* </div> */}

        {/* Batting Stats */}
        <div className="mt-2 bg-white p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <img src="/Bat Tilted.svg" alt="Batting" className="w-6 h-6" />
            <span className="font-normal text-[18px] text-[#111]">Batting Stats</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Stat label="Matches" value={matches} />
            <Stat label="Runs" value={runs} />
            <Stat label="Strike Rate" value={strikeRate ? strikeRate.toFixed(1) : '—'} />
            <Stat label="HS" value={highestScore || '—'} />
            <Stat label="4s" value={player?.fours ?? '—'} />
            <Stat label="6s" value={player?.sixes ?? '—'} />
          </div>
        </div>

        {/* Bowling Stats */}
        <div className="mt-2 bg-white p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <img src="/BowlIcon.svg" alt="Bowling" className="w-6 h-6" />
            <span className="font-normal text-[18px] text-[#111]">Bowling Stats</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Stat label="Matches" value={matches} />
            <Stat label="Wickets" value={wickets} />
            <Stat label="Economy" value={economy != null ? economy.toFixed(2) : '—'} />
            <Stat label="Best Wkts" value={bestWickets || '—'} />
            <Stat label="Maidens" value={player?.maidens ?? '—'} />
            <Stat label="Dots" value={player?.dotBalls ?? '—'} />
          </div>
        </div>
      </div>
    </div>
  );
}
