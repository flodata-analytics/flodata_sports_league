import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';
import {onAuthStateChanged, signInWithEmailAndPassword, signOut} from 'firebase/auth';
import {doc, getDoc, updateDoc} from 'firebase/firestore';
import {auth, db} from '../firebase';

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({children}) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const getUserProfile = async uid => {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? snap.data() : null;
  };

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password);

  const logout = () => signOut(auth);

  const updateUserCoins = async (uid, coins) => updateDoc(doc(db, 'users', uid), {coins});

  const makeUserAdmin = async uid => updateDoc(doc(db, 'users', uid), {isAdmin: true});

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      setCurrentUser(user);
      if (!user) {
        setUserProfile(null);
        setLoading(false);
        return;
      }
      try {
        const p = await getUserProfile(user.uid);
        setUserProfile(p);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  const value = useMemo(
    () => ({currentUser, userProfile, login, logout, updateUserCoins, makeUserAdmin, getUserProfile}),
    [currentUser, userProfile],
  );

  if (loading) {
    return null;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
