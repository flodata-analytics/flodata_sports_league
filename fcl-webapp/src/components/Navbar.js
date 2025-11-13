import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Bars3Icon,
  XMarkIcon,
  UserIcon
} from '@heroicons/react/24/outline';
// Wicket.svg is served from the public/ folder; reference directly via absolute URL in the markup.

// const FloCoinIcon = ({className, style}) => (
//   <img src="/floCash.svg" alt="FloCoin" className={className || "inline-block h-4 w-4 align-middle"} style={style} />
// );

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false); // umpire/user dropdown
  const { currentUser, userProfile, logout } = useAuth();
  const location = useLocation();

  // Always close mobile menu on route change
  React.useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await logout();
      setIsOpen(false);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Failed to log out:', error);
      }
    }
  };

  const isActive = (path) => location.pathname === path;

  // Hide navbar on /videos route for fullscreen video
  if (location.pathname === '/videos') return null;
  
  // Hide navbar on mobile view for /scorecard routes
  const isFullScorecardRoute = location.pathname.startsWith('/scorecard/');
  const isUmpireAdmin = !!(userProfile?.isAdmin || userProfile?.isUmpire || userProfile?.role === 'umpire');

    return (
      <nav className={`bg-white md:max-w-2xl md:rounded-2xl md:mx-auto shadow-sm fixed top-0 left-0 right-0 z-60 ${isFullScorecardRoute ? 'hidden md:block' : ''}`} style={{zIndex:999}}>
      <div className="w-full  max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center w-full justify-between">
            {location.pathname === '/players' ? (
              <span className="flex items-center space-x-2">
                <button onClick={() => window.history.back()} className="w-8 h-8 flex items-center justify-center" style={{background: 'none', border: 'none', outline: 'none'}} aria-label="Back">
                  {/* Chevron Left SVG (lucide) */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-left-icon lucide-chevron-left  w-6 h-6">
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </button>
                  <span className="text-xl font-bold text-black">Player's Ranking</span>
              </span>
            ) : (
              <>
                <Link to="/" className="flex items-center space-x-2">
                    <img src="/Wicket.svg" alt="FloData" className="h-8 w-8 object-contain" />
                    <span className="text-xl font-bold text-black">FCL-2025</span>
                </Link>
                {/* Right-side controls handled below */}
              </>
            )}
          </div>

          {/* Desktop: show Sign In if logged out; Umpire hat dropdown (User/Umpire) if admin/umpire */}
          <div className="hidden md:flex items-center space-x-6 lg:space-x-8">
            
            {/* User Profile / Sign In */}
            {isUmpireAdmin ? (
              <div className="relative">
                <button
                  className="flex items-center justify-center px-0 py-0 focus:outline-none"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                  <span className="w-12 h-12 rounded-full bg-[#2c60ce] border-4 border-white shadow-lg flex items-center justify-center transition-transform duration-200 hover:scale-105 focus:scale-105">
                    <img src="/Umpire1.svg" alt="Umpire" className="w-10 h-10 object-contain" />
                  </span>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-md shadow-lg py-1 z-[100]">
                    <Link
                      to="/profile"
                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setMenuOpen(false)}
                    >
                      <UserIcon className="h-4 w-4" />
                      User
                    </Link>
                    <Link
                      to="/umpire"
                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setMenuOpen(false)}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <ellipse cx="12" cy="10" rx="5" ry="2.5" fill="#fff" stroke="#222" strokeWidth="1.2" />
                        <rect x="7" y="11" width="10" height="1.2" rx="0.6" fill="#e89a2d" stroke="#222" strokeWidth="0.5" />
                        <ellipse cx="12" cy="13" rx="8" ry="2.5" fill="#fff" stroke="#222" strokeWidth="1.2" />
                        <ellipse cx="12" cy="14.2" rx="7" ry="1.2" fill="#bbb" opacity="0.5" />
                      </svg>
                      Umpire
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              !currentUser && (
                <Link
                  to="/login"
                  className="flex items-center text-black hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  {/* <UserIcon className="h-5 w-5 mr-1" /> */}
                  
                  Sign In
                </Link>
              )
            )}
          </div>

          {/* Mobile right control: Sign In when logged out; Umpire hat dropdown for admin/umpire */}
          <div className="md:hidden flex items-center relative">
            {isUmpireAdmin ? (
              <>
                {/* <button
                  className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-black hover:text-gray-900"
                  aria-label="Umpire menu"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                  Umpire PNG icon
                  <img src="/umpire.png" alt="Umpire" className="w-15 h-15 object-contain border  rounded-full" />
                </button> */}
                  <button
                className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-black hover:text-gray-900"
                aria-label="Umpire menu"
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                {/* Umpire PNG icon */}
                <span className="w-12 h-12 rounded-full bg-[#ffff] border-2 border-white shadow flex items-center justify-center transition-transform duration-200 hover:scale-105 focus:scale-105 overflow-hidden">
                  <img
                    src="/Umpire1.svg"
                    alt="Umpire"
                    className="w-full h-auto object-contain"
                  />
                </span>
              </button>

                {menuOpen && (
                  <div className="absolute right-2 top-12 w-40 bg-white border border-gray-200 rounded-md shadow-lg py-1 z-[100]">
                    <Link
                      to="/profile"
                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setMenuOpen(false)}
                    >
                      <UserIcon className="h-4 w-4" />
                      User
                    </Link>
                    <Link
                      to="/umpire"
                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setMenuOpen(false)}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <ellipse cx="12" cy="10" rx="5" ry="2.5" fill="#fff" stroke="#222" strokeWidth="1.2" />
                        <rect x="7" y="11" width="10" height="1.2" rx="0.6" fill="#e89a2d" stroke="#222" strokeWidth="0.5" />
                        <ellipse cx="12" cy="13" rx="8" ry="2.5" fill="#fff" stroke="#222" strokeWidth="1.2" />
                        <ellipse cx="12" cy="14.2" rx="7" ry="1.2" fill="#bbb" opacity="0.5" />
                      </svg>
                      Umpire
                    </Link>
                  </div>
                )}
              </>
            ) : (
              !currentUser && (
                <Link
                  to="/login"
                  className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-black hover:text-gray-900"
                  aria-label="Sign In"
                >
                  {/* <UserIcon className="h-6 w-6" /> */}
                   <span className="w-12 h-12 rounded-full bg-[#ffff] border-2 border-white shadow flex items-center justify-center transition-transform duration-200 hover:scale-105 focus:scale-105 overflow-hidden">
                  <img
                    src="/Umpire1.svg"
                    alt="Umpire"
                    className="w-full h-auto object-contain"
                  />
                </span>
                </Link>
              )
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-brand-primary/95">
              {/* <Link
                to="/"
                className={`text-white/90 hover:text-white block px-3 py-2 rounded-md text-base font-medium ${
                  isActive('/') ? 'bg-white/10' : ''
                }`}
                onClick={() => setIsOpen(false)}
              >
                Live Score
              </Link> */}
              {/* <Link
                to="/players"
                className={`text-white/90 hover:text-white block px-3 py-2 rounded-md text-base font-medium ${
                  isActive('/players') ? 'bg-white/10' : ''
                }`}
                onClick={() => setIsOpen(false)}
              >
                Players
              </Link> */}
              {/* <Link
                to="/points"
                className={`text-white/90 hover:text-white block px-3 py-2 rounded-md text-base font-medium ${
                  isActive('/points') ? 'bg-white/10' : ''
                }`}
                onClick={() => setIsOpen(false)}
              >
                Points
              </Link> */}
              {/* {currentUser && (
                <Link
                  to="/auction"
                  className={`text-white/90 hover:text-white block px-3 py-2 rounded-md text-base font-medium ${
                    isActive('/auction') ? 'bg-white/10' : ''
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  Auction
                </Link>
              )} */}
              {/* {(userProfile?.isAdmin || userProfile?.isUmpire || userProfile?.role === 'umpire') && (
                <Link
                  to="/umpire"
                  className={`text-white/90 hover:text-white block px-3 py-2 rounded-md text-base font-medium ${
                    isActive('/umpire') ? 'bg-white/10' : ''
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  Umpire
                </Link>
              )} */}
              
              {/* Mobile: show Profile if admin/umpire, else Sign In if logged out */}
              {isUmpireAdmin ? (
                <Link
                  to="/profile"
                  className={`text-white/90 hover:text-white block px-3 py-2 rounded-md text-base font-medium ${
                    isActive('/profile') ? 'bg-white/10' : ''
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  Profile
                </Link>
              ) : (
                !currentUser && (
                  <div className="border-t border-white/20 pt-4 mt-4">
                    <Link
                      to="/login"
                      className="text-white/90 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
                      onClick={() => setIsOpen(false)}
                    >
                      <span className="inline-flex items-center"><UserIcon className="h-5 w-5 mr-2" /> Sign In</span>
                    </Link>
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;