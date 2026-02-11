import {useEffect, useMemo, useState} from 'react';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  where,
  limit,
} from 'firebase/firestore';
import {db} from '../firebase';

export function useDocument(collectionName, documentId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!documentId) {
      setLoading(false);
      return;
    }
    const unsub = onSnapshot(
      doc(db, collectionName, documentId),
      snap => {
        setData(snap.exists() ? {id: snap.id, ...snap.data()} : null);
        setLoading(false);
      },
      err => {
        setError(err);
        setLoading(false);
      },
    );
    return unsub;
  }, [collectionName, documentId]);

  const refetch = async () => {
    const snap = await getDoc(doc(db, collectionName, documentId));
    setData(snap.exists() ? {id: snap.id, ...snap.data()} : null);
  };

  return {data, loading, error, refetch};
}

export function useCollection(collectionName, orderByField = null, whereConditions = [], limitCount = null) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const key = JSON.stringify(whereConditions);
  const clauses = useMemo(() => JSON.parse(key), [key]);

  useEffect(() => {
    const refs = [collection(db, collectionName)];
    clauses.forEach(c => refs.push(where(c.field, c.operator, c.value)));
    if (orderByField) refs.push(orderBy(orderByField));
    if (limitCount) refs.push(limit(limitCount));

    const unsub = onSnapshot(
      query(...refs),
      snaps => {
        setData(snaps.docs.map(d => ({id: d.id, ...d.data()})));
        setLoading(false);
      },
      err => {
        setError(err);
        setLoading(false);
      },
    );

    return unsub;
  }, [collectionName, orderByField, limitCount, clauses]);

  return {data, loading, error};
}
