// Deprecated: Firebase Storage removed from project.
// These stubs remain only to avoid import errors in any legacy code paths.
// New code should convert images to base64 (data URLs) and store inline in Firestore.
export function uploadImage() {
  return Promise.reject(new Error('uploadImage is deprecated: use base64 inline storage'));
}
export function buildImagePath() {
  return '';
}
