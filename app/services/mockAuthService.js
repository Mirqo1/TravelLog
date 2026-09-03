import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_STORAGE_KEY = 'travellog/mock-auth-user';

let currentUser = null;
let initPromise = null;
const listeners = new Set();

const createMockUser = ({ email = '', displayName, provider = 'password' } = {}) => {
  const safeEmail = String(email || 'tester@travellog.app').trim() || 'tester@travellog.app';
  const baseName = safeEmail.split('@')[0] || 'tester';

  return {
    uid: `mock-${baseName.toLowerCase().replace(/[^a-z0-9]/g, '-') || Date.now()}`,
    email: safeEmail,
    displayName: displayName || `${baseName.charAt(0).toUpperCase()}${baseName.slice(1)}`,
    provider,
    isPremium: false,
  };
};

const hydrateUser = async () => {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        const saved = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        currentUser = saved ? JSON.parse(saved) : null;
      } catch (error) {
        currentUser = null;
      }
      return currentUser;
    })();
  }

  return initPromise;
};

const persistUser = async (user) => {
  currentUser = user;
  if (user) {
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  } else {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
  }

  listeners.forEach((listener) => listener(currentUser));
};

const completeAuth = async (user) => {
  await persistUser(user);
  return { user };
};

export const auth = {
  get currentUser() {
    return currentUser;
  },
};

export const onAuthStateChanged = (authInstance, callback) => {
  listeners.add(callback);
  hydrateUser().then(() => callback(currentUser));

  return () => {
    listeners.delete(callback);
  };
};

export const registerWithEmail = async (email, password) => {
  await hydrateUser();
  return completeAuth(createMockUser({ email, provider: 'password' }));
};

export const loginWithEmail = async (email, password) => {
  await hydrateUser();
  return completeAuth(createMockUser({ email, provider: 'password' }));
};

export const signInWithGoogleIdToken = async (idToken) => {
  await hydrateUser();
  const tokenName = String(idToken || '').slice(-6) || 'google';
  return completeAuth(
    createMockUser({
      email: `${tokenName}@gmail.mock`,
      displayName: 'Google Tester',
      provider: 'google',
    }),
  );
};

export const logout = async () => {
  await hydrateUser();
  await persistUser(null);
};
