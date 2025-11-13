// Simple API helper to select base URL and handle JSON/errors consistently

export function getApiBase() {
  const envBase = (process.env.REACT_APP_API_BASE || '').trim();
  if (envBase) return envBase.replace(/\/$/, '');
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      // Dev fallback to local OTP server default
      return 'http://localhost:5001/api';
    }
  }
  // Default to relative /api for production where a reverse proxy may exist
  return '/api';
}

export async function apiFetch(path, options = {}) {
  const base = getApiBase();
  const url = /^https?:\/\//i.test(path)
    ? path
    : `${base}${path.startsWith('/') ? path : `/${path}`}`;

  const res = await fetch(url, options);
  let data = null;
  try {
    data = await res.json();
  } catch {}

  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `${res.status} ${res.statusText}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}
