import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const load = source => import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const utils = await readFile('app/utils/wishlist.js', 'utf8');
const { mergeWishes, validateWish } = await load(utils);
const item = { id: 'wish-a', name: 'ZOO', locationName: 'Košice', countryCode: 'SK', notes: '', location: { latitude: 48.8, longitude: 21.2 }, changedAt: 1, deleted: false };
const changed = { ...item, notes: 'Offline note', changedAt: 2 };
const deleted = { id: item.id, changedAt: 3, deleted: true };
assert.deepEqual(mergeWishes([item], [changed]), [changed]);
assert.deepEqual(mergeWishes([deleted], [changed]), [deleted]);
assert.deepEqual(mergeWishes([changed], [deleted]), [deleted]);
assert.deepEqual(mergeWishes([item], [{ ...deleted, changedAt: 1 }]), [{ ...deleted, changedAt: 1 }]);
assert.deepEqual(mergeWishes([item], [{ ...item, name: 'Zoo' }]), mergeWishes([{ ...item, name: 'Zoo' }], [item]));
assert.throws(() => validateWish({ ...item, location: { latitude: 100, longitude: 21 } }));
assert.throws(() => validateWish({ ...item, id: '../other-account' }));
assert.throws(() => validateWish({ ...item, changedAt: NaN }));
assert.throws(() => validateWish({ ...item, notes: 'a'.repeat(2001) }));
const memory = new Map(); let fail = false;
globalThis.wishStorage = { getItem: async key => memory.get(key) ?? null, setItem: async (key, value) => { if (fail) throw new Error('disk full'); memory.set(key, value); } };
const service = await load((await readFile('app/services/wishlistService.js', 'utf8'))
 .replace("import AsyncStorage from '@react-native-async-storage/async-storage';", 'const AsyncStorage = globalThis.wishStorage;')
 .replace("import { mergeWishes, validateWish } from '../utils/wishlist';", utils.replace(/export /g, '')));
await Promise.all([service.saveWish('alice', item), service.saveWish('alice', { ...item, id: 'wish-b' })]);
assert.equal((await service.wishlistStore('alice')).length, 2);
assert.equal((await service.wishlistStore('bob')).length, 0);
await service.saveWish('alice', item, true);
const removed = (await service.wishlistStore('alice')).find(i => i.id === item.id);
assert.equal(removed.deleted, true);
await service.wishlistStore('alice', [item]);
assert.deepEqual((await service.wishlistStore('alice')).find(i => i.id === item.id), removed);
fail = true; await assert.rejects(service.saveWish('alice', { ...item, id: 'wish-c' })); fail = false;
assert.equal((await service.wishlistStore('alice')).length, 2);
await service.saveWish('alice', { ...item, id: 'wish-c' });
assert.equal((await service.wishlistStore('alice')).length, 3);
console.log('PASS: offline merge, tombstones, tie convergence, validation, serialized writes, account isolation and failed-write recovery.');

// Render the actual provider with lightweight hooks to exercise lifecycle boundaries.
let account = null, premium = true, index = 0, slots = [], effects = [], nextTimer = 0, holdRead = null;
const timers = new Map(), listeners = [], remote = new Map();
let writes = 0;
const hooks = {
 createContext: () => ({}), useContext: () => {},
 useRef(value) { const i = index++; slots[i] ??= { current: value }; return slots[i]; },
 useState(value) { const i = index++; if (!(i in slots)) slots[i] = value;
   return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; },
 useEffect(fn, deps) { const i = index++; if (!slots[i] || deps.some((d,n) => d !== slots[i].deps[n])) {
   const old = slots[i]; slots[i] = { deps }; effects.push(() => { old?.cleanup?.(); slots[i].cleanup = fn(); });
 } },
};
const AppState = { currentState: 'active', addEventListener: (_, fn) => { listeners.push(fn); return { remove: () => listeners.splice(listeners.indexOf(fn), 1) }; } };
globalThis.wishDouble = { ...hooks, AppState, mergeWishes, ...service,
 useAuth: () => ({ account, notebookId: account ? `cloud-${account.uid}` : null }),
 usePhotoAccess: () => ({ canAddPhotos: premium, preview: false }), getCloudAccount: () => account,
 readCloudWishlist: async uid => { if (holdRead) await holdRead; return remote.get(uid) || []; },
 saveCloudWish: async (uid, value, merge) => { assert.equal(uid, account.uid); writes++; const merged = merge(remote.get(uid) || [], [value]); remote.set(uid, merged); return merged.find(i => i.id === value.id); },
 setInterval: fn => { timers.set(++nextTimer, fn); return nextTimer; }, clearInterval: id => timers.delete(id),
};
const source = (await readFile('app/context/WishlistContext.js', 'utf8')).replace(/^import .*;\n/gm, '')
 .replace(/return <Context.Provider value=\{([\s\S]*?)\}>\{children\}<\/Context.Provider>;/, 'return ($1);');
const { WishlistProvider } = await load(`const { ${Object.keys(globalThis.wishDouble).join(',')} } = globalThis.wishDouble;\n` + source);
const render = () => { index = 0; const result = WishlistProvider({}); const run = effects; effects = []; run.forEach(fn => fn()); return result; };
const tick = () => new Promise(resolve => setImmediate(resolve));
let value = render(); await tick(); value = render(); assert.equal(value.ready, false); assert.equal(value.items.length, 0);
account = { uid: 'alice' }; render(); await tick(); value = render(); assert.equal(value.ready, true);
AppState.currentState = 'background'; await value.save(item); await tick(); assert.equal(writes, 0);
AppState.currentState = 'active'; listeners.forEach(fn => fn('active')); await tick(); value = render();
assert.equal(writes, 1); assert.equal(remote.get('alice')[0].name, 'ZOO');
premium = false; value = render(); await assert.rejects(value.save({ ...item, id: 'wish-locked' }), /Premium/);
await value.remove(value.items[0]); await tick(); value = render(); assert.equal(value.items.length, 0);
assert.equal(remote.get('alice')[0].deleted, true);
// An old account's in-flight response must never appear in the new account.
let release; holdRead = new Promise(resolve => { release = resolve; });
const inFlight = value.sync();
account = { uid: 'bob' }; value = render(); assert.equal(value.items.length, 0);
release(); holdRead = null; await inFlight; await tick(); value = render(); assert.equal(value.items.length, 0);
assert.equal(remote.has('bob'), false);
account = null; value = render(); await tick(); value = render(); assert.equal(value.ready, false);
assert.equal(value.items.length, 0);
console.log('PASS: cold start, foreground sync outside screens, premium gate, expired-premium removal, account switch and logout isolation.');
