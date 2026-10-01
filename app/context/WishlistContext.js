import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from './AuthContext';
import { usePhotoAccess } from '../hooks/usePhotoAccess';
import { wishlistStore, saveWish } from '../services/wishlistService';
import { getCloudAccount, readCloudWishlist, saveCloudWish } from '../services/cloudBackupService';
import { mergeWishes } from '../utils/wishlist';
const Context = createContext(null);
export function WishlistProvider({ children }) {
  const { notebookId, account } = useAuth();
  const { canAddPhotos: premium, preview } = usePhotoAccess();
  const active = useRef(null);
  const [snapshot, setSnapshot] = useState(null);
  const [message, setMessage] = useState('');
  const syncRef = useRef(() => {});
  useEffect(() => {
    const token = { notebookId, alive: true, busy: false, loaded: false };
    active.current = token;
    setSnapshot(null); setMessage('Načítavam moje sny…');
    const current = () => token.alive && active.current === token;
    const cloudCurrent = () => current() && account?.uid && getCloudAccount()?.uid === account.uid;
    const publish = items => { if (current()) setSnapshot({ notebookId, items }); };
    const sync = async () => {
      if (!token.loaded || token.busy || AppState.currentState !== 'active' || !cloudCurrent()) return;
      token.busy = true;
      try {
        setMessage('Zálohujem moje sny…');
        const remote = mergeWishes(await readCloudWishlist(account.uid));
        if (!cloudCurrent()) return;
        let local = await wishlistStore(notebookId, remote);
        if (!cloudCurrent()) return;
        publish(local);
        const remoteById = new Map(remote.map(item => [item.id, JSON.stringify(item)]));
        for (const item of local) {
          if (!cloudCurrent()) return;
          if (remoteById.get(item.id) === JSON.stringify(item)) continue;
          const saved = await saveCloudWish(account.uid, item, mergeWishes);
          if (!cloudCurrent()) return;
          local = await wishlistStore(notebookId, [saved]);
          remoteById.set(saved.id, JSON.stringify(saved));
        }
        if (!cloudCurrent()) return;
        // Re-read so edits made during upload are never replaced by an older UI snapshot.
        const latest = await wishlistStore(notebookId);
        publish(latest);
        if (current()) setMessage(latest.every(item => remoteById.get(item.id) === JSON.stringify(item))
          ? 'Moje sny sú zálohované. Synchronizácia prebieha automaticky.'
          : 'Zmena je uložená v telefóne; čaká na ďalšiu synchronizáciu.');
      } catch (error) {
        if (current()) setMessage(error.code === 'permission-denied'
          ? 'Uložené v telefóne. Cloud pre Moje sny potrebuje aktualizovať pravidlá Firebase.'
          : 'Uložené v telefóne. Synchronizáciu skúsime znova po pripojení.');
      } finally { token.busy = false; }
    };
    syncRef.current = sync;
    if (notebookId) wishlistStore(notebookId).then(items => {
      if (!current()) return;
      token.loaded = true; publish(items);
      setMessage(account ? 'Čakám na synchronizáciu…' : 'Uložené v tomto telefóne. Pre cloud používaj prihlásený účet.');
      sync();
    }).catch(() => { if (current()) setMessage('Moje sny sa nepodarilo načítať. Skús aplikáciu znovu otvoriť.'); });
    const timer = setInterval(sync, 30000);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') sync(); });
    return () => { token.alive = false; clearInterval(timer); listener.remove(); };
  }, [notebookId, account?.uid]);
  const mutate = async (data, remove = false) => {
    const token = active.current;
    if (!token?.loaded || token.notebookId !== notebookId) throw new Error('Počkaj na načítanie mojich snov.');
    if (!remove && !premium) throw new Error('Pridávanie a úpravy mojich snov sú súčasťou Premium.');
    await saveWish(notebookId, data, remove);
    if (!token.alive || active.current !== token) return;
    const items = await wishlistStore(notebookId);
    if (!token.alive || active.current !== token) return;
    setSnapshot({ notebookId, items });
    setMessage(account ? 'Zmena je uložená v telefóne; čaká na synchronizáciu.' : 'Uložené v tomto telefóne.');
    syncRef.current();
  };
  const items = snapshot?.notebookId === notebookId ? snapshot.items.filter(item => !item.deleted).sort((a, b) => b.changedAt - a.changedAt) : [];
  return <Context.Provider value={{ items, premium, preview, message, ready: !!notebookId && snapshot?.notebookId === notebookId,
    save: data => mutate(data), remove: data => mutate(data, true), sync: () => syncRef.current() }}>{children}</Context.Provider>;
}
export const useWishlist = () => useContext(Context);
