import React, { useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// Simple swipe detector that navigates between bottom tabs
// Tabs order matches BottomNav: '/', '/players', '/auction', '/videos'
const TABS = ['/', '/players', '/auction', '/videos'];
const THRESHOLD_PX = 50; // minimum horizontal distance for a swipe

export default function SwipeNavigator({ children }) {
  const startX = useRef(0);
  const startY = useRef(0);
  const tracking = useRef(false);
  const location = useLocation();
  const navigate = useNavigate();

  const onTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    startX.current = t.clientX;
    startY.current = t.clientY;
    tracking.current = true;
  };

  const onTouchMove = (e) => {
    // If vertical movement is dominant early, stop tracking to avoid accidental swipes
    if (!tracking.current) return;
    const t = e.touches[0];
    const dx = t.clientX - startX.current;
    const dy = t.clientY - startY.current;
    if (Math.abs(dy) > Math.abs(dx)) {
      tracking.current = false;
    }
  };

  const onTouchEnd = () => {
    if (!tracking.current) return;
    tracking.current = false;
    const currentPath = location.pathname;
    const idx = TABS.indexOf(currentPath);
    if (idx === -1) return; // only active on tab routes

    // We stored only the start; use last known values via closures
    // To compute dx, we need the last move; simplify by reading from last start vs end isn't stored.
    // Implement using a small hack: attach end listener via touchstart target? Simpler approach: use TouchEvent.changedTouches
  };

  const onTouchEndWithEvent = (e) => {
    if (!tracking.current) return;
    tracking.current = false;
    const t = e.changedTouches && e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - startX.current;
    const dy = t.clientY - startY.current;
    if (Math.abs(dx) < THRESHOLD_PX || Math.abs(dx) < Math.abs(dy)) return;

    const currentPath = location.pathname;
    const idx = TABS.indexOf(currentPath);
    if (idx === -1) return;

    if (dx < 0) {
      // swipe left -> next tab
      const next = Math.min(idx + 1, TABS.length - 1);
      if (next !== idx) navigate(TABS[next]);
    } else {
      // swipe right -> previous tab
      const prev = Math.max(idx - 1, 0);
      if (prev !== idx) navigate(TABS[prev]);
    }
  };

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEndWithEvent}
      className="min-h-screen"
    >
      {children}
    </div>
  );
}
