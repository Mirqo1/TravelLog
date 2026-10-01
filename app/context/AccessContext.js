import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useAuth } from './AuthContext';
import { getCloudAccount } from '../services/cloudBackupService';
import { photoAccess } from '../utils/visitPhotos';

const Context = createContext(null);
export const testModeKey = identity => `travellog/test-access/${identity}`;
export function AccessProvider({ children }) {
  const { account, notebookId } = useAuth();
  const packageName = Constants.expoConfig?.android?.package;
  const uid = account?.uid;
  const identity = notebookId;
  const [token, setToken] = useState(null);
  const [saved, setSaved] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const live = useRef(null), request = useRef(0), saving = useRef(false);
  live.current = { uid, identity };
  const refreshAccess = useCallback(async () => {
    const ticket = ++request.current;
    try {
      const user = getCloudAccount();
      if (!uid || user?.uid !== uid) { setToken(null); return; }
      const result = await user.getIdTokenResult(true);
      if (ticket === request.current && live.current.uid === uid) setToken({ uid, claims: result.claims });
    } catch (_) {
      if (ticket === request.current && live.current.uid === uid) {
        setToken(null); setError('Oprávnenia sa nepodarilo obnoviť. Skontroluj internet.');
      }
    }
  }, [uid]);
  useEffect(() => {
    let active = true;
    setSaved(null); setError('');
    if (identity) AsyncStorage.getItem(testModeKey(identity)).then(value => {
      if (!active) return;
      if (value !== null && !['auto', 'free', 'premium'].includes(value)) throw Error('Invalid test mode');
      setSaved({ identity, mode: value || 'auto' });
    }).catch(() => {
      if (active) { setSaved({ identity, mode: 'free' }); setError('Testovací režim sa nepodarilo načítať.'); }
    });
    return () => { active = false; };
  }, [identity]);
  useEffect(() => {
    setToken(null);
    refreshAccess();
    const listener = AppState.addEventListener('change', state => { if (state === 'active') refreshAccess(); });
    return () => { request.current++; listener.remove(); };
  }, [refreshAccess]);
  const ready = !!identity && saved?.identity === identity;
  const claims = uid && token?.uid === uid ? token.claims : {};
  const mode = ready ? saved.mode : 'auto';
  const access = photoAccess(packageName, claims, mode);
  const setTestMode = async next => {
    if (!ready || !access.canTest || saving.current) return;
    if (!['auto', 'free', 'premium'].includes(next)) throw Error('Neplatný testovací režim.');
    saving.current = true; setBusy(true); setError('');
    try {
      await AsyncStorage.setItem(testModeKey(identity), next);
      if (live.current.identity === identity) setSaved({ identity, mode: next });
    } catch (_) {
      if (live.current.identity === identity) setError('Testovací režim sa nepodarilo uložiť.');
      throw Error('Testovací režim sa nepodarilo uložiť.');
    } finally { saving.current = false; setBusy(false); }
  };
  return <Context.Provider value={{ ...access, canAddPhotos: ready && access.canAddPhotos,
    mode, ready, busy, error, isAdmin: claims.admin === true, setTestMode, refreshAccess }}>{children}</Context.Provider>;
}
export function useAccess() {
  const value = useContext(Context);
  if (!value) throw Error('useAccess must be inside AccessProvider');
  return value;
}
