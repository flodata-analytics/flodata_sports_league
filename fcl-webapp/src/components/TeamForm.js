import React, { useState } from 'react';
import { db } from '../firebase';
import { addDoc, collection } from 'firebase/firestore';
import { uploadImage, buildImagePath } from '../utils/uploadImage';

export default function TeamForm({ onTeamCreated }) {
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [uploadPct, setUploadPct] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      if (!name) {
        setError('Team name is required.');
        setLoading(false);
        return;
      }

      let finalLogoUrl = logoUrl.trim();
      if (logoFile) {
        // Upload directly to Firebase Storage
        const path = buildImagePath('team-logos', name || 'team', logoFile);
        finalLogoUrl = await uploadImage(logoFile, path, (pct) => setUploadPct(pct));
      }
      if (!finalLogoUrl) {
        setError('Please upload a logo image or paste a logo URL.');
        setLoading(false);
        return;
      }

      await addDoc(collection(db, 'teams'), {
        name,
        logoUrl: finalLogoUrl,
        logo: finalLogoUrl,
        createdAt: new Date(),
      });
      setSuccess('Team created successfully!');
      setName('');
      setLogoUrl('');
      setLogoFile(null);
      setUploadPct(0);
      if (onTeamCreated) onTeamCreated();
    } catch (err) {
      setError('Error creating team: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded shadow p-4 mb-6 max-w-md mx-auto">
      <h2 className="text-lg font-bold mb-2">Create New Team</h2>
      <div className="mb-2">
        <label className="block text-sm font-medium mb-1">Team Name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          className="border rounded px-2 py-1 w-full"
          placeholder="Enter team name"
        />
      </div>
      <div className="mb-2">
        <label className="block text-sm font-medium mb-1">Team Logo</label>
        <div className="grid grid-cols-1 gap-2">
          <input
            type="file"
            accept="image/*"
            onChange={(e)=> setLogoFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
            className="border rounded px-2 py-1 w-full"
          />
          <div className="text-xs text-gray-500">Or paste an image URL:</div>
          <input
            type="text"
            value={logoUrl}
            onChange={e => setLogoUrl(e.target.value)}
            className="border rounded px-2 py-1 w-full"
            placeholder="https://…"
          />
          {(logoFile || logoUrl) && (
            <div className="mt-1 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden border bg-gray-100">
                <img
                  src={logoFile ? URL.createObjectURL(logoFile) : logoUrl}
                  alt="logo preview"
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Progress is handled server-side; show a simple hint while loading */}
              {loading && logoFile && (
                <div className="text-xs text-gray-600">Uploading…</div>
              )}
            </div>
          )}
        </div>
      </div>
      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded mt-2"
        disabled={loading}
      >
        {loading ? 'Creating...' : 'Create Team'}
      </button>
      {error && <div className="text-red-500 mt-2 text-sm">{error}</div>}
      {success && <div className="text-green-600 mt-2 text-sm">{success}</div>}
    </form>
  );
}
