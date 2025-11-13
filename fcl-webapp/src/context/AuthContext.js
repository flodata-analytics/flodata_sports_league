import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged
} from 'firebase/auth';
// Use full Firestore for writes, Lite for reads (to avoid streaming)
import { doc, updateDoc } from 'firebase/firestore';
import { doc as liteDoc, getDoc as getDocLite } from 'firebase/firestore/lite';
import { auth, db, dbLite } from '../firebase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Registration flow removed

  async function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  async function logout() {
    setUserProfile(null);
    return signOut(auth);
  }

  async function getUserProfile(uid) {
    try {
      const docRef = liteDoc(dbLite, 'users', uid);
      const docSnap = await getDocLite(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          ...data,
          avatarUrl: data.avatarUrl || data.photoURL || '',
          photoURL: data.photoURL || data.avatarUrl || ''
        };
      }
      return null;
    } catch (e) {
      // Gracefully handle offline or network errors (avoid console noise in production)
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.warn('getUserProfile failed (offline?):', e?.message || e);
      }
      return null;
    }
  }

  async function makeUserAdmin(uid) {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, { isAdmin: true });
  }

  async function updateUserCoins(uid, coins) {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, { coins });
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      try {
        if (user) {
          let profile = await getUserProfile(user.uid);
          // Admin override via env (no Firestore write needed)
          try {
            const adminEmails = (process.env.REACT_APP_ADMIN_EMAILS || '')
              .split(',')
              .map(e => e.trim().toLowerCase())
              .filter(Boolean);
            if (user.email && adminEmails.includes(user.email.toLowerCase())) {
              profile = { ...(profile || {}), isAdmin: true };
            }
          } catch {}
          setUserProfile(profile);
        } else {
          setUserProfile(null);
        }
      } catch (e) {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.warn('Auth state profile fetch failed:', e?.message || e);
        }
        // Keep UI functional with minimal fallback when offline
        if (user) {
          setUserProfile({
            displayName: user.displayName || 'User',
            email: user.email || '',
            coins: 0,
            isAdmin: false,
            avatarUrl: user.photoURL || '',
            photoURL: user.photoURL || ''
          });
        } else {
          setUserProfile(null);
        }
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userProfile,
    login,
    logout,
    getUserProfile,
    updateUserCoins,
    makeUserAdmin
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}