// Firebase configuration
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { initializeFirestore, connectFirestoreEmulator, setLogLevel } from 'firebase/firestore';
// Firestore Lite (REST-based) for read operations in restricted networks
import { getFirestore as getFirestoreLite } from 'firebase/firestore/lite';
// Optional analytics (guarded so it doesn't break in unsupported environments)
import { getAnalytics, isSupported as analyticsIsSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyA7lK5BiXhTuAwCJFVZq3DaSfnEyvNNCu4",
  authDomain: "flodata-tournaments.firebaseapp.com",
  projectId: "flodata-tournaments",
  // Storage bucket should use the appspot.com domain, not firebasestorage.app
  // firebasestorage.app is used for download URLs, not the bucket name
  // storageBucket retained only as part of original config; Storage not used anymore
  storageBucket: "flodata-tournaments.appspot.com",
  messagingSenderId: "555922157691",
  appId: "1:555922157691:web:11b1b3d0012b4d11def2de",
  measurementId: "G-ZEDL3CJY73"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Cloud Storage removed – avatars/logos now stored inline (base64) in Firestore documents.

// Initialize Cloud Firestore and get a reference to the service
// Use long polling/fetch stream fallbacks to avoid WebChannel 400 errors in restricted networks
export const db = initializeFirestore(app, {
  // Strongest compatibility for restricted networks
  experimentalForceLongPolling: true,
  // Avoid streamed fetch responses some proxies break
  useFetchStreams: false,
  // Improve stability of long polling
  experimentalLongPollingOptions: { timeoutSeconds: 30 },
  // Prevent undefined fields from causing write errors
  ignoreUndefinedProperties: true,
});

// Firestore Lite instance (uses REST under the hood, no streams)
export const dbLite = getFirestoreLite(app);


// Optional: verbose Firestore logs in development to diagnose transport issues
try {
  const desired = process.env.REACT_APP_FIREBASE_LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'error' : 'silent');
  setLogLevel(desired);
} catch {}

// Optional: connect to local emulators for fully offline development
// Set REACT_APP_USE_FIREBASE_EMULATORS=true in your .env.local to enable
if (process.env.REACT_APP_USE_FIREBASE_EMULATORS === 'true') {
  try {
    // Auth emulator
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  } catch {}
  try {
    // Firestore emulator
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  } catch {}
}

// Optional: Initialize Analytics only when supported and not in tests
if (process.env.NODE_ENV !== 'test') {
  analyticsIsSupported().then((supported) => {
    if (supported) {
      try { getAnalytics(app); } catch {}
    }
  });
}

export default app;