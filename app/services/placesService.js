import AsyncStorage from '@react-native-async-storage/async-storage';

const PLACES_STORAGE_PREFIX = 'travellog/mock-places/';

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

const storageKey = (userId) => `${PLACES_STORAGE_PREFIX}${userId || 'guest'}`;
const todayDate = () => new Date().toISOString().slice(0, 10);
const byVisitDateDesc = (left, right) => String(right.visitDate || '').localeCompare(String(left.visitDate || ''));

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizePlace = (place = {}, id = place.id) => ({
  id: String(id || `mock-place-${Date.now()}`),
  userId: String(place.userId || ''),
  name: String(place.name || '').trim(),
  type: String(place.type || PlaceType.INE),
  coordinates: {
    lat: toNumber(place.coordinates?.lat ?? place.coordinates?.latitude),
    lng: toNumber(place.coordinates?.lng ?? place.coordinates?.longitude),
  },
  country: String(place.country || '').trim(),
  visitDate: String(place.visitDate || todayDate()),
  notes: String(place.notes || '').trim(),
  photos: Array.isArray(place.photos) ? place.photos : [],
});

const samplePlaces = (userId) =>
  [
    {
      id: 'mock-place-1',
      userId,
      name: 'Bratislava',
      type: PlaceType.MESTO,
      coordinates: { lat: 48.1486, lng: 17.1077 },
      country: 'Slovensko',
      visitDate: '2026-08-10',
      notes: 'Historické centrum',
      photos: [],
    },
    {
      id: 'mock-place-2',
      userId,
      name: 'Karlštejn',
      type: PlaceType.HRAD,
      coordinates: { lat: 49.9399, lng: 14.1887 },
      country: 'Česko',
      visitDate: '2026-07-01',
      notes: 'Skvelý výhľad',
      photos: [],
    },
  ].map((place) => normalizePlace(place, place.id));

const readPlaces = async (userId) => {
  const raw = await AsyncStorage.getItem(storageKey(userId));
  if (!raw) {
    const seeded = samplePlaces(userId);
    await AsyncStorage.setItem(storageKey(userId), JSON.stringify(seeded));
    return seeded;
  }

  try {
    return JSON.parse(raw).map((place) => normalizePlace(place, place.id));
  } catch (error) {
    const seeded = samplePlaces(userId);
    await AsyncStorage.setItem(storageKey(userId), JSON.stringify(seeded));
    return seeded;
  }
};

const savePlaces = async (userId, places) => {
  const normalized = places.map((place) => normalizePlace(place, place.id)).sort(byVisitDateDesc);
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(normalized));
  return normalized;
};

export const addPlace = async (place) => {
  const userId = String(place?.userId || '');
  const places = await readPlaces(userId);
  const created = normalizePlace(
    {
      ...place,
      userId,
      photos: Array.isArray(place?.photos) ? place.photos : [],
    },
    `mock-place-${Date.now()}`,
  );

  await savePlaces(userId, [...places, created]);
  return created.id;
};

export const listPlacesByUser = async (userId) => {
  const places = await readPlaces(String(userId || ''));
  return [...places].sort(byVisitDateDesc);
};

export const updatePlaceVisit = async (placeId, userId, changes) => {
  const normalizedUserId = String(userId || '');
  const places = await readPlaces(normalizedUserId);
  const existing = places.find((place) => place.id === placeId);

  if (!existing) {
    throw new Error('Place not found.');
  }

  if (existing.userId !== normalizedUserId) {
    throw new Error('You can only edit your own visit.');
  }

  const updated = normalizePlace(
    {
      ...existing,
      ...(changes.visitDate ? { visitDate: changes.visitDate } : {}),
      ...(typeof changes.notes === 'string' ? { notes: changes.notes } : {}),
    },
    placeId,
  );

  await savePlaces(
    normalizedUserId,
    places.map((place) => (place.id === placeId ? updated : place)),
  );
};

export const deletePlaceVisit = async (placeId, userId) => {
  const normalizedUserId = String(userId || '');
  const places = await readPlaces(normalizedUserId);
  const existing = places.find((place) => place.id === placeId);

  if (!existing) {
    return;
  }

  if (existing.userId !== normalizedUserId) {
    throw new Error('You can only delete your own visit.');
  }

  await savePlaces(
    normalizedUserId,
    places.filter((place) => place.id !== placeId),
  );
};
