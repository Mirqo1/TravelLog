const normalize = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

// Separate a category from the locality: "kosice zoo" must search zoos,
// not pet shops whose brand happens to contain "zoo".
const categories = [
  [/\b(zoologicka zahrada|zoologicka|zoo)\b/, 'tourism:zoo', 'zoo'],
  [/\b(muzeum|museum)\b/, 'tourism:museum', 'museum'],
  [/\b(nemocnica|hospital)\b/, 'amenity:hospital', 'hospital'],
];

export function searchParameters(query, region) {
  const text = normalize(query).replace(/\s+/g, ' ');
  const params = { q: text, limit: 5 };
  for (const [pattern, tag, fallback] of categories) {
    if (pattern.test(text)) {
      params.q = text.replace(pattern, '').trim() || fallback;
      params.osm_tag = tag;
      break;
    }
  }
  if (Number.isFinite(region?.latitude) && Number.isFinite(region?.longitude)) {
    params.lat = region.latitude;
    params.lon = region.longitude;
  }
  return params;
}

export function parsePlaces(data) {
  const seen = new Set();
  return (Array.isArray(data?.features) ? data.features : []).flatMap((feature) => {
    const p = feature.properties || {};
    const [longitude, latitude] = feature.geometry?.coordinates || [];
    if (feature.geometry?.type !== 'Point' || !Number.isFinite(latitude) || !Number.isFinite(longitude)
      || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return [];
    const name = p.name || p.street || p.city;
    if (!name) return [];
    const id = p.osm_id ? `${p.osm_type}:${p.osm_id}` : `${name}:${latitude}:${longitude}`;
    if (seen.has(id)) return [];
    seen.add(id);
    const locationName = [...new Set([p.city || p.district || p.county, p.state, p.country].filter(Boolean))].join(', ');
    return [{ id, name, latitude, longitude, locationName, countryCode: (p.countrycode || '').toUpperCase() }];
  }).slice(0, 5);
}
