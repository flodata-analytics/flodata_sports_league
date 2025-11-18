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
  // Attempt to extract a provided logo URL
  let src = team?.logo || team?.logoUrl || team?.flag || null;
  // If team name matches one of the confirmed teams, prefer bundled SVG assets
  try {
    const nm = String(name || '').toLowerCase();
    if (!src) {
      if (nm.includes('geotitan') || nm.includes('geotitans')) {
        src = '/Teams/GeoTitans Logo.svg';
      } else if (nm.includes('fintech') || nm.includes('fintech falcon') || nm.includes('fintech falcons')) {
        src = '/Teams/Fintech Falcons Logo.svg';
      }
    }
  } catch (e) {
    // ignore
  }
  // If no image was uploaded, use deterministic fallback: Team1 / Team2 based on optional index or name hash.
  if (!src) {
    // For predictable fallback we examine team.key / id / name to derive a number
    const key = String(team?.id || team?.key || name).toLowerCase();
    let hash = 0;
    for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) & 0xffff;
    const which = (hash % 2) === 0 ? 1 : 2;
    src = which === 1 ? '/Team1.png' : '/Team2.png';
  }

  // Allow responsive sizing: if `size` is a number or one of 'sm'|'md'|'lg' we derive fixed px sizes.
  // If `size` is set to a non-standard value (e.g. 'responsive'), we skip adding fixed width/height
  // so callers can provide responsive utility classes via `className`.
  let sizePx = null;
  if (typeof size === 'number') sizePx = size;
  else if (['sm','md','lg'].includes(size)) sizePx = ({ sm: 32, md: 48, lg: 56 }[size]);
  const dimClass = sizePx ? `w-[${sizePx}px] h-[${sizePx}px]` : '';
  const radiusClass = rounded ? 'rounded-full' : 'rounded-md';
  const baseClass = `${dimClass} ${radiusClass} object-cover  bg-white ${className}`.trim();


  // If src resolved (including fallback), render it; no initials fallback needed because we always have an image now.
  return <img src={src} alt={alt || name} className={baseClass} />;
}
