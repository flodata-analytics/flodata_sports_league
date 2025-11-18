import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { UsersIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import FloCashIcon from './FloCashIcon';

const Item = ({ to, label, Icon }) => {
  const location = useLocation();
  const active = location.pathname === to;
    const base = 'flex-1 flex flex-col items-center justify-center py-2';
  return (
    <NavLink to={to} className={`${base} ${active ? 'text-white' : 'text-gray-500'}`}>
      <div className={`w-9 h-9 flex items-center justify-center rounded-full mb-0.5 ${active ? '' : ''}`}>
        <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-gray-500'}`} active={active} />
      </div>
          <span className={`${active ? 'mt-0.5 text-[14px] md:text-[15px] font-semibold' : 'mt-0.5 text-[12px] md:text-[13px]'}`}>{label}</span>
    </NavLink>
  );
};

function AvatarMenu() {
  const { currentUser, userProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  if (!currentUser) return null;
  const avatarUrl = userProfile?.avatarUrl;
  return (
    <div></div>
    // <div className="flex-1 flex flex-col items-center justify-center py-2 text-xs relative">
    //   <button
    //     className="w-9 h-9 flex items-center justify-center rounded-full mb-0.5 bg-gray-200 overflow-hidden border border-gray-300"
    //     onClick={() => setOpen((v) => !v)}
    //     aria-label="Profile menu"
    //   >
    //     {avatarUrl ? (
    //       <img src={avatarUrl} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
    //     ) : (
    //       <UserCircleIcon className="w-8 h-8 text-gray-500" />
    //     )}
    //   </button>
    //   <span className="mt-0.5">Profile</span>
    //   {open && (
    //     <div className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-white rounded shadow-lg py-2 px-3 min-w-[120px] z-50 flex flex-col items-stretch">
    //       <button
    //         className="text-left px-2 py-1 hover:bg-gray-100 rounded text-sm"
    //         onClick={() => { setOpen(false); navigate('/profile'); }}
    //       >
    //         My Profile
    //       </button>
    //       {(userProfile?.isAdmin || userProfile?.isUmpire || userProfile?.role === 'umpire') && (
    //         <button
    //           className="text-left px-2 py-1 hover:bg-gray-100 rounded text-sm flex items-center gap-1"
    //           onClick={() => { setOpen(false); navigate('/umpire'); }}
    //         >
    //           {/* Cricket umpire hat SVG icon */}
    //           <svg className="w-4 h-4 inline" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    //             {/* Hat crown */}
    //             <ellipse cx="12" cy="10" rx="5" ry="2.5" fill="#fff" stroke="#222" strokeWidth="1.2" />
    //             {/* Hat band */}
    //             <rect x="7" y="11" width="10" height="1.2" rx="0.6" fill="#e89a2d" stroke="#222" strokeWidth="0.5" />
    //             {/* Hat brim */}
    //             <ellipse cx="12" cy="13" rx="8" ry="2.5" fill="#fff" stroke="#222" strokeWidth="1.2" />
    //             {/* Shadow under brim */}
    //             <ellipse cx="12" cy="14.2" rx="7" ry="1.2" fill="#bbb" opacity="0.5" />
    //           </svg>
    //           Umpire
    //         </button>
    //       )}
    //     </div>
    //   )}
    // </div>
  );
}
export default function BottomNav() {
  const { currentUser } = useAuth();
  return (
    <div className="md:max-w-2xl md:mx-auto  fixed bottom-0 left-0 right-0 bg-[#11151d] hover:text-white  shadow-sm z-40">
      <div className="w-full max-w-full mx-auto flex ">
        <Item to="/" label="Home" Icon={(props) => (
          <img src={props?.active ? '/Home Selected.svg' : '/Home Not Selected.svg'} alt="Home" className={`w-5 h-5 ${props?.className||''}`} />
        )} />
        <Item to="/players" label="Ranking" Icon={(props) => (
          <img src={props?.active ? '/Leaderboard Icon Selected.svg' : '/Leaderboard Icon Not Selected (1).svg'} alt="Leaderboard" className={`w-5 h-5 ${props?.className||''}`} />
        )} />
        <Item to="/auction" label="Auction" Icon={FloCashIcon} />
        <Item to="/videos" label="Videos" Icon={(props) => (
          <img src={props?.active ? '/Video Library Selected.svg' : '/Video Library Not Selected.svg'} alt="Videos" className={`w-6 h-6 ${props?.className||''}`} />
        )} />
        {currentUser && <AvatarMenu />}
        {/* Login removed - use profile/avatar menu when user is authenticated */}
      </div>
    </div>
  );
}
