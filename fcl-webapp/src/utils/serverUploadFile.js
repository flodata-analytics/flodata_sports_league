// Upload a file via our server endpoint to avoid browser CORS issues.
// Falls back to client-side upload if server is unavailable.
// Returns the public URL string on success. Retries with exponential backoff and per-attempt timeouts.

import { uploadImage, buildImagePath } from './uploadImage';

export async function serverUploadFile(file, name = 'file', folder = 'uploads', maxAttempts = 3) {
  if (!file) throw new Error('No file provided');
  
  // Try client-side upload first (more reliable, no server dependency)
  try {
    const path = buildImagePath(folder, name, file);
    const url = await uploadImage(file, path);
    return url;
  } catch (clientErr) {
    console.warn('Client-side upload failed, trying server:', clientErr);
    
    // Fall back to server upload
    let lastErr = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const form = new FormData();
        form.append('file', file);
        form.append('name', name);
        form.append('folder', folder);
        const timeoutMs = 30000 * attempt; // 30s, 60s, 90s
        const fetchPromise = fetch('/api/upload-team-logo', { method: 'POST', body: form });
        const resp = await Promise.race([
          fetchPromise,
          new Promise((_, rej) => setTimeout(() => rej(new Error('Upload timeout')), timeoutMs))
        ]);
        if (!resp.ok) {
          const text = await resp.text().catch(() => null);
          throw new Error(`Server upload failed: ${resp.status} ${resp.statusText} ${text || ''}`);
        }
        const body = await resp.json().catch(() => null);
        if (!body || !body.ok || !body.url) throw new Error(body?.error || 'Invalid server response');
        return body.url;
      } catch (err) {
        lastErr = err;
        if (attempt < maxAttempts) {
          // Exponential backoff: 2s, 4s, 8s
          const backoff = 1000 * Math.pow(2, attempt);
          await new Promise(r => setTimeout(r, backoff));
        }
      }
    }
    throw lastErr || clientErr;
  }
}
