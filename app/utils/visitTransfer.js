import { parseVisitDate, validVisitTime } from './visitDate';
import { normalizeTags } from './backup';

export const TRANSFER_FORMAT = 'travellog-visit';
export const MAX_TRANSFER_PHOTOS = 10;
export const MAX_TRANSFER_PHOTO_BYTES = 2 * 1024 * 1024;
export const DEFAULT_TRANSFER_OPTIONS = { date: true, rating: false, description: true, notes: false, tags: false };
const invalid = () => new Error('Súbor návštevy má neplatný alebo nepodporovaný formát.');
function text(value, max, required = false) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw invalid();
  return value.trim();
}
// Only these fields are allowed to leave a private notebook. Never serialize a
// trip/account object wholesale: it may contain notes, UID, local URIs or tokens.
export function transferVisit(trip, options = DEFAULT_TRANSFER_OPTIONS) {
  return {
    name: String(trip.name || '').trim(), locationName: String(trip.locationName || '').trim(),
    countryCode: trip.countryCode || '', location: { latitude: trip.location?.latitude, longitude: trip.location?.longitude },
    ...(trip.placeId ? { placeId: trip.placeId } : {}),
    ...(options.date ? { date: trip.date, visitTime: trip.visitTime || '' } : {}),
    ...(options.rating ? { rating: trip.rating || 0 } : {}),
    ...(options.description ? { description: trip.description || '' } : {}),
    ...(options.notes ? { notes: trip.notes || '' } : {}),
    ...(options.tags ? { tags: normalizeTags(trip.tags) } : {}),
  };
}
export function validateVisitTransfer(data) {
  if (data?.format !== TRANSFER_FORMAT || data.version !== 1 || !['copy', 'invitation'].includes(data.kind)
      || !/^[a-f0-9]{64}$/.test(data.sourceId || '') || !Array.isArray(data.photos) || data.photos.length > MAX_TRANSFER_PHOTOS)
    throw invalid();
  const author = text(data.author, 50), raw = data.visit;
  if (!raw || !Number.isFinite(raw.location?.latitude) || Math.abs(raw.location.latitude) > 90
      || !Number.isFinite(raw.location?.longitude) || Math.abs(raw.location.longitude) > 180) throw invalid();
  const visit = { name: text(raw.name, 160, true), locationName: text(raw.locationName, 300),
    countryCode: text(raw.countryCode, 2), location: { latitude: raw.location.latitude, longitude: raw.location.longitude } };
  if (visit.countryCode && !/^[A-Z]{2}$/.test(visit.countryCode)) throw invalid();
  if (raw.placeId != null) visit.placeId = text(raw.placeId, 200, true);
  if (raw.date != null) {
    if (typeof raw.date !== 'string' || parseVisitDate(raw.date) !== raw.date) throw invalid();
    visit.date = raw.date;
    if (typeof raw.visitTime !== 'string' || (raw.visitTime && !validVisitTime(raw.visitTime))) throw invalid();
    visit.visitTime = raw.visitTime;
  } else if (raw.visitTime != null) throw invalid();
  if (raw.rating != null) {
    if (!Number.isInteger(raw.rating) || raw.rating < 0 || raw.rating > 5) throw invalid();
    visit.rating = raw.rating;
  }
  for (const key of ['description', 'notes']) if (raw[key] != null) visit[key] = text(raw[key], 4000);
  if (raw.tags != null) {
    if (!Array.isArray(raw.tags) || raw.tags.length > 8 || raw.tags.some(tag => typeof tag !== 'string' || tag.length > 30)) throw invalid();
    visit.tags = normalizeTags(raw.tags);
  }
  const photos = data.photos.map((photo, i) => {
    if (!photo || photo.entry !== `photos/${i}.jpg` || !/^[a-f0-9]{64}$/.test(photo.sha256 || '')
        || !Number.isInteger(photo.bytes) || photo.bytes < 1 || photo.bytes > MAX_TRANSFER_PHOTO_BYTES
        || !Number.isInteger(photo.width) || !Number.isInteger(photo.height)
        || photo.width < 1 || photo.height < 1 || photo.width > 2000 || photo.height > 2000) throw invalid();
    return { entry: photo.entry, sha256: photo.sha256, bytes: photo.bytes, width: photo.width, height: photo.height };
  });
  return { format: TRANSFER_FORMAT, version: 1, kind: data.kind, sourceId: data.sourceId, author, visit, photos };
}
export function receivedVisitDraft(visit, date, visitTime) {
  if (typeof date !== 'string' || parseVisitDate(date) !== date || typeof visitTime !== 'string' || (visitTime && !validVisitTime(visitTime)))
    throw new Error('Zadaj platný dátum a čas návštevy.');
  return { ...visit, location: { ...visit.location }, date, visitTime, rating: 0, notes: '', photos: [],
    description: visit.description || '', tags: [] };
}
