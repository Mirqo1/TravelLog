import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transformSync } from '@babel/core';
const load = source => import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const { photoAccess } = await load(await readFile('app/utils/visitPhotos.js', 'utf8'));
assert.equal(photoAccess('production', {}, 'premium').canAddPhotos, false);
assert.equal(photoAccess('production', { admin: 'true', tester: 'true' }, 'premium').canTest, false);
assert.equal(photoAccess('production', { premium: true }, 'free').canAddPhotos, true);
assert.equal(photoAccess('production', { tester: true }).canAddPhotos, false);
assert.equal(photoAccess('production', { tester: true }, 'premium').canAddPhotos, true);
assert.equal(photoAccess('production', { admin: true }, 'free').canAddPhotos, false);
const preview = 'com.miroslavu19.travellog.preview';
let slots = [], index = 0, effects = [], account = null, notebookId = 'guest-a', claims = {};
let failSave = false, failRefresh = false, pendingToken = null, listener;
const memory = new Map();
const hooks = {
  useState(initial) { const i = index++; if (!(i in slots)) slots[i] = initial;
    return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
  useRef(initial) { const i = index++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; },
  useCallback(fn, deps) { const i = index++; if (!slots[i] || deps.some((v,j) => v !== slots[i].deps[j])) slots[i] = { fn, deps }; return slots[i].fn; },
  useEffect(fn, deps) { const i = index++; if (!slots[i] || deps.some((v,j) => v !== slots[i].deps[j])) {
    const old = slots[i]; const next = slots[i] = { deps };
    effects.push(() => { old?.cleanup?.(); next.cleanup = fn(); });
  } },
  createContext: () => ({ Provider: 'Access' }), useContext: () => null,
};
const cloudUser = () => account && { uid: account.uid, getIdTokenResult: async force => {
  assert.equal(force, true);
  if (pendingToken) return pendingToken;
  if (failRefresh) throw Error('offline');
  return { claims: { ...claims } };
} };
const Constants = { expoConfig: { android: { package: preview } } };
globalThis.accessDouble = { ...hooks, React: { createElement: (type, props, ...children) => ({ type, props, children }) },
  Constants, useAuth: () => ({ account, notebookId }), getCloudAccount: cloudUser, photoAccess,
  AppState: { addEventListener: (_, fn) => { listener = fn; return { remove() {} }; } },
  AsyncStorage: { getItem: async key => memory.get(key) ?? null,
    setItem: async (key, value) => { if (failSave) throw Error('disk full'); memory.set(key, value); } },
};
const source = (await readFile('app/context/AccessContext.js', 'utf8')).replace(/^import .*;\n/gm, '');
const code = transformSync(source, { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-react-jsx'] }).code;
const { AccessProvider, testModeKey } = await load(`const {${Object.keys(globalThis.accessDouble).join(',')}} = globalThis.accessDouble;\n${code}`);
function render() { index = 0; const tree = AccessProvider({ children: 'same notebook' }); const jobs = effects; effects = []; jobs.forEach(fn => fn()); return tree.props.value; }
const flush = async () => { render(); await new Promise(resolve => setImmediate(resolve)); return render(); };
let value = await flush();
assert.equal(value.canAddPhotos, true);
await value.setTestMode('free'); value = render();
assert.equal(value.canAddPhotos, false, 'Every usePhotoAccess consumer reads this shared value');
assert.equal(memory.get(testModeKey('guest-a')), 'free');
failSave = true; await assert.rejects(value.setTestMode('premium')); value = render();
assert.equal(value.mode, 'free'); failSave = false;
// Recreate the provider: saved Free takes effect before access is exposed.
slots = []; effects = []; value = render(); assert.equal(value.canAddPhotos, false);
value = await flush(); assert.equal(value.mode, 'free');
account = { uid: 'a' }; notebookId = 'cloud-a'; value = render();
assert.equal(value.ready, false, 'Old notebook mode is never applied to the next account');
value = await flush(); assert.equal(value.mode, 'auto');
Constants.expoConfig.android.package = 'production';
claims = { tester: true }; await value.refreshAccess(); value = render();
assert.equal(value.canTest, true); assert.equal(value.canAddPhotos, false);
await value.setTestMode('premium'); value = render(); assert.equal(value.canAddPhotos, true);
claims = {}; await value.refreshAccess(); value = render();
assert.equal(value.canTest, false); assert.equal(value.canAddPhotos, false, 'Revocation ignores a saved Premium override');
await value.setTestMode('premium'); assert.equal(render().canAddPhotos, false);
claims = { admin: true, premium: true }; await value.refreshAccess(); value = render();
await value.setTestMode('free'); value = render(); assert.equal(value.canAddPhotos, false);
await value.setTestMode('auto'); value = render(); assert.equal(value.canAddPhotos, true);
failRefresh = true; listener('active'); await new Promise(resolve => setImmediate(resolve));
value = render(); assert.equal(value.canTest, false); assert.equal(value.canAddPhotos, false); failRefresh = false;
let resolveToken; pendingToken = new Promise(resolve => { resolveToken = resolve; });
const stale = value.refreshAccess();
account = { uid: 'b' }; notebookId = 'cloud-b'; pendingToken = null; claims = {};
value = await flush(); resolveToken({ claims: { admin: true } }); await stale; value = render();
assert.equal(value.canTest, false, 'Late claims from the previous account cannot authorize this account');
assert.equal(value.mode, 'auto');
assert.equal(memory.get(testModeKey('cloud-a')), 'auto');
console.log('PASS: shared plan switching, restart, account isolation, save failure, strict roles, revocation, offline failure and stale token response.');
