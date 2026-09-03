import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from './firebaseConfig';

/**
 * @typedef {Object} User
 * @property {string} uid
 * @property {string} email
 * @property {string} [name]
 * @property {string} [profilePicture]
 */

export const registerWithEmail = (email, password) =>
  createUserWithEmailAndPassword(auth, email, password);

export const loginWithEmail = (email, password) => signInWithEmailAndPassword(auth, email, password);

export const signInWithGoogleIdToken = (idToken) => {
  if (!idToken) {
    throw new Error('Google ID token is required.');
  }

  const credential = GoogleAuthProvider.credential(idToken);
  return signInWithCredential(auth, credential);
};

export const logout = () => signOut(auth);
