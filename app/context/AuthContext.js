import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cloudConfigured, getCloudAccount, cloudLogin, cloudLogout, cloudResetPassword, watchCloudAccount, updateCloudDisplayName } from '../services/cloudBackupService';

const AuthContext = createContext(null);
const GUEST_KEY = 'travellog/mock-auth-user'; // preserve the existing local notebook identity
const MODE_KEY = 'travellog/session-mode';

export const AuthProvider = ({ children }) => {
  const [guest, setGuest] = useState(null);
  const [guestMode, setGuestMode] = useState(false);
  const [localReady, setLocalReady] = useState(false);
  const [cloudReady, setCloudReady] = useState(!cloudConfigured);
  const [account, setAccount] = useState(null);
  const [authError, setAuthError] = useState('');
  useEffect(() => {
    let active = true;
    Promise.all([AsyncStorage.getItem(GUEST_KEY), AsyncStorage.getItem(MODE_KEY)]).then(([raw, mode]) => {
      const saved = raw ? JSON.parse(raw) : null;
      if (saved && (typeof saved.uid !== 'string' || !saved.uid)) throw new Error('Neplatný lokálny profil.');
      if (active) { setGuest(saved); setGuestMode(!!saved && mode !== 'signedout'); }
    }).catch(() => { if (active) setAuthError('Lokálny profil sa nepodarilo načítať. Pôvodné údaje zostali zachované.'); })
      .finally(() => { if (active) setLocalReady(true); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!cloudConfigured) return undefined;
    try {
      return watchCloudAccount(next => { setAccount(next); setCloudReady(true); }, error => {
        setAuthError(error.message); setCloudReady(true);
      });
    } catch (error) { setAuthError(error.message); setCloudReady(true); }
    return undefined;
  }, []);
  const continueAsGuest = useCallback(async () => {
    if (authError) throw new Error(authError);
    const next = guest || { uid: `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`, displayName: 'Cestovateľ', email: '', isPremium: false };
    await AsyncStorage.setItem(GUEST_KEY, JSON.stringify(next));
    await AsyncStorage.setItem(MODE_KEY, 'guest');
    setGuest(next); setGuestMode(true);
  }, [guest, authError]);
  const logout = useCallback(async () => {
    // Keep the notebook/profile on disk, but don't expose it as a logged-in account.
    await AsyncStorage.setItem(MODE_KEY, 'signedout');
    setGuestMode(false);
    if (cloudConfigured) await cloudLogout();
  }, []);
  const updateDisplayName = useCallback(async (name) => {
    const displayName = String(name || '').trim();
    if (displayName.length < 2 || displayName.length > 50) throw new Error('Meno musí mať 2 až 50 znakov.');
    if (account) {
      await updateCloudDisplayName(displayName, account.uid);
      setAccount(current => current?.uid === account.uid ? { ...current, displayName } : current);
    } else if (guest) {
      const next = { ...guest, displayName };
      await AsyncStorage.setItem(GUEST_KEY, JSON.stringify(next)); setGuest(next);
    } else throw new Error('Najprv otvor profil.');
  }, [account, guest]);
  const user = account || (guestMode ? guest : null);
  const value = useMemo(() => ({ user, account, guest, authError,
    loading: !localReady || !cloudReady,
    notebookId: account ? `cloud-${account.uid}` : user?.uid || null,
    loginWithEmail: async (email, password) => {
      const result = await cloudLogin(email, password);
      if (getCloudAccount()?.uid === result.user.uid) setAccount({ ...result.user });
      return result;
    },
    registerWithEmail: async (email, password, name) => {
      const result = await cloudLogin(email, password, true, name);
      if (getCloudAccount()?.uid === result.user.uid) setAccount({ ...result.user });
      return result;
    },
    resetPassword: cloudResetPassword, continueAsGuest, logout, updateDisplayName,
  }), [user, account, guest, authError, localReady, cloudReady, continueAsGuest, logout, updateDisplayName]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
};
