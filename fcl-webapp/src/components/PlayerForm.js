import { useState } from "react";
import { db } from '../firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
// Storage removed: images stored directly as base64 data URIs in Firestore.

function PlayerForm({ teams = [], onPlayerCreated }) {
  const [name, setName] = useState('');
  const [gender, setGender] = useState('male');
  const [age, setAge] = useState('');
  const [jerseyNumber, setJerseyNumber] = useState('');
  const [teamId, setTeamId] = useState('');
  const [playerType, setPlayerType] = useState(''); // e.g., batter | bowler | all-rounder | wicketkeeper
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  // Note: Large images inflate document size (Firestore 1MB soft limit). Consider resizing/compressing before saving if needed.
  const [avatarPreview, setAvatarPreview] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      if (!name) {
        setError('Player name is required.');
        setLoading(false);
        return;
      }
      // If teams are available, require team selection to ensure roster views work
      if (Array.isArray(teams) && teams.length > 0 && !teamId) {
        setError('Please select a team for this player.');
        setLoading(false);
        return;
      }
      // Default avatar fallback (still using existing static assets if no custom image provided)
      let avatar = gender === 'male' ? '/Teams/imgImage8.png' : '/Teams/imgImage48.png';
      if (avatarFile) {
        // Convert selected file to base64 data URI and store inline
        const toDataUrl = (file) => new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        try {
          avatar = await toDataUrl(avatarFile);
        } catch (e) {
          setError('Failed to read image file.');
          setLoading(false);
          return;
        }
      }
      // Resolve selected team details (if any)
      const selectedTeam = (Array.isArray(teams) ? teams : []).find(t => t.id === teamId) || null;
      const payload = {
        name,
        gender,
        avatar,
        // Persist both a friendly team name and a teamId for filtering
        ...(selectedTeam ? { teamId: selectedTeam.id, team: selectedTeam.name } : {}),
        // Optional role/type helps filters (Team detail uses contains: 'bat' | 'bowl' | 'all')
        ...(playerType ? { type: playerType } : {}),
        age: age !== '' ? parseInt(age, 10) : null,
        ...(jerseyNumber !== '' ? { jerseyNumber: jerseyNumber } : {}),
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'players'), payload);
      setSuccess('Player added successfully!');
      setName('');
      setGender('male');
      setAge('');
      setJerseyNumber('');
      setTeamId('');
      setPlayerType('');
      setAvatarFile(null);
      setAvatarPreview('');
      if (onPlayerCreated) onPlayerCreated();
    } catch (err) {
      setError('Error adding player: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded shadow p-4 mb-6 max-w-md mx-auto">
      <h2 className="text-lg font-bold mb-2">Create Player Profile</h2>
      <div className="mb-2">
        <label className="block text-sm font-medium mb-1">Player Name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          className="border rounded px-2 py-1 w-full"
          placeholder="Enter player name"
        />
      </div>
      {/* Team selection (required if teams exist) */}
      {Array.isArray(teams) && teams.length > 0 && (
        <div className="mb-2">
          <label className="block text-sm font-medium mb-1">Team</label>
          <select
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            className="border rounded px-2 py-1 w-full"
          >
            <option value="">Select a team…</option>
            {teams.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      )}
      <div className="mb-2">
        <label className="block text-sm font-medium mb-1">Gender</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="gender"
              value="male"
              checked={gender === 'male'}
              onChange={() => setGender('male')}
            />
            Male
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="gender"
              value="female"
              checked={gender === 'female'}
              onChange={() => setGender('female')}
            />
            Female
          </label>
        </div>
      </div>
      {/* Role / Type helps roster filters */}
      <div className="mb-2">
        <label className="block text-sm font-medium mb-1">Role (optional)</label>
        <select
          value={playerType}
          onChange={(e) => setPlayerType(e.target.value)}
          className="border rounded px-2 py-1 w-full"
        >
          <option value="">Select role…</option>
          <option value="batter">Batter</option>
          <option value="bowler">Bowler</option>
          <option value="all-rounder">All-rounder</option>
          <option value="wicketkeeper">Wicketkeeper</option>
        </select>
      </div>
      <div className="mb-2">
        <label className="block text-sm font-medium mb-1">Avatar</label>
        <div className="flex flex-col gap-2">
          <input type="file" accept="image/*" onChange={(e)=> {
            const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
            setAvatarFile(file);
            if (file) {
              try {
                const reader = new FileReader();
                reader.onload = () => setAvatarPreview(reader.result);
                reader.readAsDataURL(file);
              } catch {}
            } else {
              setAvatarPreview('');
            }
          }} />
          <div className="text-xs text-gray-500">If no file is chosen, a default avatar will be used based on gender.</div>
          <div className="flex items-center gap-4">
            <img
              src={avatarPreview || (gender === 'male' ? '/Teams/imgImage8.png' : '/Teams/imgImage48.png')}
              alt="Avatar Preview"
              className="w-16 h-16 rounded-full border object-cover"
            />
            {avatarFile && loading && (
              <div className="text-xs text-gray-600">Saving…</div>
            )}
          </div>
        </div>
      </div>
      <div className="mb-2">
        <label className="block text-sm font-medium mb-1">Age</label>
        <input
          type="number"
          value={age}
          onChange={e => setAge(e.target.value)}
          className="border rounded px-2 py-1 w-full"
          placeholder="Enter age"
        />
      </div>
      <div className="mb-2">
        <label className="block text-sm font-medium mb-1">Jersey Number (optional)</label>
        <input
          type="text"
          value={jerseyNumber}
          onChange={e => setJerseyNumber(e.target.value)}
          className="border rounded px-2 py-1 w-full"
          placeholder="e.g. 7"
        />
      </div>
      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded mt-2"
        disabled={loading}
      >
        {loading ? 'Adding...' : 'Add Player'}
      </button>
      {error && <div className="text-red-500 mt-2 text-sm">{error}</div>}
      {success && <div className="text-green-600 mt-2 text-sm">{success}</div>}
    </form>
  );
}

export default PlayerForm;
