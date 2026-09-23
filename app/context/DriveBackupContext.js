import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { useTrips } from './TripsContext';
import { usePhotoAccess } from '../hooks/usePhotoAccess';
import { getCloudAccount } from '../services/cloudBackupService';
import { getTrips, restoreVisitPhotos } from '../services/tripsService';
import { createDriveSession, driveAvailable, driveSettingsKey, galleryFingerprint } from '../services/drivePhotoBackup';

const Context = createContext(null);
export function DriveBackupProvider({ children }) {
  const { account } = useAuth();
  const { trips, loading, notebookId, refreshAfterSync } = useTrips();
  const { canAddPhotos } = usePhotoAccess();
  const uid = account?.uid;
  const [saved, setSaved] = useState(null);
  const [state, setState] = useState({ status: 'disconnected', message: '' });
  const [busy, setBusy] = useState(false);
  const operation = useRef(null);
  const epoch = useRef(0);
  const live = useRef(null);
  const config = saved?.uid === uid ? saved.config : null;
  const ready = saved?.uid === uid;
  live.current = { uid, notebookId, loading, config, ready, canAddPhotos };
  const stop = () => {
    epoch.current++;
    operation.current?.stop(); operation.current = null;
    setBusy(false);
  };
  useEffect(() => {
    stop(); setSaved(null); setState({ status: 'disconnected', message: '' });
    let active = true;
    if (uid) AsyncStorage.getItem(driveSettingsKey(uid)).then(raw => {
      if (!active) return;
      const value = raw ? JSON.parse(raw) : null;
      if (value && (!value.permissionId || !value.email)) throw new Error('Nastavenie Disku má neplatný formát.');
      setSaved({ uid, config: value });
      if (value) setState({ status: 'pending', message: 'Kontrolujem zálohu fotografií.' });
    }).catch(() => { if (active) setState({ status: 'error', message: 'Nastavenie Disku sa nepodarilo načítať. Reštartuj aplikáciu.' }); });
    return () => { active = false; stop(); };
  }, [uid]);

  async function perform(mode) {
    const current = live.current;
    if (operation.current || !current?.uid || !current.ready || current.loading || current.notebookId !== `cloud-${current.uid}`) return;
    if (!driveAvailable) { setState({ status: 'unavailable', message: 'Nainštaluj nový Android build.' }); return; }
    if (mode !== 'connect' && !current.config) return;
    if (mode === 'backup' && !current.canAddPhotos) {
      setState({ status: 'premium', message: 'Nové zálohy fotografií vyžadujú Premium. Obnovenie existujúcich zostáva dostupné.' }); return;
    }
    const runUid = current.uid, runEpoch = epoch.current;
    const valid = () => live.current.uid === runUid && getCloudAccount()?.uid === runUid && epoch.current === runEpoch;
    const session = createDriveSession({ uid: runUid, binding: current.config, isCurrent: valid,
      wifiOnly: () => live.current.config?.wifiOnly !== false });
    operation.current = session; setBusy(true);
    const report = update => { if (valid()) setState(previous => ({ ...previous, ...update })); };
    report({ status: mode === 'connect' ? 'connecting' : mode === 'restore' ? 'restoring' : 'uploading', message: 'Pripájam Google Disk…' });
    try {
      if (mode === 'connect') {
        const identity = await session.authorize(true, !current.config); session.check();
        const next = { ...identity, wifiOnly: current.config?.wifiOnly !== false, lastSaved: current.config?.lastSaved || null };
        await AsyncStorage.setItem(driveSettingsKey(runUid), JSON.stringify(next)); session.check();
        setSaved({ uid: runUid, config: next });
        report({ status: 'pending', message: 'Disk je pripojený. Fotky čakajú na zálohovanie.' });
      } else if (mode === 'restore') {
        await session.restore({ readTrips: () => getTrips(`cloud-${runUid}`), report,
          attachPhotos: (id, photos, expected) => restoreVisitPhotos(`cloud-${runUid}`, id, photos, expected, valid) });
        session.check(); await refreshAfterSync();
      } else {
        const lastSaved = await session.backup({ readTrips: () => getTrips(`cloud-${runUid}`), report });
        session.check();
        const next = { ...current.config, lastSaved };
        await AsyncStorage.setItem(driveSettingsKey(runUid), JSON.stringify(next)); session.check();
        setSaved({ uid: runUid, config: next });
      }
    } catch (error) {
      if (valid() && error.code !== 'STOPPED') report({ status: error.code || 'error',
        message: error.message || 'Prenos zlyhal. Fotky zostali v telefóne.' });
    } finally {
      session.stop();
      if (operation.current === session) { operation.current = null; setBusy(false); }
    }
  }
  const run = useRef(perform);
  run.current = mode => perform(mode).catch(error => {
    setState({ status: 'error', message: error.message || 'Zálohovanie sa nepodarilo spustiť.' });
  });
  const fingerprint = JSON.stringify(trips.map(t => [t.id, galleryFingerprint(t.photos)]));
  const identity = config?.permissionId;
  useEffect(() => {
    if (!uid || !ready || !identity || loading) return;
    const trigger = () => { if (AppState.currentState === 'active') run.current('backup'); };
    const timer = setInterval(trigger, 60000);
    const subscription = AppState.addEventListener('change', value => {
      if (value === 'active') trigger();
      // Authorization deliberately opens a Google activity; don't cancel it.
    });
    return () => { clearInterval(timer); subscription.remove(); };
  }, [uid, identity, ready, loading]);
  useEffect(() => {
    if (!uid || !identity || loading || !ready) return;
    const timer = setTimeout(() => { if (AppState.currentState === 'active') run.current('backup'); }, 1200);
    return () => clearTimeout(timer);
  }, [uid, identity, fingerprint, loading, ready, canAddPhotos]);
  async function disconnect() {
    stop();
    const previousUid = uid;
    await AsyncStorage.removeItem(driveSettingsKey(previousUid));
    if (live.current.uid === previousUid) {
      setSaved({ uid: previousUid, config: null });
      setState({ status: 'disconnected', message: 'Disk je odpojený. Existujúce zálohy zostali na Disku.' });
    }
  }
  async function setWifiOnly(value) {
    if (!config || busy) return;
    const next = { ...config, wifiOnly: value };
    await AsyncStorage.setItem(driveSettingsKey(uid), JSON.stringify(next));
    if (live.current.uid === uid) setSaved({ uid, config: next });
  }
  return <Context.Provider value={{ ...state, busy, config, ready, available: driveAvailable, signedIn: !!uid,
    canUpload: canAddPhotos, connect: () => perform('connect'), backup: () => perform('backup'),
    restore: () => perform('restore'), disconnect, setWifiOnly }}>{children}</Context.Provider>;
}
export const useDriveBackup = () => useContext(Context);
