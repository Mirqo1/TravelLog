import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { fingerprint } from '../utils/syncMerge';
import { cloudConfigured, getCloudAccount, readCloudBackup, saveCloudBackup } from '../services/cloudBackupService';
import { mergeRemoteNotebook, acknowledgeNotebook, getNotebookState } from '../services/tripsService';
import { createNotebookSync } from '../services/notebookSync';
import { useTrips } from './TripsContext';
import { useAuth } from './AuthContext';

const CloudSyncContext = createContext(null);
export function CloudSyncProvider({ children }) {
  const { account } = useAuth();
  const { trips, loading, error, notebookId, refreshAfterSync } = useTrips();
  const [state, setState] = useState({ status: 'local', message: '', lastSaved: null });
  const runner = useRef(null);
  const uid = account?.uid;
  const localFingerprint = fingerprint(trips);
  useEffect(() => {
    setState({ status: uid ? 'connecting' : cloudConfigured ? 'local' : 'unavailable', message: '', lastSaved: null });
    if (!uid || loading || error || notebookId !== `cloud-${uid}`) return undefined;
    const sync = createNotebookSync({ uid, notebookId, readRemote: readCloudBackup, saveRemote: saveCloudBackup,
      mergeRemote: mergeRemoteNotebook, acknowledge: acknowledgeNotebook, readLocal: getNotebookState,
      refresh: refreshAfterSync, report: update => setState(previous => ({ ...previous, ...update })),
      isAccountCurrent: id => getCloudAccount()?.uid === id });
    runner.current = sync;
    sync.request();
    const timer = setInterval(() => { if (AppState.currentState === 'active') sync.request(); }, 30000);
    const subscription = AppState.addEventListener('change', value => { if (value === 'active') sync.request(); });
    return () => { sync.stop(); runner.current = null; clearInterval(timer); subscription.remove(); };
  }, [uid, notebookId, loading, error, refreshAfterSync]);
  useEffect(() => {
    if (!runner.current) return undefined;
    setState(previous => ({ ...previous, status: 'pending', message: 'Zmeny čakajú na uloženie.' }));
    const timer = setTimeout(() => runner.current?.request(), 900);
    return () => clearTimeout(timer);
  }, [localFingerprint, uid]);
  const value = useMemo(() => ({ account, ...state, status: error ? 'error' : state.status,
    message: error || state.message, retry: () => runner.current?.request() }), [account, state, error]);
  return <CloudSyncContext.Provider value={value}>{children}</CloudSyncContext.Provider>;
}
export function useCloudSync() {
  const value = useContext(CloudSyncContext);
  if (!value) throw new Error('useCloudSync must be used inside CloudSyncProvider');
  return value;
}
