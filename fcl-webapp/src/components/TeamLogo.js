import React from 'react';

// Unified TeamLogo component used across the app
// Props:
// - team: { name?, logo?, logoUrl?, flag? }
// - size: 'sm' | 'md' | 'lg' | number (pixels)
// - className: extra classes
// - rounded: boolean (default true)
// - showInitialsFallback: boolean (default true)

export default function TeamLogo({ team = {}, size = 'md', className = '', rounded = true, showInitialsFallback = true, alt }) {
  const name = team?.name || 'Team';
  // Candidate coming from data (may be stale like old `flag` values)
  const candidate = team?.logo || team?.logoUrl || team?.flag || '';

  // Known mappings for bundled assets (normalized by name)
  let mapped = '';
  try {
    const nm = String(name || '').toLowerCase();
    const norm = nm.replace(/[^a-z0-9]/g, ''); // strip spaces/punctuation for robust matching
    if (norm.includes('geotitans')) {
      mapped = '/Teams/Geo Titans Final (1).png';
    } else if (norm.includes('fintechfalcons') || norm.includes('fintech')) {
      mapped = '/Teams/Fintech Falcons Final (3).png';
    } else if (norm.includes('dataninjas')) {
      mapped = '/Teams/Data Ninjas Final (1).png';
    } else if (norm.includes('mlmaverics')) {
      mapped = '/Teams/ML Mavericks Final (1).png';
    }
  } catch {}

  // Heuristic: treat "good" sources as data URLs, http(s), or files under /Teams/
  const isGood = (u) => {
    if (!u) return false;
    const s = String(u).trim();
    return s.startsWith('data:') || s.startsWith('http://') || s.startsWith('https://') || s.startsWith('/Teams/');
  };

  // Choose best source: prefer valid candidate; otherwise mapped; otherwise safe fallback
  const fallback = mapped || '/Teams/imgImage48.png';
  const [imgSrc, setImgSrc] = React.useState(isGood(candidate) ? candidate : fallback);

  // Allow responsive sizing: if `size` is a number or one of 'sm'|'md'|'lg' we derive fixed px sizes.
  // If `size` is set to a non-standard value (e.g. 'responsive'), we skip adding fixed width/height
  // so callers can provide responsive utility classes via `className`.
  let sizePx = null;
  if (typeof size === 'number') sizePx = size;
  else if (['sm','md','lg'].includes(size)) sizePx = ({ sm: 32, md: 48, lg: 56 }[size]);
  const dimClass = sizePx ? `w-[${sizePx}px] h-[${sizePx}px]` : '';
  const radiusClass = rounded ? 'rounded-full' : 'rounded-md';
  const baseClass = `${dimClass} ${radiusClass} object-cover  bg-white ${className}`.trim();

  // If src fails (404 etc.), fall back to a safe bundled asset
  const handleError = React.useCallback(() => {
    if (imgSrc !== fallback) setImgSrc(fallback);
  }, [imgSrc, fallback]);

  return <img src={imgSrc} onError={handleError} alt={alt || name} className={baseClass} />;
}
