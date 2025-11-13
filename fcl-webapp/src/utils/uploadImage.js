import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

/**
 * Upload an image file to Firebase Storage and return its download URL.
 * @param {File} file - The image file to upload
 * @param {string} path - The storage path (e.g., `team-logos/abcd.png`)
 * @param {(progress:number)=>void} [onProgress] - Optional progress callback 0-100
 * @returns {Promise<string>} - Resolves with the download URL
 */
export function uploadImage(file, path, onProgress) {
  return new Promise((resolve, reject) => {
    try {
      const storageRef = ref(storage, path);
      const task = uploadBytesResumable(storageRef, file, { contentType: file.type || 'image/*' });
      task.on('state_changed', (snap) => {
        if (onProgress) {
          const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          onProgress(pct);
        }
      }, reject, async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve(url);
        } catch (e) { reject(e); }
      });
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Build a safe file name for storage based on an entity name and the file.
 */
export function buildImagePath(folder, displayName, file) {
  const name = String(displayName || 'untitled').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const ts = Date.now();
  const ext = (file && file.name && file.name.includes('.')) ? file.name.split('.').pop() : 'png';
  return `${folder}/${name}-${ts}.${ext}`;
}
