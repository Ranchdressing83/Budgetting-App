import { useAuth } from '@/components/AuthContext';
import { db } from '@/config/firebase';
import { migrateCollection } from '@/lib/migration';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';

export function useFirestoreSync(collectionName, options = {}) {
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const lastRemoteFingerprint = useRef('');
  const isSavingRef = useRef(false);
  const isCreatingDocRef = useRef(false);

  const getDocRef = useCallback(() => {
    if (!user) {
      return null;
    }
    return doc(db, 'users', user.uid, collectionName, 'data');
  }, [user, collectionName]);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      setIsReady(false);
      return;
    }

    const docRef = getDocRef();
    let cancelled = false;

    const unsubscribe = onSnapshot(
      docRef,
      async (snapshot) => {
        if (cancelled) {
          return;
        }

        if (snapshot.exists()) {
          const data = snapshot.data();
          const loadedItems = data.items || [];
          const loadedMeta = data.meta || {};
          const fingerprint = JSON.stringify({ items: loadedItems, meta: loadedMeta });
          lastRemoteFingerprint.current = fingerprint;
          setItems(loadedItems);
          setMeta(loadedMeta);
          setIsLoading(false);
          setIsReady(true);
          return;
        }

        if (isCreatingDocRef.current) {
          return;
        }

        isCreatingDocRef.current = true;

        try {
          const { getDefaultItems, getDefaultMeta } = optionsRef.current;
          const migrated = await migrateCollection(collectionName);
          const itemsToSave = migrated?.items ?? getDefaultItems?.() ?? [];
          const metaToSave = migrated?.meta ?? getDefaultMeta?.() ?? {};

          await setDoc(docRef, {
            items: itemsToSave,
            meta: metaToSave,
            updatedAt: serverTimestamp(),
          });
        } catch (error) {
          console.error(`Error initializing ${collectionName} in Firestore:`, error);
          setIsLoading(false);
        } finally {
          isCreatingDocRef.current = false;
        }
      },
      (error) => {
        console.error(`Firestore sync error (${collectionName}):`, error);
        setIsLoading(false);
      }
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [user, collectionName, getDocRef]);

  useEffect(() => {
    if (!user || !isReady || isLoading) {
      return;
    }

    const fingerprint = JSON.stringify({ items, meta });
    if (fingerprint === lastRemoteFingerprint.current) {
      return;
    }
    if (isSavingRef.current) {
      return;
    }

    const docRef = getDocRef();
    isSavingRef.current = true;

    setDoc(docRef, {
      items,
      meta,
      updatedAt: serverTimestamp(),
    })
      .then(() => {
        lastRemoteFingerprint.current = fingerprint;
      })
      .catch((error) => {
        console.error(`Error saving ${collectionName}:`, error);
      })
      .finally(() => {
        isSavingRef.current = false;
      });
  }, [items, meta, user, isReady, isLoading, collectionName, getDocRef]);

  return {
    items,
    setItems,
    meta,
    setMeta,
    isLoading,
    isReady,
  };
}
