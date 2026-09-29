import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transformSync } from '@babel/core';
const read = path => readFile(path, 'utf8');
const load = source => import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const en = JSON.parse(await read('app/i18n/en.json'));
const sk = JSON.parse(await read('app/i18n/sk.json'));
assert.deepEqual(Object.keys(en).sort(), Object.keys(sk).sort());
const i18n = await load((await read('app/i18n/index.js'))
  .replace("import english from './en.json';", `const english = ${JSON.stringify(en)};`)
  .replace("import slovak from './sk.json';", `const slovak = ${JSON.stringify(sk)};`));
assert.equal(i18n.getLanguage(), 'en');
assert.equal(i18n.t('Moje sny'), 'My dreams');
assert.equal(i18n.t('Návštevy v roku {0}', { 0: 2017 }), 'Visits in 2017');
assert.equal(i18n.t('Návštevy v roku 2017'), 'Visits in 2017');
assert.equal(i18n.t('Neznámy vlastný text'), 'Neznámy vlastný text');
assert.equal(i18n.t('Firebase: Error (auth/invalid-credential).'), 'The email or password is incorrect.');
const name = 'ZOO Košice · $&';
assert.equal(i18n.t('Naozaj chceš vymazať {0}?', { 0: name }), `Are you sure you want to delete ${name}?`);
i18n.setCurrentLanguage('sk');
assert.equal(i18n.t('Home'), 'Domov');
assert.equal(i18n.t('Moje sny'), 'Moje sny');
assert.equal(i18n.t('Visits in 2017'), 'Návštevy v roku 2017');

// The setting is restored on restart and a failed save keeps the current language.
let slots = [], index = 0, effects = [], fail = false;
const memory = new Map();
const hooks = {
  useState(value) { const i = index++; if (!(i in slots)) slots[i] = value;
    return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; },
  useEffect(fn, deps) { const i = index++; if (!slots[i] || deps.some((value, j) => value !== slots[i].deps[j])) {
    slots[i] = { deps }; effects.push(fn);
  } },
  createContext: () => ({ Provider: 'LanguageProvider' }), useContext: () => null,
};
globalThis.languageDouble = { ...hooks, ...i18n,
  React: { createElement: (type, props, ...children) => ({ type, props, children }) },
  AsyncStorage: { getItem: async key => memory.get(key), setItem: async (key, value) => {
    if (fail) throw Error('storage failed'); memory.set(key, value);
  } },
};
const src = (await read('app/context/LanguageContext.js')).replace(/^import .*;\n/gm, '');
const compiled = transformSync(src, { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-react-jsx'] }).code;
const { LanguageProvider } = await load(`const {${Object.keys(globalThis.languageDouble).join(',')}} = globalThis.languageDouble;\n${compiled}`);
const render = () => { index = 0; const tree = LanguageProvider({ children: 'Existing navigation' });
  const pending = effects; effects = []; pending.forEach(fn => fn()); return tree; };
render(); await new Promise(resolve => setImmediate(resolve));
let tree = render(); assert.equal(tree.props.value.language, 'en');
assert.equal(tree.children[0], 'Existing navigation');
await tree.props.value.setLanguage('sk'); tree = render();
assert.equal(tree.props.value.language, 'sk'); assert.equal(memory.get(i18n.LANGUAGE_KEY), 'sk');
assert.equal(tree.children[0], 'Existing navigation', 'Changing language preserves the mounted app');
fail = true; await assert.rejects(tree.props.value.setLanguage('en'));
tree = render(); assert.equal(tree.props.value.language, 'sk'); fail = false;
slots = []; effects = []; render(); await new Promise(resolve => setImmediate(resolve)); tree = render();
assert.equal(tree.props.value.language, 'sk', 'Saved language returns after restarting');
assert.equal(i18n.normalizeLanguage('xx'), 'en');

const { adjacentTab, swipeDirection } = await load(await read('app/utils/tabSwipe.js'));
const routes = ['Home', 'Trips', 'Map', 'Profile'].map(name => ({ name }));
assert.equal(swipeDirection({ dx: -80, dy: 4, numberActiveTouches: 1 }, true), 1);
assert.equal(adjacentTab(routes, 'Trips', 1), 'Map');
assert.equal(adjacentTab(routes, 'Home', -1), null);
assert.equal(adjacentTab(routes, 'Profile', 1), null);
assert.equal(swipeDirection({ dx: 80, dy: 60, numberActiveTouches: 1 }, true), 0, 'Vertical scrolling cannot switch tabs');
assert.equal(swipeDirection({ dx: 20, dy: 0, numberActiveTouches: 1 }, true), 0, 'Short drags cannot switch tabs');
assert.equal(swipeDirection({ dx: 100, dy: 0, numberActiveTouches: 2 }, true), 0, 'Multi-touch cannot switch tabs');

// Exercise actual responder callbacks: ordinary taps stay with the tab buttons;
// keyboard input and cancelled gestures cannot navigate.
slots = []; effects = [];
const listeners = new Map(), navigated = [];
let keyboardVisible = false;
globalThis.swipeDouble = { ...hooks, useRef(value) { const i = index++; slots[i] ??= { current: value }; return slots[i]; },
  React: globalThis.languageDouble.React, View: 'View', BottomTabBar: 'BottomTabBar',
  adjacentTab, swipeDirection, Keyboard: { isVisible: () => keyboardVisible,
    addListener: (event, callback) => { listeners.set(event, callback); return { remove() {} }; } },
  PanResponder: { create: handlers => ({ panHandlers: handlers }) },
};
const swipeSource = (await read('app/components/SwipeTabs.js')).replace(/^import .*;\n/gm, '');
const swipeCode = transformSync(swipeSource, { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-react-jsx'] }).code;
const { SwipeTabBar } = await load(`const {${Object.keys(globalThis.swipeDouble).join(',')}}=globalThis.swipeDouble;\n${swipeCode}`);
index = 0;
const bar = SwipeTabBar({ state: { routes, index: 1 }, navigation: { navigate: name => navigated.push(name) } });
effects.forEach(fn => fn()); effects = [];
const gesture = { dx: -80, dy: 4, numberActiveTouches: 1 };
assert.equal(bar.props.onStartShouldSetPanResponder(), false);
assert.equal(bar.props.onMoveShouldSetPanResponder(null, gesture), true);
bar.props.onPanResponderRelease(null, gesture); assert.deepEqual(navigated, ['Map']);
listeners.get('keyboardDidShow')(); keyboardVisible = true;
assert.equal(bar.props.onMoveShouldSetPanResponder(null, gesture), false);
bar.props.onPanResponderRelease(null, gesture); assert.deepEqual(navigated, ['Map']);
assert.equal(bar.children[0].type, 'BottomTabBar', 'The stock bar retains its safe-area handling');
console.log('PASS: English fallback, Slovak UI, interpolation, unchanged user text, persistent language, failed-save protection and deliberate one-finger tab swipes.');
