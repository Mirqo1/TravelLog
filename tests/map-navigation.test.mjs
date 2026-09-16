import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');
const importSource = (source) => import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const source = (await read('app/utils/mapVisits.js')).replace(
  "import encodedCountries from '../data/countries.json';",
  'const encodedCountries = ' + await read('app/data/countries.json') + ';',
);
const map = await importSource(source);
const { applyLocationSelection } = await importSource(await read('app/utils/locationSelection.js'));

const points = [
  [48.1486, 17.1077], [48.7164, 21.2611], [49.1707, 20.2361],
  [48.3064, 18.0764], [48.7363, 19.1462],
];
const trips = points.map(([latitude, longitude], i) => ({ id: String(i), location: { latitude, longitude }, rating: i + 1 }));
const summary = map.summarizeCountries(trips);
assert.equal(summary.groups.length, 1);
assert.equal(summary.groups[0].country.code, 'SK');
assert.equal(summary.groups[0].trips.length, 5);
assert.equal(summary.unmatched, 0);
assert.equal(map.countryMarkers(trips).length, 1);
assert.equal(map.countryMarkers(trips)[0].trips.length, 5);
assert(trips.some((trip) => trip.location === map.countryMarkers(trips)[0].coordinate));
assert.equal(map.shadeForCount(5), '#2563eb88');
assert.equal(map.modeForZoom(map.zoomForRegion({ longitudeDelta: 55 }, 360)), 'countries');
assert.equal(map.modeForZoom(map.zoomForRegion({ longitudeDelta: 5 }, 360)), 'clusters');
assert.equal(map.modeForZoom(map.zoomForRegion({ longitudeDelta: 0.1 }, 360)), 'places');
assert.equal(map.stableModeForZoom(5.1, 'countries'), 'countries');
assert.equal(map.stableModeForZoom(5.4, 'countries'), 'clusters');
assert.equal(map.stableModeForZoom(4.9, 'clusters'), 'clusters');
assert.equal(map.stableModeForZoom(4.6, 'clusters'), 'countries');
assert.equal(map.stableModeForZoom(11.1, 'clusters'), 'clusters');
assert.equal(map.stableModeForZoom(11.4, 'clusters'), 'places');
assert.equal(map.stableModeForZoom(10.9, 'places'), 'places');
assert.equal(map.stableModeForZoom(10.6, 'places'), 'clusters');

const coastal = { location: { latitude: 43.5081, longitude: 16.4402 } };
assert.equal(map.countryForTrip({ ...coastal, countryCode: 'HR' }).code, 'HR');
assert.equal(map.countryForTrip({ ...coastal, locationName: 'Split, Chorvátsko' }).code, 'HR');
assert.equal(map.countryForTrip({ ...coastal, locationName: 'Split, Croatia' }).code, 'HR');
assert.equal(map.countryForTrip({ location: { latitude: 0, longitude: -140 } }), null);
assert.equal(map.countryForLocation({ latitude: 100, longitude: 10 }), null);
for (const country of map.countries) for (const polygon of country.polygons) for (const ring of polygon) {
  assert(ring.length >= 4);
  assert.deepEqual(ring[0], ring.at(-1));
  for (const [longitude, latitude] of ring) assert(map.validLocation({ latitude, longitude }));
}

const region = { latitude: 48.15, longitude: 17.1, latitudeDelta: 4, longitudeDelta: 5 };
const close = [0, 0.0001, 0.0002].map((delta, i) => ({ id: String(i), location: { latitude: 48.15 + delta, longitude: 17.1 } }));
assert.equal(map.groupMarkers(close, region, 6).length, 1);
assert.equal(map.groupMarkers(close, region, 12, true).length, 3);
assert.equal(map.groupMarkers([close[0], { ...close[0], id: 'duplicate' }], region, 12, true)[0].trips.length, 2);
const dateLine = map.groupMarkers([
  { id: 'east', location: { latitude: 0, longitude: 179.9 } },
  { id: 'west', location: { latitude: 0, longitude: -179.9 } },
], { latitude: 0, longitude: 180, latitudeDelta: 10, longitudeDelta: 10 }, 6);
assert.equal(dateLine.reduce((n, group) => n + group.trips.length, 0), 2);
assert(dateLine.every((group) => Math.abs(group.coordinate.longitude) > 179));

const hospital = { selectionId: 1, name: 'Nemocnica', latitude: 48, longitude: 17 };
let draft = applyLocationSelection({}, null, hospital);
assert.equal(draft.name, 'Nemocnica');
const field = { selectionId: 2, name: '', latitude: 48.01, longitude: 17.01 };
draft = applyLocationSelection(draft, hospital, field);
assert.equal(draft.name, '');
draft.name = 'Piknik';
draft = applyLocationSelection(draft, field, { ...field, locationName: 'Bratislava, Slovakia', countryCode: 'SK' });
assert.equal(draft.name, 'Piknik');
assert.equal(draft.countryCode, 'SK');
const zoo = { ...field, selectionId: 3, name: 'Zoo' };
draft = applyLocationSelection(draft, field, zoo);
assert.equal(draft.name, 'Zoo');
assert.equal(applyLocationSelection(draft, zoo, { ...zoo, selectionId: 4, name: '' }).name, '');
const edited = { ...draft, latitude: '49', longitude: '19', locationName: '', countryCode: '' };
assert.equal(applyLocationSelection(edited, zoo, { ...zoo, locationName: 'Stará lokalita', countryCode: 'SK' }).countryCode, '');

const navigation = await read('app/components/Navigation.js');
assert.equal((navigation.match(/<Tab.Screen /g) || []).length, 4);
assert(!navigation.includes('AddTripScreen'));
console.log('PASS: country counts and geometry, coastal fallback, zoom modes, clustering, date line, selection reset/races and four tabs.');
