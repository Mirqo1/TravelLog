import AsyncStorage from '@react-native-async-storage/async-storage';
import { get, push, ref, remove, set, update } from 'firebase/database';
import { database } from './firebaseConfig';

const CACHE_PREFIX = 'travellog/trips/';

const tripDate = () => new Date().toISOString().slice(0, 10);

const tripCompare = (left, right) => String(right.date || '').localeCompare(String(left.date || ''));

const cacheKey = (userId) => `${CACHE_PREFIX}${userId}`;

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeTrip = (trip = {}, id = trip.id) => ({
  id,
  userId: trip.userId || '',
  name: String(trip.name || '').trim(),
  description: String(trip.description || '').trim(),
  locationName: String(trip.locationName || '').trim(),
  location: {
    latitude: toNumber(trip.location?.latitude ?? trip.latitude),
    longitude: toNumber(trip.location?.longitude ?? trip.longitude),
  },
  date: trip.date || tripDate(),
  rating: Math.min(5, Math.max(0, Math.round(toNumber(trip.rating)))),
  photos: Array.isArray(trip.photos) ? trip.photos : [],
  notes: String(trip.notes || '').trim(),
  createdAt: trip.createdAt || new Date().toISOString(),
  updatedAt: trip.updatedAt || new Date().toISOString(),
  syncStatus: trip.syncStatus || 'synced',
});

const sanitizeTripForRemote = (trip, userId) => {
  const normalized = normalizeTrip({ ...trip, userId }, trip.id);
  return {
    userId,
    name: normalized.name,
    description: normalized.description,
    locationName: normalized.locationName,
    location: normalized.location,
    date: normalized.date,
    rating: normalized.rating,
    photos: normalized.photos,
    notes: normalized.notes,
    createdAt: normalized.createdAt,
    updatedAt: new Date().toISOString(),
  };
};

const loadCacheState = async (userId) => {
  const raw = await AsyncStorage.getItem(cacheKey(userId));
  if (!raw) {
    return { trips: [], pendingDeletes: [] };
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      trips: Array.isArray(parsed.trips) ? parsed.trips.map((trip) => normalizeTrip(trip, trip.id)) : [],
      pendingDeletes: Array.isArray(parsed.pendingDeletes) ? parsed.pendingDeletes : [],
    };
  } catch (error) {
    return { trips: [], pendingDeletes: [] };
  }
};

const saveCacheState = async (userId, state) => {
  const nextState = {
    trips: [...state.trips].sort(tripCompare),
    pendingDeletes: [...new Set(state.pendingDeletes)],
  };

  await AsyncStorage.setItem(cacheKey(userId), JSON.stringify(nextState));
  return nextState;
};

const mergeRemoteWithPending = (remoteTrips, cachedState) => {
  const hiddenIds = new Set(cachedState.pendingDeletes);
  const pendingTrips = cachedState.trips.filter((trip) => trip.syncStatus !== 'synced');
  const mergedMap = new Map(
    remoteTrips.filter((trip) => !hiddenIds.has(trip.id)).map((trip) => [trip.id, normalizeTrip(trip, trip.id)]),
  );

  pendingTrips.forEach((trip) => {
    if (trip.syncStatus !== 'delete') {
      mergedMap.set(trip.id, normalizeTrip(trip, trip.id));
    }
  });

  return [...mergedMap.values()].sort(tripCompare);
};

const syncPendingTrips = async (userId, cachedState) => {
  let workingTrips = [...cachedState.trips];
  let workingDeletes = [...cachedState.pendingDeletes];

  for (const trip of [...workingTrips]) {
    if (trip.syncStatus === 'create') {
      try {
        const tripsRef = ref(database, `users/${userId}/trips`);
        const createdRef = push(tripsRef);
        const remoteTrip = sanitizeTripForRemote(trip, userId);
        await set(createdRef, remoteTrip);
        workingTrips = workingTrips.map((item) =>
          item.id === trip.id
            ? normalizeTrip({ ...remoteTrip, userId, syncStatus: 'synced' }, createdRef.key)
            : item,
        );
      } catch (error) {
        continue;
      }
    }
  }

  for (const trip of [...workingTrips]) {
    if (trip.syncStatus === 'update' && !String(trip.id).startsWith('local-')) {
      try {
        const tripRef = ref(database, `users/${userId}/trips/${trip.id}`);
        await update(tripRef, sanitizeTripForRemote(trip, userId));
        workingTrips = workingTrips.map((item) =>
          item.id === trip.id ? { ...item, syncStatus: 'synced', updatedAt: new Date().toISOString() } : item,
        );
      } catch (error) {
        continue;
      }
    }
  }

  for (const tripId of [...workingDeletes]) {
    if (String(tripId).startsWith('local-')) {
      workingTrips = workingTrips.filter((trip) => trip.id !== tripId);
      workingDeletes = workingDeletes.filter((item) => item !== tripId);
      continue;
    }

    try {
      await remove(ref(database, `users/${userId}/trips/${tripId}`));
      workingDeletes = workingDeletes.filter((item) => item !== tripId);
    } catch (error) {
      continue;
    }
  }

  const nextTrips = workingTrips
    .filter((trip) => !workingDeletes.includes(trip.id))
    .map((trip) => normalizeTrip(trip, trip.id));

  return saveCacheState(userId, { trips: nextTrips, pendingDeletes: workingDeletes });
};

export const getTrips = async (userId) => {
  const cachedState = await syncPendingTrips(userId, await loadCacheState(userId));

  try {
    const snapshot = await get(ref(database, `users/${userId}/trips`));
    const remoteValue = snapshot.val() || {};
    const remoteTrips = Object.entries(remoteValue).map(([id, trip]) => normalizeTrip(trip, id));
    const mergedTrips = mergeRemoteWithPending(remoteTrips, cachedState);
    const syncedCache = {
      trips: mergedTrips.map((trip) => ({
        ...trip,
        syncStatus: trip.syncStatus === 'synced' ? 'synced' : trip.syncStatus,
      })),
      pendingDeletes: cachedState.pendingDeletes,
    };
    await saveCacheState(userId, syncedCache);
    return mergedTrips;
  } catch (error) {
    return cachedState.trips.sort(tripCompare);
  }
};

export const addTrip = async (userId, tripData) => {
  const tripsRef = ref(database, `users/${userId}/trips`);
  const cachedState = await loadCacheState(userId);
  const remoteTrip = sanitizeTripForRemote(tripData, userId);

  try {
    const createdRef = push(tripsRef);
    await set(createdRef, remoteTrip);
    const createdTrip = normalizeTrip({ ...remoteTrip, userId, syncStatus: 'synced' }, createdRef.key);
    await saveCacheState(userId, { ...cachedState, trips: [...cachedState.trips, createdTrip] });
    return createdTrip;
  } catch (error) {
    const offlineTrip = normalizeTrip(
      { ...remoteTrip, userId, syncStatus: 'create', createdAt: new Date().toISOString() },
      `local-${Date.now()}`,
    );
    await saveCacheState(userId, { ...cachedState, trips: [...cachedState.trips, offlineTrip] });
    return offlineTrip;
  }
};

export const updateTrip = async (userId, tripId, tripData) => {
  const cachedState = await loadCacheState(userId);
  const existingTrip = cachedState.trips.find((trip) => trip.id === tripId);
  const mergedTrip = normalizeTrip(
    {
      ...existingTrip,
      ...tripData,
      location: {
        latitude: tripData.location?.latitude ?? existingTrip?.location?.latitude,
        longitude: tripData.location?.longitude ?? existingTrip?.location?.longitude,
      },
      updatedAt: new Date().toISOString(),
    },
    tripId,
  );

  const nextSyncStatus = String(tripId).startsWith('local-') ? 'create' : 'update';
  const cachedTrip = { ...mergedTrip, syncStatus: nextSyncStatus };
  const nextTrips = cachedState.trips.map((trip) => (trip.id === tripId ? cachedTrip : trip));
  await saveCacheState(userId, { ...cachedState, trips: nextTrips });

  if (String(tripId).startsWith('local-')) {
    return cachedTrip;
  }

  try {
    await update(ref(database, `users/${userId}/trips/${tripId}`), sanitizeTripForRemote(mergedTrip, userId));
    const syncedTrip = { ...cachedTrip, syncStatus: 'synced' };
    await saveCacheState(userId, {
      ...cachedState,
      trips: nextTrips.map((trip) => (trip.id === tripId ? syncedTrip : trip)),
    });
    return syncedTrip;
  } catch (error) {
    return cachedTrip;
  }
};

export const deleteTrip = async (userId, tripId) => {
  const cachedState = await loadCacheState(userId);
  const isLocalOnly = String(tripId).startsWith('local-');
  const nextTrips = cachedState.trips.filter((trip) => trip.id !== tripId);
  const nextState = {
    trips: nextTrips,
    pendingDeletes: isLocalOnly ? cachedState.pendingDeletes : [...cachedState.pendingDeletes, tripId],
  };

  await saveCacheState(userId, nextState);

  if (isLocalOnly) {
    return;
  }

  try {
    await remove(ref(database, `users/${userId}/trips/${tripId}`));
    await saveCacheState(userId, {
      trips: nextTrips,
      pendingDeletes: nextState.pendingDeletes.filter((id) => id !== tripId),
    });
  } catch (error) {
    return;
  }
};

export const getUserProfile = async (userId) => {
  try {
    const snapshot = await get(ref(database, `users/${userId}/profile`));
    return snapshot.val() || null;
  } catch (error) {
    return null;
  }
};
