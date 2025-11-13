import React, { useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useCollection, useDocument } from '../hooks/useFirestore';
import PlayerAvatar3D from '../components/PlayerAvatar3D';
import BackButton from '../components/BackButton';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';


function Stat({ label, value, highlight = false }) {
  return (
    <div className={`p-4 rounded-lg ${highlight ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

function ProfileEditor({ playerId, current, onSaved }) {
  const [form, setForm] = useState({
    gender: current?.gender || 'male',
    totalMatches: current?.totalMatches || 0,
    totalRuns: current?.totalRuns || 0,
    totalWickets: current?.totalWickets || 0,
    economy: current?.economy || 0,
    runRate: current?.runRate || 0,
    winPercentage: current?.winPercentage || 0,
    bestStat: current?.bestStat || ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const update = (k) => (e) => {
    const v = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
    setForm(prev => ({ ...prev, [k]: v }));
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      await setDoc(doc(db, 'playerProfiles', playerId), form, { merge: true });
      onSaved?.(form);
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-4">
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded">{error}</div>}
      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Gender</label>
          <select value={form.gender} onChange={update('gender')} className="w-full border p-2 rounded">
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Total Matches</label>
          <input type="number" value={form.totalMatches} onChange={update('totalMatches')} className="w-full border p-2 rounded" />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Total Runs</label>
          <input type="number" value={form.totalRuns} onChange={update('totalRuns')} className="w-full border p-2 rounded" />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Total Wickets</label>
          <input type="number" value={form.totalWickets} onChange={update('totalWickets')} className="w-full border p-2 rounded" />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Economy</label>
          <input type="number" step="0.01" value={form.economy} onChange={update('economy')} className="w-full border p-2 rounded" />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Run Rate</label>
          <input type="number" step="0.01" value={form.runRate} onChange={update('runRate')} className="w-full border p-2 rounded" />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Winning %</label>
          <input type="number" step="0.01" value={form.winPercentage} onChange={update('winPercentage')} className="w-full border p-2 rounded" />
        </div>
        <div className="md:col-span-3">
          <label className="block text-sm text-gray-600 mb-1">Best Stat (e.g., 183*, 6/27, etc.)</label>
          <input value={form.bestStat} onChange={update('bestStat')} className="w-full border p-2 rounded" />
        </div>
      </div>
      <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Saving...' : 'Save Stats'}</button>
    </form>
  );
}

export default function Profile() {
  const { playerId } = useParams();
  return playerId ? <ProfileDetail playerId={playerId} /> : <ProfileList />;
}

function ProfileList() {
  const { data: players, loading, error } = useCollection('players', 'name', [], null, { poll: false });

  if (loading) return <div className="p-6">Loading players…</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error.message}</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <BackButton className="mb-4" />
        <h1 className="text-3xl font-bold mb-6">Player Profiles</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {players.map(p => (
            <div key={p.id} className="card">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold">{p.name}</div>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">{p.type}</span>
              </div>
              <div className="text-sm text-gray-600 mb-3">{p.team || 'N/A'}</div>
              <Link className="btn-primary inline-block" to={`/profile/${p.id}`}>View Profile</Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProfileDetail({ playerId }) {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const isAdmin = !!userProfile?.isAdmin;

  const { data: player, loading: playerLoading, error: playerErr } = useDocument('players', playerId, { intervalMs: 60000 });
  const { data: profile, loading: profileLoading } = useDocument('playerProfiles', playerId, { intervalMs: 60000 });
  const gender = profile?.gender || 'male';

  const bestHighlight = useMemo(() => profile?.bestStat || '—', [profile]);

  if (playerLoading || profileLoading) return <div className="p-6">Loading profile…</div>;
  if (playerErr) return <div className="p-6 text-red-600">Error: {playerErr.message}</div>;
  if (!player) return <div className="p-6">Player not found</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <BackButton className="mb-4" />
        <div className="grid md:grid-cols-2 gap-6 items-start">
          <div className="bg-white rounded-lg shadow p-4">
            <PlayerAvatar3D gender={gender} height={300} />
            <div className="mt-4">
              <h2 className="text-2xl font-bold">{player.name}</h2>
              <div className="text-gray-600">{player.team || 'N/A'}</div>
              <div className="text-sm text-gray-500 mt-1 capitalize">{player.type || 'player'}</div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid md:grid-cols-3 gap-3">
              <Stat label="Matches" value={profile?.totalMatches ?? 0} />
              <Stat label="Runs" value={profile?.totalRuns ?? 0} />
              <Stat label="Wickets" value={profile?.totalWickets ?? 0} />
              <Stat label="Economy" value={(profile?.economy ?? 0).toFixed(2)} />
              <Stat label="Run Rate" value={(profile?.runRate ?? 0).toFixed(2)} />
              <Stat label="Win %" value={(profile?.winPercentage ?? 0).toFixed(2)} />
            </div>
            <Stat label="Best" value={bestHighlight} highlight />

            {isAdmin && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2">Edit Stats (Admin)</h3>
                <ProfileEditor playerId={playerId} current={profile} onSaved={() => { /* Auto-refreshed by polling */ }} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
