import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../app/utils/placeSearch.js', import.meta.url), 'utf8');
const { searchParameters, parsePlaces } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const region = { latitude: 48.72, longitude: 21.26 };
for (const query of ['kosice zoo', 'ZOO Košice', '  Zoologická záhrada   Košice ']) {
  assert.deepEqual(searchParameters(query, region), { q: 'kosice', limit: 5, osm_tag: 'tourism:zoo', lat: 48.72, lon: 21.26 });
}
assert.equal(searchParameters('ZOO', region).q, 'zoo');
assert.equal(searchParameters('Múzeum Bratislava').osm_tag, 'tourism:museum');
assert.deepEqual(searchParameters('Eiffel Tower'), { q: 'eiffel tower', limit: 5 });
const feature = (id, coordinates = [21.2, 48.78]) => ({
  properties: { osm_id: id, osm_type: 'W', name: 'Zoologická záhrada Košice', city: 'Kavečany, Košice', country: 'Slovensko', countrycode: 'sk' },
  geometry: { type: 'Point', coordinates },
});
const results = parsePlaces({ features: [feature(1), feature(1), feature(2, [200, 48]), feature(3, [21, null]), ...[4, 5, 6, 7, 8, 9].map((id) => feature(id))] });
assert.equal(results.length, 5);
assert.equal(results[0].latitude, 48.78);
assert.equal(results[0].longitude, 21.2);
assert.equal(results[0].countryCode, 'SK');
assert.equal(results[0].locationName, 'Kavečany, Košice, Slovensko');
assert.equal(new Set(results.map((r) => r.id)).size, 5);
assert.deepEqual(parsePlaces(null), []);
console.log('PASS: category/locality queries, diacritics, coordinates, deduplication, five-result limit and locality.');
