import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { portableTrips } from '../utils/backup';
import { cloudConfigured, readCloudBackup, saveCloudBackup, watchCloudAccount } from '../services/cloudBackupService';
import { useTrips } from './TripsContext';

const CloudSyncContext = createContext(null);
const fingerprint = (trips) => JSON.stringify(portableTrips(trips).sort((a, b) => a.id.localeCompare(b.id)));

export function CloudSyncProvider({ children }) {
  const { trips, loading, restoreBackup } = useTrips();
  const [account, setAccount] = useState(null);
  const [status, setStatus] = useState(cloudConfigured ? 'local' : 'unavailable');
  const [message, setMessage] = useState('');
  const revision = useRef(null);
  const lastSaved = useRef('');
  const readyFor = useRef(null);
  const syncing = useRef(false);
  const retryTimer = useRef(null);
  const tripsRef = useRef(trips);
  tripsRef.current = trips;

  useEffect(() => {
    if (!cloudConfigured) return undefined;
    try {
      return watchCloudAccount((nextAccount) => {
        clearTimeout(retryTimer.current);
        setAccount(nextAccount);
        readyFor.current = null;
        revision.current = null;
        lastSaved.current = '';
        setStatus(nextAccount ? 'connecting' : 'local');
        setMessage('');
      });
    } catch (error) {
      setStatus('error');
      setMessage(error.message || 'Cloud sa nepodarilo spustiť.');
      return undefined;
    }
  }, []);

  const initialize = useCallback(async () => {
    if (!account || loading || syncing.current || readyFor.current === account.uid) return;
    syncing.current = true;
    setStatus('syncing');
    try {
      const remote = await readCloudBackup();
      let combined = tripsRef.current;
      if (remote) combined = await restoreBackup(remote.trips);
      const currentFingerprint = fingerprint(combined);
      const remoteFingerprint = remote ? fingerprint(remote.trips) : '';
      revision.current = remote?.revision || null;
      if (!remote || currentFingerprint !== remoteFingerprint) {
        const saved = await saveCloudBackup(combined, revision.current);
        revision.current = saved.revision;
      }
      lastSaved.current = currentFingerprint;
      readyFor.current = account.uid;
      setStatus('synced');
      setMessage('Návštevy sú automaticky uložené.');
    } catch (error) {
      setStatus('pending');
      setMessage('Automatické uloženie čaká na pripojenie. Lokálne údaje zostali zachované.');
      clearTimeout(retryTimer.current);
      retryTimer.current = setTimeout(initialize, 30000);
    } finally {
      syncing.current = false;
    }
  }, [account, loading, restoreBackup]);

  useEffect(() => { initialize(); return () => clearTimeout(retryTimer.current); }, [initialize]);

  useEffect(() => {
    if (!account || readyFor.current !== account.uid || syncing.current) return undefined;
    const nextFingerprint = fingerprint(trips);
    if (nextFingerprint === lastSaved.current) return undefined;
    setStatus('pending');
    const timer = setTimeout(async () => {
      syncing.current = true;
      setStatus('syncing');
      try {
        const saved = await saveCloudBackup(trips, revision.current);
        revision.current = saved.revision;
        lastSaved.current = nextFingerprint;
        setStatus('synced');
        setMessage('Návštevy sú automaticky uložené.');
      } catch (error) {
        readyFor.current = null;
        setStatus('pending');
        setMessage('Automatické uloženie čaká na pripojenie. Lokálne údaje zostali zachované.');
        clearTimeout(retryTimer.current);
        retryTimer.current = setTimeout(initialize, 30000);
      } finally {
        syncing.current = false;
      }
    }, 900);
    return () => clearTimeout(timer);
  }, [account, initialize, trips]);

  const value = useMemo(() => ({ account, status, message }), [account, status, message]);
  return <CloudSyncContext.Provider value={value}>{children}</CloudSyncContext.Provider>;
}

export function useCloudSync() {
  const value = useContext(CloudSyncContext);
  if (!value) throw new Error('useCloudSync must be used inside CloudSyncProvider');
  return value;
}
