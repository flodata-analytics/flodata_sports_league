import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserCircleIcon, CogIcon } from '@heroicons/react/24/outline';

export default function ProfileMenuMobile() {
  const { currentUser, userProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  if (!currentUser) return null;
  const avatarUrl = userProfile?.avatarUrl;
  return (
    <div className="relative flex items-center ml-2">
      <button
        className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-200 overflow-hidden border border-gray-300"
        onClick={() => setOpen((v) => !v)}
        aria-label="Profile menu"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <UserCircleIcon className="w-8 h-8 text-gray-500" />
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-12 bg-white rounded shadow-lg py-2 px-3 min-w-[120px] z-50 flex flex-col items-stretch">
          <button
            className="text-left px-2 py-1 hover:bg-gray-100 rounded text-sm"
            onClick={() => { setOpen(false); navigate('/profile'); }}
          >
            My Profile
          </button>
          {(userProfile?.isAdmin || userProfile?.isUmpire || userProfile?.role === 'umpire') && (
            <button
              className="text-left px-2 py-1 hover:bg-gray-100 rounded text-sm flex items-center gap-1"
              onClick={() => { setOpen(false); navigate('/umpire'); }}
            >
              {/* Cricket umpire hat SVG icon */}
              <svg className="w-4 h-4 inline" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Hat crown */}
                <ellipse cx="12" cy="10" rx="5" ry="2.5" fill="#fff" stroke="#222" strokeWidth="1.2" />
                {/* Hat band */}
                <rect x="7" y="11" width="10" height="1.2" rx="0.6" fill="#e89a2d" stroke="#222" strokeWidth="0.5" />
                {/* Hat brim */}
                <ellipse cx="12" cy="13" rx="8" ry="2.5" fill="#fff" stroke="#222" strokeWidth="1.2" />
                {/* Shadow under brim */}
                <ellipse cx="12" cy="14.2" rx="7" ry="1.2" fill="#bbb" opacity="0.5" />
              </svg>
              Umpire
            </button>
          )}
        </div>
      )}
    </div>
  );
}