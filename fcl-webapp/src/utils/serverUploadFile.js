// Upload a file via our server endpoint to avoid browser CORS issues.
// Falls back to client-side upload if server is unavailable.
// Returns the public URL string on success. Retries with exponential backoff and per-attempt timeouts.

// Deprecated: serverUploadFile previously proxied uploads to Firebase Storage.
// Storage has been removed; use FileReader to convert images to base64 and store inline.
export async function serverUploadFile() {
  throw new Error('serverUploadFile is deprecated: use base64 inline storage');
}
