import AsyncStorage from '@react-native-async-storage/async-storage';

import { compareTripsNewest } from '../utils/tripOrder';
import { mergeBackup } from '../utils/backup';

const TRIPS_STORAGE_PREFIX = 'travellog/mock-trips/';
const PROFILE_STORAGE_PREFIX = 'travellog/mock-profile/';
const writes = new Map();
const exclusive = (userId, action) => {
  const next = (writes.get(userId) || Promise.resolve()).catch(() => {}).then(action);
  writes.set(userId, next);
  next.finally(() => { if (writes.get(userId) === next) writes.delete(userId); }).catch(() => {});
  return next;
};

const today = () => new Date().toISOString();
const todayDate = () => today().slice(0, 10);
const byDateDesc = compareTripsNewest;

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeTrip = (trip = {}, id = trip.id) => ({
  id: String(id || `mock-${Date.now()}`),
  userId: String(trip.userId || ''),
  name: String(trip.name || '').trim(),
  description: String(trip.description || '').trim(),
  locationName: String(trip.locationName || '').trim(),
  countryCode: String(trip.countryCode || '').trim().toUpperCase(),
  location: {
    latitude: toNumber(trip.location?.latitude ?? trip.latitude),
    longitude: toNumber(trip.location?.longitude ?? trip.longitude),
  },
  date: String(trip.date || todayDate()),
  rating: Math.min(5, Math.max(0, Math.round(toNumber(trip.rating)))),
  photos: Array.isArray(trip.photos) ? trip.photos : [],
  notes: String(trip.notes || '').trim(),
  createdAt: trip.createdAt || '',
  updatedAt: trip.updatedAt || today(),
  syncStatus: trip.syncStatus || 'synced',
});

const sampleTrips = (userId) =>
  [
    {
      id: 'mock-trip-1',
      userId,
      name: 'Weekend v Prahe',
      description: 'Historické centrum, Karlov most a večerná plavba.',
      locationName: 'Praha, Česko',
      location: { latitude: 50.0755, longitude: 14.4378 },
      date: '2026-08-18',
      rating: 5,
      photos: ['https://picsum.photos/seed/prague/400/300'],
      notes: 'Rezervovať lístky na hrad vopred.',
    },
    {
      id: 'mock-trip-2',
      userId,
      name: 'Tatry Hiking Day',
      description: 'Túra na Skalnaté pleso s krátkou zastávkou na čajovni.',
      locationName: 'Vysoké Tatry, Slovensko',
      location: { latitude: 49.1707, longitude: 20.2361 },
      date: '2026-08-10',
      rating: 4,
      photos: ['https://picsum.photos/seed/tatry/400/300'],
      notes: 'Skontrolovať počasie deň vopred.',
    },
    {
      id: 'mock-trip-3',
      userId,
      name: 'Budapešť Food Tour',
      description: 'Street food, trhy a termálne kúpele.',
      locationName: 'Budapešť, Maďarsko',
      location: { latitude: 47.4979, longitude: 19.0402 },
      date: '2026-07-22',
      rating: 5,
      photos: ['https://picsum.photos/seed/budapest/400/300'],
      notes: 'Ochutnať langoš pri tržnici.',
    },
    {
      id: 'mock-trip-4',
      userId,
      name: 'Viedeň Museums',
      description: 'Belveder, Kunsthistorisches Museum a kaviareň.',
      locationName: 'Viedeň, Rakúsko',
      location: { latitude: 48.2082, longitude: 16.3738 },
      date: '2026-07-02',
      rating: 4,
      photos: ['https://picsum.photos/seed/vienna/400/300'],
      notes: 'Kúpiť kombinovaný lístok online.',
    },
    {
      id: 'mock-trip-5',
      userId,
      name: 'Krátky oddych pri mori',
      description: 'Pláž, promenáda a západ slnka.',
      locationName: 'Split, Chorvátsko',
      location: { latitude: 43.5081, longitude: 16.4402 },
      date: '2026-06-15',
      rating: 4,
      photos: ['https://picsum.photos/seed/split/400/300'],
      notes: 'Vyraziť skoro ráno kvôli parkovaniu.',
    },
  ].map((trip) => normalizeTrip(trip, trip.id));

const tripsKey = (userId) => `${TRIPS_STORAGE_PREFIX}${userId}`;
const profileKey = (userId) => `${PROFILE_STORAGE_PREFIX}${userId}`;

const readTrips = async (userId) => {
  const raw = await AsyncStorage.getItem(tripsKey(userId));
  if (!raw) {
    const seeded = [];
    await AsyncStorage.setItem(tripsKey(userId), JSON.stringify(seeded));
    return seeded;
  }

  try {
    return JSON.parse(raw).map((trip) => normalizeTrip(trip, trip.id));
  } catch (error) {
    throw new Error('Uložené návštevy sa nepodarilo načítať. Pôvodné dáta zostali zachované.');
  }
};

const saveTrips = async (userId, trips) => {
  const normalized = trips.map((trip) => normalizeTrip(trip, trip.id)).sort(byDateDesc);
  await AsyncStorage.setItem(tripsKey(userId), JSON.stringify(normalized));
  return normalized;
};

export const getTrips = (userId) => exclusive(userId, async () => {
  const trips = await readTrips(userId);
  return [...trips].sort(byDateDesc);
});

export const restoreTripsBackup = (userId, incoming) => exclusive(userId, async () => {
  const current = await readTrips(userId);
  // Keep a pre-restore copy in case a later release changes merge behaviour.
  await AsyncStorage.setItem(`${tripsKey(userId)}/before-restore`, JSON.stringify(current));
  return saveTrips(userId, mergeBackup(current, incoming, userId));
});

export const addTrip = (userId, tripData) => exclusive(userId, async () => {
  const trips = await readTrips(userId);
  const created = normalizeTrip(
    {
      ...tripData,
      userId,
      createdAt: today(),
      updatedAt: today(),
      syncStatus: 'synced',
    },
    `mock-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  await saveTrips(userId, [...trips, created]);
  return created;
});

export const updateTrip = (userId, tripId, tripData) => exclusive(userId, async () => {
  const trips = await readTrips(userId);
  const existing = trips.find((trip) => trip.id === tripId);

  if (!existing) {
    throw new Error('Trip not found.');
  }

  const updated = normalizeTrip(
    {
      ...existing,
      ...tripData,
      createdAt: existing.createdAt,
      userId,
      location: {
        latitude: tripData.location?.latitude ?? existing.location?.latitude,
        longitude: tripData.location?.longitude ?? existing.location?.longitude,
      },
      updatedAt: today(),
      syncStatus: 'synced',
    },
    tripId,
  );

  await saveTrips(
    userId,
    trips.map((trip) => (trip.id === tripId ? updated : trip)),
  );
  return updated;
});

export const deleteTrip = (userId, tripId) => exclusive(userId, async () => {
  const trips = await readTrips(userId);
  await saveTrips(
    userId,
    trips.filter((trip) => trip.id !== tripId),
  );
});

export const getUserProfile = async (userId) => {
  const raw = await AsyncStorage.getItem(profileKey(userId));
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (error) {
      // fallback to default profile
    }
  }

  const profile = {
    userId,
    name: 'Test Cestovateľ',
    isPremium: false,
    homeBase: 'Bratislava',
    bio: 'Mock profil pre vývoj UI bez Firebase.',
  };
  await AsyncStorage.setItem(profileKey(userId), JSON.stringify(profile));
  return profile;
};
