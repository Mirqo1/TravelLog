import encodedCountries from '../data/countries.json';
import countryLabelPoints from '../data/countryLabelPoints.json';

// Delta-encoded [longitude, latitude], precision 1e-4 degrees.
export const decodeRing = (encoded) => {
  let index = 0, x = 0, y = 0;
  const read = () => {
    let value = 0, shift = 0, byte;
    do { byte = encoded.charCodeAt(index++) - 63; value |= (byte & 31) << shift; shift += 5; } while (byte >= 32);
    return value & 1 ? ~(value >> 1) : value >> 1;
  };
  const points = [];
  while (index < encoded.length) { x += read(); y += read(); points.push([x / 1e4, y / 1e4]); }
  return points;
};

export const countries = encodedCountries.map((country) => ({
  ...country, polygons: country.polygons.map((polygon) => polygon.map(decodeRing)),
}));

export const validLocation = (point) => point && Number.isFinite(point.latitude) &&
  Number.isFinite(point.longitude) && Math.abs(point.latitude) <= 90 && Math.abs(point.longitude) <= 180;

const inRing = (x, y, ring) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

export const countryForLocation = (point) => {
  if (!validLocation(point)) return null;
  const { longitude: x, latitude: y } = point;
  return countries.find(({ bounds: [west, south, east, north], polygons }) =>
    x >= west && x <= east && y >= south && y <= north && polygons.some(([outer, ...holes]) =>
      inRing(x, y, outer) && !holes.some((hole) => inRing(x, y, hole)))) || null;
};

const normalizeName = (name) => String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
const countryByName = new Map();
for (const country of countries) {
  for (const name of [country.code, country.name, ...country.names]) countryByName.set(normalizeName(name), country);
}

// Explicit/geocoded country takes precedence over simplified display boundaries.
export const countryForTrip = (trip) =>
  countries.find((country) => country.code === String(trip.countryCode || '').toUpperCase()) ||
  countryByName.get(normalizeName(String(trip.locationName || '').split(',').pop())) ||
  countryForLocation(trip.location) || null;

export const summarizeCountries = (trips) => {
  const groups = new Map(), cache = new Map();
  let unmatched = 0;
  for (const trip of trips) {
    const key = JSON.stringify([trip.location, trip.countryCode, trip.locationName]);
    if (!cache.has(key)) cache.set(key, countryForTrip(trip));
    const country = cache.get(key);
    if (!country) { unmatched += 1; continue; }
    if (!groups.has(country.code)) groups.set(country.code, { country, trips: [] });
    groups.get(country.code).trips.push(trip);
  }
  return { groups: [...groups.values()], unmatched };
};

export const zoomForRegion = (region, width) => Math.log2(Math.max(1, width) * 360 / (256 * Math.max(0.00001, region.longitudeDelta)));
// Fixed Natural Earth label points keep overview counts away from border visits.
// A real visited point is the fallback if label data is missing.
export const countryMarkers = (trips) => summarizeCountries(trips).groups.flatMap((group) => {
  const center = countryLabelPoints[group.country.name];
  if (validLocation(center)) return [{ ...group, coordinate: center }];
  const points = group.trips.map((trip) => trip.location).filter(validLocation);
  if (!points.length) return [];
  const latitude = points.reduce((sum, p) => sum + p.latitude, 0) / points.length;
  const longitude = Math.atan2(points.reduce((sum, p) => sum + Math.sin(p.longitude * Math.PI / 180), 0),
    points.reduce((sum, p) => sum + Math.cos(p.longitude * Math.PI / 180), 0)) * 180 / Math.PI;
  const score = (p) => (p.latitude - latitude) ** 2 + (((p.longitude - longitude + 540) % 360) - 180) ** 2;
  return [{ ...group, coordinate: points.reduce((best, p) => score(p) < score(best) ? p : best) }];
});
export const modeForZoom = (zoom) => zoom < 5 ? 'countries' : zoom < 11 ? 'clusters' : 'places';
export const stableModeForZoom = (zoom, previous) => {
  if (previous === 'countries' && zoom < 5.35) return 'countries';
  if (previous === 'clusters' && zoom >= 4.65 && zoom < 11.35) return 'clusters';
  if (previous === 'places' && zoom >= 10.65) return 'places';
  return modeForZoom(zoom);
};
export const shadeForCount = (count) => count >= 10 ? '#1e40af99' : count >= 5 ? '#2563eb88' : count >= 2 ? '#60a5fa88' : '#bfdbfeaa';

const wrappedDelta = (value) => ((value + 540) % 360) - 180;
const isVisible = (point, region) => Math.abs(point.latitude - region.latitude) <= region.latitudeDelta * 0.65 &&
  Math.abs(wrappedDelta(point.longitude - region.longitude)) <= Math.min(180, region.longitudeDelta * 0.65);

export const groupMarkers = (trips, region, zoom, detailed = false) => {
  const groups = new Map();
  const worldSize = 256 * 2 ** Math.floor(zoom);
  for (const trip of trips) {
    const p = trip.location;
    if (!validLocation(p) || !isVisible(p, region)) continue;
    const lat = Math.max(-85, Math.min(85, p.latitude)) * Math.PI / 180;
    const x = (p.longitude + 180) / 360 * worldSize;
    const y = (0.5 - Math.log((1 + Math.sin(lat)) / (1 - Math.sin(lat))) / (4 * Math.PI)) * worldSize;
    const key = detailed ? `${p.latitude.toFixed(5)}:${p.longitude.toFixed(5)}` : `${Math.floor(x / 64)}:${Math.floor(y / 64)}`;
    if (!groups.has(key)) groups.set(key, { key, trips: [] });
    groups.get(key).trips.push(trip);
  }
  return [...groups.values()].map((group) => ({ ...group,
    coordinate: {
      latitude: group.trips.reduce((sum, trip) => sum + trip.location.latitude, 0) / group.trips.length,
      longitude: group.trips.reduce((sum, trip) => sum + trip.location.longitude, 0) / group.trips.length,
    },
  }));
};

let regionNames;
try { regionNames = new Intl.DisplayNames(['sk'], { type: 'region' }); } catch (_) { /* Native engine may not support DisplayNames. */ }
const localNames = { SK: 'Slovensko', HU: 'Maďarsko', CZ: 'Česko', AT: 'Rakúsko', PL: 'Poľsko', UA: 'Ukrajina', DE: 'Nemecko', HR: 'Chorvátsko' };
export const countryDisplayName = (country) => {
  if (!country) return '';
  try { return regionNames?.of(country.code) || localNames[country.code] || country.name; }
  catch (_) { return localNames[country.code] || country.name; }
};
