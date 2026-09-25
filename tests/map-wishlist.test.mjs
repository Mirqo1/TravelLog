import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transformSync } from '@babel/core';
const load = src => import('data:text/javascript;base64,' + Buffer.from(src).toString('base64'));
const read = p => readFile(p, 'utf8');
const map = await load((await read('app/utils/mapVisits.js'))
  .replace("import encodedCountries from '../data/countries.json';", 'const encodedCountries = ' + await read('app/data/countries.json') + ';')
  .replace("import countryLabelPoints from '../data/countryLabelPoints.json';", 'const countryLabelPoints = ' + await read('app/data/countryLabelPoints.json') + ';'));
let slots = [], index = 0, effects = [], premium = true;
const wish = { id: 'wish-one', name: 'Zoo', notes: 'Keep this note', countryCode: 'SK', locationName: 'Košice', location: { latitude: 48.8, longitude: 21.2 } };
const hooks = {
 useState(value) { const i = index++; if (!(i in slots)) slots[i] = value; return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; },
 useRef(value) { const i = index++; slots[i] ??= { current: value }; return slots[i]; },
 useMemo: fn => fn(),
 useEffect(fn, deps) { const i = index++; if (!slots[i] || deps.some((d,n) => d !== slots[i].deps[n])) {
   const old = slots[i]; slots[i] = { deps }; effects.push(() => { old?.cleanup?.(); slots[i].cleanup = fn(); });
 } },
};
const hostNames = ['MaterialIcons','WishlistModal','WishlistEditor','Modal','Pressable','ScrollView','Text','TextInput','View',
  'SafeAreaProvider','SafeAreaView','MapView','Heatmap','Marker','AddPlaceModal','TripDetailsModal','MapTypeToggle'];
const mocks = { ...hooks, ...map, ...Object.fromEntries(hostNames.map(n => [n,n])),
 React: { createElement: (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity).filter(x => x !== null && x !== false && x !== undefined) }) },
 theme: {}, StyleSheet: { create: x => x }, useIsFocused: () => true,
 useWishlist: () => ({ premium, items: [wish] }), useTrips: () => ({ trips: [], addTrip: async () => {}, updateTrip: async () => {}, deleteTrip: async () => {} }),
 Keyboard: { dismiss() {} }, Alert: { alert() {} }, Linking: {}, displayVisitDate: () => '', searchPlaces: async () => [],
};
globalThis.mapWishMocks = mocks;
const src = (await read('app/screens/MapScreen.js')).replace(/^import .*;\n/gm, '');
const compiled = transformSync(src, { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-react-jsx'] }).code;
const { default: Screen } = await load(`const { ${Object.keys(mocks).join(',')} } = globalThis.mapWishMocks;\n${compiled}`);
const render = () => { index = 0; const tree = Screen({ route: {}, navigation: { setParams() {} } }); const work = effects; effects = []; work.forEach(fn => fn()); return tree; };
const nodes = tree => !tree || typeof tree !== 'object' ? [] : [tree, ...tree.children.flatMap(nodes)];
const text = tree => typeof tree === 'string' ? tree : tree?.children?.map(text).join('') || '';
const byType = (tree,type) => nodes(tree).find(n => n.type === type);
const button = tree => nodes(tree).find(n => n.type === 'Pressable' && text(n) === '☆ Chcem navštíviť');
let tree = render();
assert.ok(button(tree), 'Premium action is present before choosing a point');
assert.equal(byType(tree, 'Heatmap'), undefined, 'Planned places do not create visit heat');
assert.equal(nodes(tree).filter(n => n.type === 'Marker').length, 0, 'World overview stays uncluttered');
button(tree).props.onPress(); tree = render(); assert.equal(button(tree).props.accessibilityState.selected, true);
button(tree).props.onPress(); tree = render(); assert.equal(button(tree).props.accessibilityState.selected, false);
button(tree).props.onPress(); tree = render();
byType(tree,'MapView').props.onPoiClick({ nativeEvent: { coordinate: wish.location, name: 'Museum' } });
tree = render(); assert.equal(byType(tree,'WishlistEditor').props.place.name, 'Museum');
assert.equal(byType(tree,'WishlistEditor').props.place.latitude, 48.8);
byType(tree,'WishlistEditor').props.onClose(); tree = render(); assert.ok(button(tree));
// Zooming in reveals planned-place markers, selecting one reuses its saved ID/notes.
byType(tree,'MapView').props.onRegionChangeComplete({ ...wish.location, latitudeDelta: 0.025, longitudeDelta: 0.025 });
render(); tree = render();
const marker = nodes(tree).find(n => n.type === 'Marker' && n.props.key === 'wishes:wish-one');
assert.ok(marker); marker.props.onPress({ stopPropagation() {} }); tree = render();
button(tree).props.onPress(); tree = render();
assert.equal(byType(tree,'WishlistEditor').props.place.id, wish.id);
assert.equal(byType(tree,'WishlistEditor').props.place.notes, wish.notes);
byType(tree,'WishlistEditor').props.onClose();
premium = false; tree = render(); assert.equal(button(tree), undefined);
assert.equal(nodes(tree).find(n => n.type === 'Pressable' && n.props.accessibilityLabel?.startsWith('Otvoriť wishlist')), undefined, 'Dreams list entry moved into Trips');
console.log('PASS: persistent Premium action, cancel/retry map selection, POI editor, overview decluttering, saved-item reuse and Free wishlist access.');
