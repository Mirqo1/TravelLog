// Deletions describe explicit user decisions, never an empty gallery on a new phone.
// Scoped to a visit: another visit using the same image remains protected.
export const deletionKey = item => JSON.stringify([item.tripId, item.photoId]);
export function mergePhotoDeletions(...lists) {
  const result = new Map();
  for (const list of lists) {
    if (!Array.isArray(list)) throw new Error('Záznam odstránených fotografií má neplatný formát.');
    for (const item of list) {
      if (!item || typeof item.tripId !== 'string' || !item.tripId || item.tripId.length > 500
          || !(item.photoId === null || (typeof item.photoId === 'string' && /^photo-[a-z0-9-]+$/.test(item.photoId))))
        throw new Error('Záznam odstránených fotografií má neplatný formát.');
      const entry = { tripId: item.tripId, photoId: item.photoId };
      result.set(deletionKey(entry), entry);
    }
  }
  return [...result.values()].sort((a, b) => deletionKey(a).localeCompare(deletionKey(b)));
}
export function photoDeletionFilter(deletions) {
  const keys = new Set(mergePhotoDeletions(deletions).map(deletionKey));
  return (tripId, photo) => !keys.has(deletionKey({ tripId, photoId: null }))
    && !keys.has(deletionKey({ tripId, photoId: photo?.id }));
}
