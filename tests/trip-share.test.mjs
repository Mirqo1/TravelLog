import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transformSync } from '@babel/core';

let index = 0, slots = [], effects = [], shared = [], captured = 0;
const hooks = {
  useState(initial) { const i = index++; if (!(i in slots)) slots[i] = initial;
    return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; },
  useRef(initial) { const i = index++; slots[i] ??= { current: initial }; return slots[i]; },
  useEffect(fn, deps) { const i = index++; if (!slots[i] || deps.some((dep, j) => dep !== slots[i].deps[j])) {
    slots[i] = { deps }; effects.push(fn);
  } },
};
const React = { createElement(type, props, ...children) {
  if (props?.ref) props.ref.current = { card: true };
  return { type, props: props || {}, children: children.flat(Infinity).filter(child => child != null && child !== false) };
} };
const mocks = { React, ...hooks,
  ActivityIndicator: 'ActivityIndicator', Alert: { alert: message => { throw Error(message); } }, Image: 'Image',
  Modal: 'Modal', Pressable: 'Pressable', ScrollView: 'ScrollView', Text: 'Text', View: 'View',
  SafeAreaProvider: 'SafeAreaProvider', SafeAreaView: 'SafeAreaView', theme: { border: '', text: '', muted: '', primary: '', primarySoft: '', surface: '', background: '' },
  StyleSheet: { create: data => data }, captureRef: async ref => { assert.deepEqual(ref, { card: true }); captured++; return 'file:///share.jpg'; },
  Sharing: { isAvailableAsync: async () => true, shareAsync: async (uri, options) => { shared.push([uri, options]); } },
  displayVisitDate: trip => trip.date, photoList: photos => photos || [], photoKey: photo => photo.id,
  photoUri: photo => photo.uri,
};
globalThis.shareMocks = mocks;
const raw = (await readFile('app/components/TripShareModal.js', 'utf8')).replace(/^import[\s\S]*?from ['"][^'"]+['"];\n/gm, '');
const transformed = transformSync(raw, { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-react-jsx'] }).code;
const mod = await import('data:text/javascript;base64,' + Buffer.from(`const {${Object.keys(mocks).join(',')}}=globalThis.shareMocks;\n` + transformed).toString('base64'));
const trip = { id: 'one', name: 'Zoo Košice', locationName: 'Košice, Slovensko', date: '2026-09-28',
  notes: 'private diary', rating: 1, location: { latitude: 48.1, longitude: 21.3 },
  photos: [{ id: 'p1', uri: 'file:///p1.jpg' }, { id: 'p2', uri: 'file:///p2.jpg' }] };
const render = () => { index = 0; const tree = mod.default({ visible: true, trip, onClose: () => {} });
  const pending = effects; effects = []; pending.forEach(fn => fn()); return tree; };
const nodes = node => !node || typeof node !== 'object' ? [] : [node, ...node.children.flatMap(nodes)];
let tree = render(); tree = render();
const card = () => nodes(tree).find(n => n.type === 'View' && n.props.collapsable === false);
const labels = () => JSON.stringify(card());
assert.ok(labels().includes('Zoo Košice'));
assert.ok(labels().includes('Košice, Slovensko'));
assert.ok(labels().includes('2026-09-28'));
assert.ok(!labels().includes('private diary'));
assert.ok(!labels().includes('latitude'));
assert.ok(!labels().includes('rating'));
let share = nodes(tree).find(n => n.type === 'Pressable' && n.children.some(c => JSON.stringify(c).includes('Načítavam fotografiu')));
assert.equal(share.props.disabled, true);
nodes(card()).find(n => n.type === 'Image').props.onLoad(); tree = render();
share = nodes(tree).find(n => n.type === 'Pressable' && n.children.some(c => JSON.stringify(c).includes('Zdieľať obrázok')));
await share.props.onPress(); assert.equal(captured, 1); assert.equal(shared[0][0], 'file:///share.jpg');
const dateChoice = nodes(tree).find(n => n.props.accessibilityRole === 'checkbox' && JSON.stringify(n).includes('dátum'));
dateChoice.props.onPress(); tree = render(); assert.ok(!labels().includes('2026-09-28'));
console.log('PASS: share preview excludes private diary/coordinates/rating, image loading gate, explicit destination choice and optional date.');
