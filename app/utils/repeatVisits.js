import { localDate, localTime } from './visitDate';
const nameKey = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
const point = value => value?.location || value;
const valid = p => Number.isFinite(p?.latitude) && Number.isFinite(p?.longitude) && Math.abs(p.latitude) <= 90 && Math.abs(p.longitude) <= 180;
export function samePlace(a, b) {
  const pa = point(a), pb = point(b);
  if (!valid(pa) || !valid(pb)) return false;
  if (a.countryCode && b.countryCode && a.countryCode !== b.countryCode) return false;
  if (a.placeId && b.placeId) return a.placeId === b.placeId;
  if (!nameKey(a.name) || nameKey(a.name) !== nameKey(b.name)) return false;
  const rad = Math.PI / 180;
  const lat = (pb.latitude - pa.latitude) * rad;
  const lon = (pb.longitude - pa.longitude) * rad;
  const h = Math.sin(lat / 2) ** 2 + Math.cos(pa.latitude * rad) * Math.cos(pb.latitude * rad) * Math.sin(lon / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.min(1, Math.sqrt(h))) <= 25;
}
export function visitsAtPlace(trips, place, excludeId) {
  if (!place) return [];
  return trips.filter(trip => trip.id !== excludeId && samePlace(trip, place)).sort((a,b) =>
    `${b.date || ''}T${b.visitTime || ''}`.localeCompare(`${a.date || ''}T${a.visitTime || ''}`) || String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}
export function repeatVisitDraft(trip, now = new Date()) {
  return { name: trip.name || '', locationName: trip.locationName || '', countryCode: trip.countryCode || '',
    placeId: trip.placeId || `visit:${trip.id}`, location: { ...trip.location },
    date: localDate(now), visitTime: localTime(now), rating: 0, description: '', notes: '', tags: [], photos: [] };
}
export function placeMarkers(trips, region) {
  const groups = [];
  for (const trip of trips) {
    const p = point(trip);
    if (!valid(p)) continue;
    const group = groups.find(g => samePlace(g.trips[0], trip));
    if (group) group.trips.push(trip);
    else groups.push({ coordinate: { ...p }, trips: [trip] });
  }
  return groups.filter(g => !region || (Math.abs(g.coordinate.latitude - region.latitude) <= region.latitudeDelta * 0.65 &&
    Math.abs(((g.coordinate.longitude - region.longitude + 540) % 360) - 180) <= Math.min(180, region.longitudeDelta * 0.65)))
    .map(g => ({ ...g, trips: visitsAtPlace(g.trips, g.trips[0]) }));
}
