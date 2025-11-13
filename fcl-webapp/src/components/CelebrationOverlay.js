import React, { useEffect, useMemo, useState } from 'react';

// Simple Web Audio tones to avoid heavy assets
function playTonePattern(kind, subkind) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.15, now + 0.01);


    // Cuter, more distinct sounds
    const patterns = {
      four: [523.25, 659.25, 783.99, 1046.5], // C5 E5 G5 C6 (sparkle)
      six: [392.00, 523.25, 659.25, 784.00, 1046.5, 1318.5], // G4 C5 E5 G5 C6 E6 (jingle)
      wicket: {
        bowled: [659.25, 523.25, 392.00, 196.00], // down
        caught: [440.00, 523.25, 440.00, 659.25], // ping
        lbw: [493.88, 440.00, 415.30, 392.00], // tense
        'run out': [659.25, 392.00, 784.00],
        stumped: [523.25, 493.88, 440.00, 392.00],
        'hit wicket': [659.25, 415.30, 329.63, 196.00],
        default: [523.25, 440.00, 392.00, 349.23],
      },
      special: [523.25, 587.33, 659.25, 698.46, 783.99, 1046.5],
    };

    const seq = kind === 'wicket'
      ? (patterns.wicket[subkind] || patterns.wicket.default)
      : (patterns[kind] || patterns.special);

    let t = now;
    seq.forEach((freq, i) => {
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.12, t);
      t += 0.11;
      g.gain.exponentialRampToValueAtTime(0.001, t - 0.02);
    });
    o.start(now);
    o.stop(t + 0.05);
    setTimeout(()=> ctx.close(), (t - now + 0.1) * 1000);
  } catch {}
}

export default function CelebrationOverlay({ event, onDone }) {
  const [visible, setVisible] = useState(!!event);

  useEffect(() => {
    if (!event) return;
    setVisible(true);
    playTonePattern(event.kind, event.subkind);
    const id = setTimeout(() => { setVisible(false); onDone?.(); }, 2200);
    return () => clearTimeout(id);
  }, [event, onDone]);

  // More confetti for six, sparkle for four
  const Confetti = useMemo(() => {
    let count = 26;
    let confettiClass = 'cele-confetti';
    let colors = ['#34d399','#60a5fa','#f472b6','#fbbf24','#a78bfa'];
    if (event?.kind === 'six') { count = 44; colors = ['#fbbf24','#f472b6','#60a5fa','#34d399','#a78bfa','#fff176','#ff8a65']; }
    if (event?.kind === 'four') { confettiClass = 'cele-confetti cele-sparkle'; colors = ['#fff176','#fbbf24','#f472b6','#b2f5ea','#a78bfa']; }
    return new Array(count).fill(0).map((_, i) => {
      const left = Math.round(Math.random() * 100);
      const delay = Math.random() * 0.6;
      const color = colors[i % colors.length];
      return (
        <span
          key={i}
          className={confettiClass}
          style={{ left: `${left}%`, animationDelay: `${delay}s`, backgroundColor: color }}
        />
      );
    });
  }, [event]);

  if (!visible || !event) return null;

  const label = event.kind === 'four' ? 'FOUR!'
    : event.kind === 'six' ? 'SIX!'
    : event.kind === 'wicket' ? (event.subkind ? `WICKET • ${event.subkind.toUpperCase()}` : 'WICKET!')
    : event.kind === 'special' ? (event.title || 'SPECIAL')
    : '';

  // Unique animation per event
  let badgeAnim = '';
  if (event?.kind === 'six') badgeAnim = 'cele-anim-bounce cele-flash-bg';
  else if (event?.kind === 'four') badgeAnim = 'cele-anim-sparkle';
  else if (event?.kind === 'wicket') {
    const s = (event.subkind || '').toLowerCase();
    if (s.includes('bowled') || s.includes('hit wicket')) badgeAnim = 'cele-anim-smash';
    else if (s.includes('lbw')) badgeAnim = 'cele-anim-shake';
    else if (s.includes('run out') || s.includes('stumped') || s.includes('caught')) badgeAnim = 'cele-anim-wiggle';
    else badgeAnim = 'cele-anim-shake';
  }

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
      {/* dim bg */}
      <div className="absolute inset-0 bg-black/20" />

      {/* confetti for 4/6/special */}
      {(event.kind === 'four' || event.kind === 'six' || event.kind === 'special') && (
        <div className="absolute inset-0 overflow-hidden">{Confetti}</div>
      )}

      {/* badge */}
      <div className={`cele-badge ${event.kind === 'wicket' ? 'cele-badge-wicket' : 'cele-badge-good'} ${badgeAnim}`}>
        <span className="cele-text">{label}</span>
      </div>
      {/* flash for six */}
      {event.kind === 'six' && <div className="cele-flash" />}
    </div>
  );
}
