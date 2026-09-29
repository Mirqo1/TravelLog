import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LANGUAGE_KEY, normalizeLanguage, setCurrentLanguage, t } from '../i18n';

const LanguageContext = createContext(null);
export function LanguageProvider({ children }) {
  const [language, setValue] = useState('en');
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(LANGUAGE_KEY).then(saved => {
      if (!active) return;
      const value = normalizeLanguage(saved);
      setCurrentLanguage(value); setValue(value);
    }).catch(() => {}).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);
  const setLanguage = async value => {
    const next = normalizeLanguage(value);
    await AsyncStorage.setItem(LANGUAGE_KEY, next);
    setCurrentLanguage(next); setValue(next);
  };
  return <LanguageContext.Provider value={{ language, setLanguage, t }}>
    {ready ? children : null}
  </LanguageContext.Provider>;
}
export const useLanguage = () => useContext(LanguageContext);
