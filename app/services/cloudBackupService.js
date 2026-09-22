import AsyncStorage from '@react-native-async-storage/async-storage';
import * as appSDK from 'firebase/app';
import * as authSDK from 'firebase/auth';
import * as firestoreSDK from 'firebase/firestore';
import { portableTrips, validateBackup } from '../utils/backup';

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
};
export const cloudConfigured = Object.values(config).every(Boolean);
let services;
function cloud() {
  if (!cloudConfigured) throw new Error('Cloudová záloha ešte nie je nakonfigurovaná.');
  if (services) return services;
  const app = appSDK.getApps().find((a) => a.name === 'travellog-backup') || appSDK.initializeApp(config, 'travellog-backup');
  let auth;
  try { auth = authSDK.initializeAuth(app, { persistence: authSDK.getReactNativePersistence(AsyncStorage) }); }
  catch (error) {
    if (error.code !== 'auth/already-initialized') throw error;
    auth = authSDK.getAuth(app);
  }
  services = { auth, authSDK, db: firestoreSDK.getFirestore(app), fs: firestoreSDK };
  return services;
}
export function watchCloudAccount(callback, onError) {
  const { auth, authSDK } = cloud();
  return authSDK.onAuthStateChanged(auth, callback, onError);
}
export async function cloudLogin(email, password, register = false, displayName = '') {
  if (!String(email || '').trim() || !password) throw new Error('Vyplň email a heslo.');
  if (register && (displayName.trim().length < 2 || displayName.trim().length > 50)) throw new Error('Meno musí mať 2 až 50 znakov.');
  const { auth, authSDK } = cloud();
  const action = register ? authSDK.createUserWithEmailAndPassword : authSDK.signInWithEmailAndPassword;
  const result = await action(auth, email.trim(), password);
  if (register && displayName.trim()) await authSDK.updateProfile(result.user, { displayName: displayName.trim() });
  return result;
}
export async function cloudResetPassword(email) {
  const { auth, authSDK } = cloud();
  return authSDK.sendPasswordResetEmail(auth, email.trim());
}
export async function cloudLogout() { const { auth, authSDK } = cloud(); return authSDK.signOut(auth); }
export function getCloudAccount() { return cloudConfigured ? cloud().auth.currentUser : null; }
export async function updateCloudDisplayName(displayName, uid) {
  const { auth, authSDK } = cloud();
  if (!auth.currentUser || auth.currentUser.uid !== uid) throw new Error('Účet sa zmenil. Skús to znova.');
  await authSDK.updateProfile(auth.currentUser, { displayName: String(displayName || '').trim() });
  return true;
}
function backupRef(uid) {
  const { auth, db, fs } = cloud();
  if (!uid || auth.currentUser?.uid !== uid) throw Object.assign(new Error('Účet sa zmenil.'), { code: 'sync/account-changed' });
  return fs.doc(db, 'users', uid, 'backups', 'notebook');
}
export async function readCloudBackup(uid) {
  const { fs } = cloud();
  const snapshot = await fs.getDocFromServer(backupRef(uid));
  return snapshot.exists() ? validateBackup(snapshot.data()) : null;
}
export async function saveCloudBackup(trips, expectedRevision, uid) {
  const { fs, db } = cloud();
  const ref = backupRef(uid);
  const backup = validateBackup({ version: 1, trips: portableTrips(trips), savedAt: new Date().toISOString(),
    revision: `${Date.now()}-${Math.random().toString(36).slice(2)}` });
  // Conservative limit below Firestore's 1 MiB document limit, including UTF-8.
  if (encodeURIComponent(JSON.stringify(backup)).length > 700000)
    throw Object.assign(new Error('Záloha je pre túto verziu príliš veľká. Lokálne návštevy zostali zachované.'), { code: 'sync/too-large' });
  await fs.runTransaction(db, async (transaction) => {
    backupRef(uid); // A retry must never write under a different signed-in account.
    const existing = await transaction.get(ref);
    if ((existing.exists() ? existing.data().revision : null) !== expectedRevision)
      throw Object.assign(new Error('Záloha sa medzičasom zmenila na inom zariadení.'), { code: 'sync/conflict' });
    transaction.set(ref, backup);
  });
  return backup;
}
