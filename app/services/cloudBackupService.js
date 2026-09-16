import AsyncStorage from '@react-native-async-storage/async-storage';
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
  const appSDK = require('firebase/app');
  const authSDK = require('firebase/auth');
  const firestoreSDK = require('firebase/firestore');
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
export function watchCloudAccount(callback) {
  const { auth, authSDK } = cloud();
  return authSDK.onAuthStateChanged(auth, callback);
}
export async function cloudLogin(email, password, register = false) {
  const { auth, authSDK } = cloud();
  const action = register ? authSDK.createUserWithEmailAndPassword : authSDK.signInWithEmailAndPassword;
  return action(auth, email.trim(), password);
}
export async function cloudResetPassword(email) {
  const { auth, authSDK } = cloud();
  return authSDK.sendPasswordResetEmail(auth, email.trim());
}
export async function cloudLogout() { const { auth, authSDK } = cloud(); return authSDK.signOut(auth); }
function backupRef() {
  const { auth, db, fs } = cloud();
  if (!auth.currentUser) throw new Error('Prihlás sa do účtu pre zálohu.');
  return fs.doc(db, 'users', auth.currentUser.uid, 'backups', 'notebook');
}
export async function readCloudBackup() {
  const { fs } = cloud();
  const snapshot = await fs.getDocFromServer(backupRef());
  return snapshot.exists() ? validateBackup(snapshot.data()) : null;
}
export async function saveCloudBackup(trips, expectedRevision) {
  const { fs, db } = cloud();
  const ref = backupRef();
  const backup = validateBackup({ version: 1, trips: portableTrips(trips), savedAt: new Date().toISOString(),
    revision: `${Date.now()}-${Math.random().toString(36).slice(2)}` });
  // Conservative limit below Firestore's 1 MiB document limit, including UTF-8.
  if (encodeURIComponent(JSON.stringify(backup)).length > 700000)
    throw new Error('Záloha je pre túto verziu príliš veľká. Lokálne návštevy zostali zachované.');
  await fs.runTransaction(db, async (transaction) => {
    const existing = await transaction.get(ref);
    if ((existing.exists() ? existing.data().revision : null) !== expectedRevision)
      throw new Error('Záloha sa medzičasom zmenila na inom zariadení. Najprv ju načítaj znova.');
    transaction.set(ref, backup);
  });
  return backup;
}
