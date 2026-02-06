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
  
  // Hide navbar on mobile view for /scorecard and team-sheet routes
  const isFullScorecardRoute = location.pathname.startsWith('/scorecard/');
  const isTeamSheetRoute = location.pathname.startsWith('/team-sheet/');
  const isUmpireAdmin = !!(userProfile?.isAdmin || userProfile?.isUmpire || userProfile?.role === 'umpire');

    return (
      <nav className={`${location.pathname === '/players' ? 'bg-[#2d509a] text-white' : 'bg-white'} md:max-w-2xl md:rounded-2xl md:mx-auto shadow-sm fixed top-0 left-0 right-0 z-60 ${(isFullScorecardRoute || isTeamSheetRoute) ? 'hidden md:block' : ''}`} style={{zIndex:999}}>
      <div className="w-full  max-w-full mx-auto px-4 sm:px-6 lg:px-8"> 
        <div className="flex justify-between items-center h-16"> 
          <div className="flex items-center">
            {location.pathname === '/players' ? (
              <span className="flex items-center space-x-2">
                <button onClick={() => window.history.back()} className="w-8 h-8 flex items-center justify-center" style={{background: 'none', border: 'none', outline: 'none', left: 0}} aria-label="Back">
                  {/* Chevron Left SVG (lucide) */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-left-icon lucide-chevron-left  w-6 h-6">
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </button>
                <span className="flex items-center gap-2">
                  <span className={`text-lg font-semibold leading-tight ${location.pathname === '/players' ? 'text-white' : 'text-black'}`}>Player's Ranking</span>
                  <button 
                    onClick={() => window.dispatchEvent(new Event('showRules'))}
                    className="w-5 h-5 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                    aria-label="Show scoring rules"
                    title="Scoring Rules"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 16v-4" />
                      <path d="M12 8h.01" />
                    </svg>
                  </button>
                </span>
              </span>
            ) : (
              <>
                <Link to="/" className="flex items-center space-x-2">
                  <img src="/Wicket.svg" alt="FloData" className="h-[1.5rem] -mr-2 w-8 object-contain" />
                  <img src="/FCL 2025.svg" alt="FCL 2025" className="h-[1.2rem] -pl-2 object-contain" />
                </Link>
              </>
            )}
          </div>

          {/* Desktop & Mobile: show Sign In if logged out; Umpire hat dropdown (User/Umpire) if admin/umpire */}
          <div className="flex items-center space-x-4 lg:space-x-6">

            {/* On Players page show Rules button in navbar */}
            {location.pathname !== '/players' && (
              <div className="relative">
                {!currentUser ? (
                  <Link
                    to="/login"
                    aria-label="Sign In"
                    title="Sign In"
                    className="flex items-center justify-center p-0"
                  >
                    <span className="w-[44px] h-[44px] rounded-full bg-[#f5f8ff] flex items-center justify-center shadow-sm border border-[#e0e6f0]">
                      <img src="/Umpire1.svg" alt="Sign In" className="w-6 h-6 object-contain" />
                    </span>
                  </Link>
                ) : (
                  <>
                    <button
                      className="flex items-center justify-center p-0 focus:outline-none"
                      onClick={() => setMenuOpen((v) => !v)}
                      aria-haspopup="menu"
                      aria-expanded={menuOpen}
                      title="User Menu"
                    >
                      <span className="w-[44px] h-[44px] sm:w-[48px] sm:h-[48px] rounded-full bg-[#f5f8ff] flex items-center justify-center shadow-sm border border-[#e0e6f0]">
                        <img src="/Umpire1.svg" alt="User" className="w-10 h-10 sm:w-10 sm:h-10 object-contain" />
                      </span>
                    </button>

                    {menuOpen && (
                      <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-lg shadow-xl py-2 z-[9999]">
                        <Link
                          to="/profile"
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                          onClick={() => setMenuOpen(false)}
                        >
                          <UserIcon className="h-4 w-4" />
                          <span>Profile</span>
                        </Link>
                        {isUmpireAdmin && (
                          <>
                            <div className="border-t border-gray-200 my-1"></div>
                            <Link
                              to="/umpire"
                              className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                              onClick={() => setMenuOpen(false)}
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <ellipse cx="12" cy="10" rx="5" ry="2.5" fill="#fff" stroke="#222" strokeWidth="1.2" />
                                <rect x="7" y="11" width="10" height="1.2" rx="0.6" fill="#e89a2d" stroke="#222" strokeWidth="0.5" />
                                <ellipse cx="12" cy="13" rx="8" ry="2.5" fill="#fff" stroke="#222" strokeWidth="1.2" />
                                <ellipse cx="12" cy="14.2" rx="7" ry="1.2" fill="#bbb" opacity="0.5" />
                              </svg>
                              <span>Umpire</span>
                            </Link>
                            {userProfile?.isAdmin && (
                              <Link
                                to="/admin"
                                className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                onClick={() => setMenuOpen(false)}
                              >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                                  <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
                                </svg>
                                <span>Admin</span>
                              </Link>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation Menu (hamburger menu content if needed) */}
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