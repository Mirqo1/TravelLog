import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const raw = await readFile('app/context/DriveBackupContext.js', 'utf8');
const memory = new Map(), listeners = [], timers = new Map();
let account = { uid: 'alice' }, premium = true, index = 0, slots = [], pendingEffects = [], timerId = 0;
let backupCalls = 0, restoreCalls = 0, stopCalls = 0, heldBackup = null;
const hooks = {
  createContext: () => ({}), useContext: () => {},
  useRef(value) { const i = index++; slots[i] ??= { current: value }; return slots[i]; },
  useState(value) { const i = index++; if (!(i in slots)) slots[i] = value;
    return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; },
  useEffect(fn, deps) { const i = index++; if (!slots[i] || deps.some((d,n) => d !== slots[i].deps[n])) {
    const previous = slots[i]; slots[i] = { deps }; pendingEffects.push(() => { previous?.cleanup?.(); slots[i].cleanup = fn(); });
  } },
};
const appState = { currentState: 'active', addEventListener: (_, fn) => { listeners.push(fn); return { remove: () => listeners.splice(listeners.indexOf(fn),1) }; } };
const bind = { permissionId: 'drive-alice', email: 'alice@example.com', wifiOnly: true };
const stateKey = uid => 'drive/' + uid;
memory.set(stateKey('alice'), JSON.stringify(bind));
globalThis.driveContextDouble = { ...hooks, AppState: appState,
  storage: { getItem: async k => memory.get(k) ?? null, setItem: async (k,v) => memory.set(k,v), removeItem: async k => memory.delete(k) },
  useAuth: () => ({ account }), getCloudAccount: () => account,
  useTrips: () => ({ trips: [], loading: false, notebookId: `cloud-${account?.uid}`, refreshAfterSync: async () => {} }),
  usePhotoAccess: () => ({ canAddPhotos: premium }), getTrips: async () => [], restoreVisitPhotos: async () => true,
  createDriveSession: ({ uid, isCurrent }) => ({
    authorize: async () => bind, check: () => { if (!isCurrent()) throw Object.assign(new Error('stopped'), { code: 'STOPPED' }); },
    stop: () => { stopCalls++; },
    backup: async ({ report }) => { backupCalls++; if (heldBackup) await heldBackup.promise;
      if (isCurrent()) report({ status: 'saved', message: uid }); return '2026-09-23T10:00:00Z'; },
    restore: async ({ report }) => { restoreCalls++; report({ status: 'restored', message: uid }); },
  }), driveAvailable: true, driveSettingsKey: stateKey, galleryFingerprint: JSON.stringify,
  setInterval: fn => { const id = ++timerId; timers.set(id, fn); return id; },
  setTimeout: fn => { const id = ++timerId; timers.set(id, fn); return id; },
  clearInterval: id => timers.delete(id), clearTimeout: id => timers.delete(id),
};
const src = raw.replace(/^import .*;\n/gm, '')
 .replace(/return <Context.Provider value=\{([\s\S]*?)\}>\{children\}<\/Context.Provider>;/, 'return ($1);');
const names = Object.keys(globalThis.driveContextDouble).filter(n => n !== 'storage');
const prefix = `const { ${names.join(',')} } = globalThis.driveContextDouble; const AsyncStorage = globalThis.driveContextDouble.storage;\n`;
const { DriveBackupProvider } = await import('data:text/javascript;base64,' + Buffer.from(prefix + src).toString('base64'));
const render = () => { index = 0; const value = DriveBackupProvider({}); const effects = pendingEffects; pendingEffects = []; effects.forEach(fn => fn()); return value; };
const tick = () => new Promise(resolve => setImmediate(resolve));
// Cold start: Firebase has not restored an account yet and settings are null.
account = null;
let value = render();
assert.equal(value.config, null);
assert.equal(value.ready, false);
assert.equal(value.signedIn, false);
await tick(); value = render();
assert.equal(value.config, null);
account = { uid: 'alice' };
render(); await tick(); value = render();
assert.equal(value.config.email, bind.email);
// Provider owns auto timers regardless of which navigation screen is visible.
for (const fn of timers.values()) fn(); await tick(); value = render();
assert.equal(backupCalls, 1); assert.equal(value.status, 'saved');
assert.equal(JSON.parse(memory.get(stateKey('alice'))).lastSaved, '2026-09-23T10:00:00Z');
appState.currentState = 'background'; for (const fn of timers.values()) fn(); await tick(); assert.equal(backupCalls, 1);
appState.currentState = 'active'; listeners.forEach(fn => fn('active')); await tick(); assert.equal(backupCalls, 2);
premium = false; value = render(); await value.backup(); assert.equal(backupCalls, 2);
await value.restore(); assert.equal(restoreCalls, 1);
console.log('PASS: app-wide foreground autosave, background gate, premium upload gate, non-premium restore.');
premium = true; value = render();
let release; heldBackup = { promise: new Promise(r => { release = r; }) };
const inFlight = value.backup();
account = { uid: 'bob' }; render(); await tick(); value = render();
release(); await inFlight; heldBackup = null; value = render();
assert.equal(value.config, null); assert.notEqual(value.message, 'alice');
assert.equal(memory.has(stateKey('bob')), false); assert.ok(stopCalls > 0);
await value.connect(); value = render(); assert.equal(value.config.permissionId, bind.permissionId);
await value.disconnect(); value = render(); assert.equal(value.config, null); assert.equal(memory.has(stateKey('bob')), false);
console.log('PASS: in-flight account switch cannot update new account settings/state, explicit connect/disconnect.');

// Sign-out returns to the same no-account state after settings have been loaded.
account = null;
value = render();
assert.equal(value.config, null);
assert.equal(value.ready, false);
await tick(); value = render();
assert.equal(value.config, null);
assert.equal(value.signedIn, false);
console.log('PASS: cold start before Firebase restoration and sign-out remain safe with null settings.');
