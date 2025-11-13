import { useState, useEffect, useRef } from 'react';
// Use full Firestore SDK for real-time listeners (onSnapshot)
import {
  doc,
  collection,
  query as fsQuery,
  orderBy as fsOrderBy,
  where as fsWhere,
  limit as fsLimit,
  onSnapshot,
  getDoc,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebase';

// Hook for real-time document updates (frontend-only onSnapshot)
export function useDocument(collectionName, documentId, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const unsubRef = useRef(null);

  useEffect(() => {
    const enabled = options?.enabled !== false;
    if (!documentId || !enabled) {
      setLoading(false);
      return;
    }

    const docRef = doc(db, collectionName, documentId);
    setLoading(true);
    const unsubscribe = onSnapshot(docRef, (snap) => {
      const d = snap.exists() ? { id: snap.id, ...snap.data() } : null;
      setData(d);
      setError(null);
      setLoading(false);
    }, (err) => {
      setError(err);
      setLoading(false);
    });
    unsubRef.current = unsubscribe;
    return () => { if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; } };
  }, [collectionName, documentId, options?.enabled]);

  // Expose a manual refetch for on-demand refresh
  const refetch = async () => {
    try {
      const snap = await getDoc(doc(db, collectionName, documentId));
      if (snap.exists()) setData({ id: snap.id, ...snap.data() });
    } catch (e) { setError(e); }
  };

  return { data, loading, error, refetch };
}

// Hook for real-time collection updates (frontend-only onSnapshot)
export function useCollection(collectionName, orderByField = null, whereConditions = [], limitCount = null, options = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const unsubRef = useRef(null);

  // Create stable reference for whereConditions
  const whereConditionsString = JSON.stringify(whereConditions);

  useEffect(() => {
    const enabled = options?.enabled !== false;
    // If disabled, ensure any existing poller is unsubscribed and do nothing
    if (!enabled) {
      setLoading(false);
      return () => { if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; } };
    }

    let q = collection(db, collectionName);

    // Apply where conditions
    const conditions = JSON.parse(whereConditionsString);
    conditions.forEach(condition => {
      q = fsQuery(q, fsWhere(condition.field, condition.operator, condition.value));
    });

    // Apply ordering
    if (orderByField) {
      q = fsQuery(q, fsOrderBy(orderByField));
    }
    if (Number.isInteger(limitCount) && limitCount > 0) {
      q = fsQuery(q, fsLimit(limitCount));
    }

    setLoading(true);
    const unsubscribe = onSnapshot(q, (snaps) => {
      const docs = [];
      snaps.forEach((d) => docs.push({ id: d.id, ...d.data() }));
      setData(docs);
      setError(null);
      setLoading(false);
    }, (err) => {
      setError(err);
      setLoading(false);
    });
    unsubRef.current = unsubscribe;
    return () => { if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; } };
  }, [collectionName, orderByField, whereConditionsString, limitCount, options?.enabled]);

  const refetch = async () => {
    try {
      let q = collection(db, collectionName);
      const conditions = JSON.parse(whereConditionsString);
      conditions.forEach(condition => { q = fsQuery(q, fsWhere(condition.field, condition.operator, condition.value)); });
      if (orderByField) q = fsQuery(q, fsOrderBy(orderByField));
      if (Number.isInteger(limitCount) && limitCount > 0) q = fsQuery(q, fsLimit(limitCount));
      const snaps = await getDocs(q);
      const docs = []; snaps.forEach((d) => docs.push({ id: d.id, ...d.data() }));
      setData(docs);
    } catch (e) { setError(e); }
  };

  return { data, loading, error, refetch };
}

// Hook specifically for live match data
export function useLiveMatch(matchId) {
  return useDocument('matches', matchId);
}

// Hook for player bids
export function usePlayerBids(playerId) {
  return useCollection('bids', 'bidAmount', [
    { field: 'playerId', operator: '==', value: playerId },
    { field: 'isActive', operator: '==', value: true }
  ]);
}