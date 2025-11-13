/**
 * Get player avatar with fallback to default gender-based avatar
 * @param {Object} player - Player object with avatar and gender fields
 * @returns {string} Avatar URL
 */
export function getPlayerAvatar(player) {
  if (!player) return '/Teams/imgImage8.png'; // default male avatar

  const val = (player.avatar || '').trim();
  const isDefault = val === '/Teams/imgImage8.png' || val === '/Teams/imgImage48.png';

  // If player has an uploaded avatar URL (non-default), use it
  if (val && !isDefault) return val;

  // Fallback to gender-based default avatar
  const gender = (player.gender || '').toLowerCase();
  return gender === 'female' ? '/Teams/imgImage48.png' : '/Teams/imgImage8.png';
}

// Utility to help determine if a given avatar value is a custom upload
export function isCustomAvatar(avatar) {
  const val = (avatar || '').trim();
  if (!val) return false;
  if (val === '/Teams/imgImage8.png' || val === '/Teams/imgImage48.png') return false;
  return true;
}
