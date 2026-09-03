import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebaseConfig';

/**
 * @readonly
 * @enum {string}
 */
export const PlaceType = {
  MESTO: 'Mesto',
  DEDINA: 'Dedina',
  HORKA: 'Hôrka',
  HRAD: 'Hrad',
  PAMIATKA: 'Pamiatka',
  PLAZ: 'Pláž',
  INE: 'Iné',
};

/**
 * @typedef {Object} Place
 * @property {string} id
 * @property {string} userId
 * @property {string} name
 * @property {string} type
 * @property {{lat: number, lng: number}} coordinates
 * @property {string} country
 * @property {string} visitDate
 * @property {string} notes
 * @property {string[]} photos
 */

const placesCollection = collection(db, 'places');

export const addPlace = async (place) => {
  const payload = {
    userId: place.userId,
    name: place.name,
    type: place.type,
    coordinates: place.coordinates,
    country: place.country,
    visitDate: place.visitDate,
    notes: place.notes || '',
    photos: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(placesCollection, payload);
  return docRef.id;
};

export const listPlacesByUser = async (userId) => {
  const q = query(placesCollection, where('userId', '==', userId), orderBy('visitDate', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
};

export const updatePlaceVisit = async (placeId, userId, changes) => {
  const placeRef = doc(db, 'places', placeId);
  const existing = await getDoc(placeRef);

  if (!existing.exists()) {
    throw new Error('Place not found.');
  }

  if (existing.data().userId !== userId) {
    throw new Error('You can only edit your own visit.');
  }

  const allowedChanges = {
    ...(changes.visitDate ? { visitDate: changes.visitDate } : {}),
    ...(typeof changes.notes === 'string' ? { notes: changes.notes } : {}),
    updatedAt: serverTimestamp(),
  };

  await updateDoc(placeRef, allowedChanges);
};

export const deletePlaceVisit = async (placeId, userId) => {
  const placeRef = doc(db, 'places', placeId);
  const existing = await getDoc(placeRef);

  if (!existing.exists()) {
    return;
  }

  if (existing.data().userId !== userId) {
    throw new Error('You can only delete your own visit.');
  }

  await deleteDoc(placeRef);
};
