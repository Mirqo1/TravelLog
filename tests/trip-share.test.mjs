import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transformSync } from '@babel/core';

let index = 0, slots = [], effects = [], shared = [], captured = 0, nativeShared = [], crops = [];
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
  Modal: 'Modal', Pressable: 'Pressable', ScrollView: 'ScrollView', Text: 'Text', TextInput: 'TextInput', View: 'View',
  PanResponder: { create: handlers => ({ panHandlers: handlers }) }, Platform: { OS: 'android' },
  requireOptionalNativeModule: () => ({ shareImageWithText: async (...args) => nativeShared.push(args) }),
  SafeAreaProvider: 'SafeAreaProvider', SafeAreaView: 'SafeAreaView', theme: { border: '', text: '', muted: '', primary: '', primarySoft: '', surface: '', background: '' },
  StyleSheet: { create: data => data }, captureRef: async ref => { assert.deepEqual(ref, { card: true }); captured++; return 'file:///share.jpg'; },
  Sharing: { isAvailableAsync: async () => true, shareAsync: async (uri, options) => { shared.push([uri, options]); } },
  displayVisitDate: trip => trip.date, photoList: photos => photos || [], photoKey: photo => photo.id,
  photoUri: photo => photo.uri,
  prepareSharePhoto: async (uri, rect) => { crops.push([uri, rect]); return `file:///cropped-${crops.length}.jpg`; },
  removeSharePhoto: async () => {},
  coverGeometry: (sourceWidth, sourceHeight, frameWidth, frameHeight) => {
    const scale = Math.max(frameWidth / sourceWidth, frameHeight / sourceHeight);
    const width = sourceWidth * scale, height = sourceHeight * scale;
    return { width, height, limitX: Math.max(0, (width - frameWidth) / 2), limitY: Math.max(0, (height - frameHeight) / 2) };
  },
  clampCrop: (offset, bounds) => ({ x: Math.max(-bounds.limitX, Math.min(bounds.limitX, offset.x)),
    y: Math.max(-bounds.limitY, Math.min(bounds.limitY, offset.y)) }),
  cropRect: (sw, sh, fw, fh, offset) => ({ originX: Math.max(0, Math.round(240 - offset.x)), originY: 0, width: 320, height: 400 }),
};
globalThis.shareMocks = mocks;
const raw = (await readFile('app/components/TripShareModal.js', 'utf8'))
  .replace(/^import[\s\S]*?from ['"][^'"]+['"];\n/gm, '')
  .replace("require('../../assets/compass-foreground.png')", "'COMPASS_IMAGE'");
const transformed = transformSync(raw, { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-react-jsx'] }).code;
const mod = await import('data:text/javascript;base64,' + Buffer.from(`const {${Object.keys(mocks).join(',')}}=globalThis.shareMocks;\n` + transformed).toString('base64'));
const trip = { id: 'one', name: 'Zoo Košice', locationName: 'Košice, Slovensko', date: '2026-09-28',
  notes: 'private diary', rating: 1, location: { latitude: 48.1, longitude: 21.3 },
  photos: [{ id: 'p1', uri: 'file:///p1.jpg' }, { id: 'p2', uri: 'file:///p2.jpg' }] };
const cropUtils = await import('data:text/javascript;base64,' + Buffer.from(await readFile('app/utils/shareCrop.js', 'utf8')).toString('base64'));
assert.deepEqual(cropUtils.cropRect(800, 400, 320, 400, { x: 500, y: 0 }),
  { originX: 0, originY: 0, width: 320, height: 400 });
assert.deepEqual(cropUtils.cropRect(400, 800, 320, 400, { x: 0, y: -500 }),
  { originX: 0, originY: 300, width: 400, height: 500 });
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
assert.equal(card().props.style.borderWidth, undefined);
assert.equal(card().props.style.borderRadius, undefined);
let cover = nodes(card()).find(n => n.type === 'Image' && n.props.source?.uri === 'file:///p1.jpg');
assert.equal(cover.props.style.width, '100%');
assert.equal(cover.props.style.height, '100%');
const caption = nodes(card()).find(n => n.type === 'View' && n.props.style?.backgroundColor?.startsWith('rgba('));
assert.equal(caption.props.style.bottom, 0);
assert.ok(nodes(caption).some(n => n.type === 'Image' && n.props.source === 'COMPASS_IMAGE'));
let share = nodes(tree).find(n => n.type === 'Pressable' && n.children.some(c => JSON.stringify(c).includes('Pripravujem fotografiu')));
assert.equal(share.props.disabled, true);
cover.props.onLoad({ nativeEvent: { source: { width: 800, height: 400 } } }); tree = render();
await Promise.resolve(); tree = render();
assert.ok(nodes(card()).some(n => n.type === 'Image' && n.props.source?.uri === 'file:///p1.jpg' && n.props.style.width === '100%'),
  'Original photo remains visible while a crop is prepared');
cover = nodes(card()).find(n => n.type === 'Image' && n.props.source?.uri === 'file:///cropped-1.jpg');
assert.ok(cover, 'The prepared crop appears above the original photo');
assert.equal(cover.props.style[1].opacity, 0, 'Incomplete crop cannot flash beige in preview');
cover.props.onLoad(); tree = render();
const photoArea = nodes(card()).find(n => n.type === 'View' && n.props.onMoveShouldSetPanResponder);
assert.equal(photoArea.props.onMoveShouldSetPanResponder(null, { dx: 10, dy: 0 }), true);
assert.equal(photoArea.props.onStartShouldSetPanResponder(), true, 'Photo drag wins over parent scrolling');
photoArea.props.onPanResponderGrant();
photoArea.props.onPanResponderMove(null, { dx: 500, dy: 0 }); tree = render();
assert.equal(nodes(card()).find(n => n.type === 'Image' && n.props.resizeMode === 'stretch').props.style.left, 0,
  'Dragging visibly shifts the original photo to the crop edge');
photoArea.props.onPanResponderRelease(); await Promise.resolve(); tree = render();
cover = nodes(card()).find(n => n.type === 'Image' && n.props.source?.uri === 'file:///cropped-2.jpg');
assert.ok(cover);
assert.equal(crops[1][1].originX, 0);
cover.props.onLoad(); tree = render();
share = nodes(tree).find(n => n.type === 'Pressable' && n.children.some(c => JSON.stringify(c).includes('Zdieľať obrázok')));
await share.props.onPress(); assert.equal(captured, 1); assert.equal(shared[0][0], 'file:///share.jpg');
const input = nodes(tree).find(n => n.type === 'TextInput');
input.props.onChangeText('  Môj výlet  '); tree = render();
share = nodes(tree).find(n => n.type === 'Pressable' && n.children.some(c => JSON.stringify(c).includes('Zdieľať obrázok')));
await share.props.onPress(); assert.deepEqual(nativeShared[0], ['file:///share.jpg', 'Môj výlet']);
assert.equal(shared.length, 1);
const dateChoice = nodes(tree).find(n => n.props.accessibilityRole === 'checkbox' && JSON.stringify(n).includes('dátum'));
dateChoice.props.onPress(); tree = render(); assert.ok(!labels().includes('2026-09-28'));
console.log('PASS: share preview excludes private diary/coordinates/rating, renders prepared crop, optional caption stays separate, empty caption uses plain file share.');
