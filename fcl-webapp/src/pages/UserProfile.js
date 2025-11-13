import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { auth, db } from '../firebase';
import { updateProfile as updateAuthProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { uploadImage, buildImagePath } from '../utils/uploadImage';

export default function UserProfile() {
  const { currentUser, userProfile, logout } = useAuth();
  const [displayName, setDisplayName] = useState(currentUser?.displayName || userProfile?.displayName || '');
  const [avatarUrl, setAvatarUrl] = useState(userProfile?.avatarUrl || currentUser?.photoURL || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow p-6 max-w-sm w-full text-center">
          <div className="text-gray-700 mb-2">You're not signed in.</div>
          <a href="/login" className="btn-primary inline-block">Login</a>
        </div>
      </div>
    );
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    
    try {
      setUploading(true);
      setError('');
      setUploadProgress(0);
      
      const path = buildImagePath('user-avatars', currentUser.uid, file);
      const url = await uploadImage(file, path, (progress) => {
        setUploadProgress(progress);
      });
      
      setAvatarUrl(url);
      setSuccess('Image uploaded! Click Save Changes to update your profile.');
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      setSaving(true); setError(''); setSuccess('');
      await updateAuthProfile(auth.currentUser, { displayName, photoURL: avatarUrl });
      await updateDoc(doc(db, 'users', currentUser.uid), { displayName, avatarUrl, photoURL: avatarUrl });
      setSuccess('Profile updated');
    } catch (e) {
      setError(e?.message || String(e));
    } finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-md mx-auto px-4">
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-200">
              {avatarUrl ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" /> : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">
                  {displayName?.[0]?.toUpperCase() || '?'}
                </div>
              )}
            </div>
            <div>
              <div className="text-lg font-semibold">{displayName || 'User'}</div>
              <div className="text-xs text-gray-500">{currentUser.email}</div>
            </div>
          </div>

          {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
          {success && <div className="mb-3 text-sm text-green-700">{success}</div>}

          <form onSubmit={save} className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Display Name</label>
              <input value={displayName} onChange={(e)=>setDisplayName(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-brand-primary focus:border-brand-primary" />
            </div>
            
            <div>
              <label className="block text-sm text-gray-600 mb-1">Profile Picture</label>
              <div className="flex gap-2 items-start">
                <label className="flex-1 cursor-pointer">
                  <div className="w-full px-3 py-2 border rounded-lg bg-gray-50 hover:bg-gray-100 text-center text-sm text-gray-700">
                    {uploading ? `Uploading... ${uploadProgress}%` : 'Choose Image'}
                  </div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileUpload} 
                    disabled={uploading}
                    className="hidden" 
                  />
                </label>
              </div>
              {avatarUrl && (
                <div className="mt-2">
                  <div className="text-xs text-gray-500 mb-1">Current Image URL:</div>
                  <input 
                    value={avatarUrl} 
                    onChange={(e)=>setAvatarUrl(e.target.value)} 
                    className="w-full px-2 py-1 text-xs border rounded focus:ring-brand-primary focus:border-brand-primary" 
                    placeholder="https://..." 
                  />
                </div>
              )}
            </div>
            
            <button type="submit" disabled={saving || uploading} className="w-full btn-primary disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </form>

          <div className="mt-4">
            <button onClick={logout} className="w-full py-2 rounded-lg border text-red-600 border-red-300 hover:bg-red-50">Logout</button>
          </div>
        </div>
      </div>
    </div>
  );
}
