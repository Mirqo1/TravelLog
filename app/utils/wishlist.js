// Tombstones retain removals across offline devices. Deterministic last-change wins.
export function validateWish(item) {
  if (!item || !/^[a-zA-Z0-9-]{1,100}$/.test(item.id || '') || !Number.isSafeInteger(item.changedAt) || item.changedAt < 0)
    throw new Error('Neplatná položka v mojich snoch.');
  if (item.deleted === true) return { id: item.id, changedAt: item.changedAt, deleted: true };
  const name = String(item.name || '').trim();
  const locationName = String(item.locationName || '').trim();
  const notes = String(item.notes || '').trim();
  const { latitude, longitude } = item.location || {};
  if (!name || name.length > 160 || locationName.length > 300 || notes.length > 2000 ||
      !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180)
    throw new Error('Vyplň názov a vyber platné miesto na mape.');
  return { id: item.id, changedAt: item.changedAt, deleted: false, name, locationName, notes,
    countryCode: /^[A-Z]{2}$/.test(item.countryCode || '') ? item.countryCode : '', location: { latitude, longitude } };
}
export function mergeWishes(...lists) {
  const items = new Map();
  for (const list of lists) for (const raw of list) {
    const item = validateWish(raw), old = items.get(item.id);
    // Prefer removal on equal timestamps; otherwise use a stable tie-break across devices.
    if (!old || item.changedAt > old.changedAt || (item.changedAt === old.changedAt &&
        (item.deleted && !old.deleted || item.deleted === old.deleted && JSON.stringify(item) > JSON.stringify(old)))) items.set(item.id, item);
  }
  return [...items.values()].sort((a, b) => a.id.localeCompare(b.id));
}
