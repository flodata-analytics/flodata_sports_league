import { getFirestore, writeBatch } from 'firebase/firestore';

// Simple debounced write queue to merge rapid updates per document.
// Use queueUpdate(docRef, partialData) instead of updateDoc for high-frequency paths.
const _queue = new Map(); // key -> { docRef, data }
let _flushTimer = null;
const DEBOUNCE_MS = 250; // adjust if needed

function scheduleFlush() {
  if (_flushTimer) return;
  _flushTimer = setTimeout(() => {
    flush().catch(() => {});
  }, DEBOUNCE_MS);
}

export function queueUpdate(docRef, data) {
  if (!docRef || !data || typeof data !== 'object') return;
  const key = docRef.path;
  const existing = _queue.get(key);
  if (existing) {
    // Shallow merge; later keys override earlier.
    existing.data = { ...existing.data, ...data };
  } else {
    _queue.set(key, { docRef, data: { ...data } });
  }
  scheduleFlush();
}

export async function flush() {
  if (!_queue.size) {
    _flushTimer = null;
    return;
  }
  const db = getFirestore();
  const batch = writeBatch(db);
  for (const { docRef, data } of _queue.values()) {
    batch.set(docRef, data, { merge: true });
  }
  _queue.clear();
  _flushTimer = null;
  await batch.commit();
}

export async function immediateFlush() {
  if (_flushTimer) {
    clearTimeout(_flushTimer);
    _flushTimer = null;
  }
  await flush();
}

export function queueSize() { return _queue.size; }
