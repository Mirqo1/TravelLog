// Backup only portable visit fields. Device-local photo URIs are deliberately
// excluded here; Google Drive photo backup has its own private manifests.
export function portableTrips(trips) {
  return trips.map(({ id, name, locationName, countryCode, location, date, visitTime, rating, description, notes, createdAt, updatedAt }) => ({
    id, name, locationName: locationName || '', countryCode: countryCode || '', location,
    date, visitTime: visitTime || '', rating: rating || 0, description: description || '', notes: notes || '',
    createdAt: createdAt || '', updatedAt: updatedAt || '',
  }));
}

export function validateBackup(data) {
  if (data?.version !== 1 || !Array.isArray(data.trips) || typeof data.revision !== 'string')
    throw new Error('Záloha má nepodporovaný formát.');
  const seen = new Set();
  for (const trip of data.trips) {
    if (!trip || typeof trip.id !== 'string' || !trip.id || seen.has(trip.id)
      || typeof trip.name !== 'string' || !trip.name.trim()
      || !Number.isFinite(trip.location?.latitude) || Math.abs(trip.location.latitude) > 90
      || !Number.isFinite(trip.location?.longitude) || Math.abs(trip.location.longitude) > 180
      || (trip.visitTime != null && trip.visitTime !== '' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(trip.visitTime))
      || !/^\d{4}-\d{2}-\d{2}$/.test(trip.date)) throw new Error('Záloha obsahuje neplatnú návštevu.');
    seen.add(trip.id);
  }
  return data;
}

// Restoring adds missing visits. Existing local visits and photos are never
// overwritten by an older snapshot, including records with colliding IDs.
export function mergeBackup(current, incoming, userId) {
  const known = new Set(current.map((trip) => trip.id));
  return [...current, ...portableTrips(incoming).filter((trip) => !known.has(trip.id))
    .map((trip) => ({ ...trip, userId, photos: [], syncStatus: 'local' }))];
}
