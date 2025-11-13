import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ErrorBoundary from './components/ErrorBoundary';
import Home from './pages/Home';
import Login from './pages/Login';
import Players from './pages/Players';
import TeamADetail from './pages/TeamADetail';
import AuctionPage from './pages/BiddingPage';
// AdminPanel route moved to Umpire; keep a redirect for legacy links
import Umpire from './pages/Umpire';
import UserProfile from './pages/UserProfile';
import PlayerProfile from './pages/PlayerProfile';
import MatchDetails from './pages/MatchDetails';
import FullScorecard from './pages/FullScorecard';
import './App.css';
import BottomNav from './components/BottomNav';
import TeamSheet from './pages/TeamSheet';

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

function AppContent() {
  const location = useLocation();
  // Disable top/bottom padding when viewing FullScorecard pages
  const isFullScore = location.pathname && location.pathname.startsWith('/scorecard');
  const wrapperClass = isFullScore ? 'App overflow-x-hidden w-full' : 'App pb-24 md:pb-0 pt-16 overflow-x-hidden w-full';
  const wrapperStyle = isFullScore ? {} : { paddingTop: 'calc(env(safe-area-inset-top, 0px) + 4rem)' };

  return (
    <div className={wrapperClass} style={wrapperStyle}>{/* top padding for fixed navbar; bottom padding on mobile only so content not hidden behind tab bar */}
      <Navbar />
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
            <Route path="/players" element={<Players />} />
          <Route path="/auction" element={<AuctionPage />} />
          {/* Legacy route redirect */}
          <Route path="/admin" element={<Navigate to="/umpire" replace />} />
          <Route path="/umpire" element={<Umpire />} />
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/players/:playerId" element={<PlayerProfile />} />
          <Route path="/player/:playerId" element={<PlayerProfile />} />
          <Route path="/match/:matchId" element={<MatchDetails />} />
          <Route path="/scorecard/:matchId" element={<FullScorecard />} />
          <Route path="/team/:teamId" element={<TeamADetail />} />
          <Route path="/team-sheet/:matchId/:teamKey" element={<TeamSheet />} />
          <Route path="/videos" element={React.createElement(require('./pages/Videos').default)} />
        </Routes>
      </ErrorBoundary>
      <BottomNav />
    </div>
  );
}

export default App;
