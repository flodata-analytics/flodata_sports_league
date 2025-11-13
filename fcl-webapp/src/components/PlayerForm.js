import { useState } from "react";
import { db } from '../firebase';
import { addDoc, collection } from 'firebase/firestore';
import { uploadImage, buildImagePath } from '../utils/uploadImage';

function PlayerForm({ teams = [], onPlayerCreated }) {
  const [name, setName] = useState('');
  const [gender, setGender] = useState('male');
  const [age, setAge] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [uploadPct, setUploadPct] = useState(0);

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
      let avatar = gender === 'male' ? '/Teams/imgImage8.png' : '/Teams/imgImage48.png';
      if (avatarFile) {
        // Upload directly to Firebase Storage
        const path = buildImagePath('player-avatars', name || 'player', avatarFile);
        avatar = await uploadImage(avatarFile, path, (pct) => setUploadPct(pct));
      }
      await addDoc(collection(db, 'players'), {
        name,
        gender,
        avatar,
        age: age ? parseInt(age, 10) : '',
        createdAt: new Date(),
      });
      setSuccess('Player added successfully!');
      setName('');
      setGender('male');
      setAge('');
      setAvatarFile(null);
      setUploadPct(0);
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
      <div className="mb-2">
        <label className="block text-sm font-medium mb-1">Avatar</label>
        <div className="flex flex-col gap-2">
          <input type="file" accept="image/*" onChange={(e)=> setAvatarFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)} />
          <div className="text-xs text-gray-500">If no file is chosen, a default avatar will be used based on gender.</div>
          <div className="flex items-center gap-4">
            <img
              src={avatarFile ? URL.createObjectURL(avatarFile) : (gender === 'male' ? '/Teams/imgImage8.png' : '/Teams/imgImage48.png')}
              alt="Avatar Preview"
              className="w-16 h-16 rounded-full border object-cover"
            />
            {avatarFile && loading && (
              <div className="text-xs text-gray-600">Uploading…</div>
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
