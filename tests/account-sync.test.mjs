import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
const moduleOf = source => import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const backup = await read('app/utils/backup.js');
const { portableTrips } = await moduleOf(backup);
const merge = (await read('app/utils/syncMerge.js')).replace("import { portableTrips } from './backup';", backup.replace(/export /g, ''));
const { mergeSync, fingerprint } = await moduleOf(merge);
const memory = new Map();
let failWrite = false;
globalThis.syncStorage = {
  async getItem(key) { await Promise.resolve(); return memory.get(key) ?? null; },
  async setItem(key, value) { await Promise.resolve(); if (failWrite) throw new Error('disk full'); memory.set(key, value); },
};
const source = (await read('app/services/mockTripsService.js'))
  .replace("import AsyncStorage from '@react-native-async-storage/async-storage';", 'const AsyncStorage = globalThis.syncStorage;')
  .replace("import { compareTripsNewest } from '../utils/tripOrder';", 'const compareTripsNewest = (a,b) => b.date.localeCompare(a.date);')
  .replace("import { mergeBackup } from '../utils/backup';", '')
  .replace("import { mergeSync, sameVisitContent } from '../utils/syncMerge';", merge.replace(/export /g, ''));
const service = await moduleOf(source);
const { createNotebookSync } = await moduleOf((await read('app/services/notebookSync.js'))
  .replace("import { fingerprint } from '../utils/syncMerge';", merge.replace(/export /g, '')));
const t = (id, name = id) => ({ id, name, date: '2026-09-22', location: { latitude: 48, longitude: 21 }, updatedAt: '2026-09-22T12:00:00Z' });
const snapshot = (trips, revision = 'r1') => ({ version: 1, revision, savedAt: '2026-09-22T12:00:00Z', trips: portableTrips(trips) });

assert.deepEqual(mergeSync([t('a')], [], [t('a')]).trips, []);
assert.deepEqual(mergeSync([t('a')], [t('a')], []).trips, []);
assert.equal(mergeSync([t('a')], [{ ...t('a'), notes: 'offline' }], []).trips[0].notes, 'offline');
const left = t('a', 'First edit'), right = t('a', 'Second edit');
const conflict = mergeSync([t('a')], [left], [right]);
assert.equal(conflict.trips.length, 2);
assert.equal(fingerprint(conflict.trips), fingerprint(mergeSync([t('a')], [right], [left]).trips));
assert.equal(mergeSync([right], conflict.trips, [right]).trips.length, 2);
console.log('PASS: deletion propagation, edit/delete recovery, deterministic concurrent-edit copies.');

let currentUid = 'alice';
let remote = snapshot([t('a')]);
let writes = 0;
const reports = [];
const makeRunner = (id, overrides = {}) => createNotebookSync({
  uid: id, notebookId: 'cloud-' + id,
  readRemote: async uid => { assert.equal(uid, id); return structuredClone(remote); },
  saveRemote: async (trips, expected, uid) => {
    assert.equal(uid, id); assert.equal(currentUid, id);
    if (expected !== (remote?.revision || null)) throw Object.assign(new Error('changed'), { code: 'sync/conflict' });
    writes++; remote = snapshot(trips, 'r' + (writes + 1)); return structuredClone(remote);
  },
  mergeRemote: service.mergeRemoteNotebook, acknowledge: service.acknowledgeNotebook,
  readLocal: service.getNotebookState, refresh: async () => {},
  report: state => reports.push(state), isAccountCurrent: uid => currentUid === uid,
  ...overrides,
});
let runner = makeRunner('alice');
await runner.request();
assert.equal((await service.getTrips('cloud-alice')).length, 1);
await service.deleteTrip('cloud-alice', 'a');
runner.stop();
runner = makeRunner('alice', { readRemote: async () => { throw Object.assign(new Error('offline'), { code: 'unavailable' }); } });
await runner.request(); assert.equal(reports.at(-1).status, 'pending'); runner.stop();
runner = makeRunner('alice'); await runner.request();
assert.equal(remote.trips.length, 0); // restarting and reconnecting must not resurrect the deletion
runner.stop();
console.log('PASS: offline deletion survives restart and uploads after reconnect.');

// Offline edit on phone A must coexist with an independent edit on phone B.
remote = snapshot([t('a'), t('b')], 'server');
await service.mergeRemoteNotebook('cloud-alice', remote);
await service.updateTrip('cloud-alice', 'a', { notes: 'A offline' });
remote = snapshot([t('a'), { ...t('b'), notes: 'B phone' }], 'server2');
runner = makeRunner('alice'); await runner.request(); runner.stop();
assert.equal(remote.trips.find(x => x.id === 'a').notes, 'A offline');
assert.equal(remote.trips.find(x => x.id === 'b').notes, 'B phone');

// Changes made while upload is in flight must be sent without another user action.
await service.updateTrip('cloud-alice', 'a', { notes: 'first' });
let inserted = false;
runner = makeRunner('alice', { saveRemote: async (trips, expected, uid) => {
  assert.equal(uid, 'alice');
  if (!inserted) { inserted = true; await service.updateTrip('cloud-alice', 'a', { notes: 'during upload' }); }
  remote = snapshot(trips, 'inflight-' + (++writes)); return structuredClone(remote);
} });
await runner.request(); runner.stop();
assert.equal(remote.trips.find(x => x.id === 'a').notes, 'during upload');
assert.equal(reports.at(-1).status, 'synced');
console.log('PASS: two-device independent edits and edits arriving during upload retained.');

// Account switch during a delayed fetch: no merge or upload into the next account.
let release; let merged = false; let uploaded = false;
runner = makeRunner('alice', { readRemote: () => new Promise(resolve => { release = resolve; }),
  mergeRemote: async () => { merged = true; }, saveRemote: async () => { uploaded = true; } });
const pending = runner.request(); currentUid = 'bob';
release(snapshot([t('private-alice')])); await pending; runner.stop();
assert.equal(merged, false); assert.equal(uploaded, false);
assert.deepEqual(await service.getTrips('cloud-bob'), []);
currentUid = 'alice';

// Explicit migration only; repeated import cannot revive a visit deleted later.
await service.restoreTripsBackup('mock-tester', [t('legacy')]);
assert.deepEqual(await service.getTrips('cloud-new'), []);
await service.importGuestNotebook('cloud-new', 'mock-tester');
assert.equal((await service.getTrips('cloud-new')).length, 1);
await service.deleteTrip('cloud-new', 'legacy');
await service.importGuestNotebook('cloud-new', 'mock-tester');
assert.equal((await service.getTrips('cloud-new')).length, 0);
assert.equal((await service.getTrips('mock-tester')).length, 1);
console.log('PASS: delayed account-switch isolation, explicit/idempotent import, original notebook retained.');

// A failed atomic storage write preserves BOTH the visits and merge baseline.
const before = memory.get('travellog/mock-trips/cloud-alice');
failWrite = true;
await assert.rejects(service.mergeRemoteNotebook('cloud-alice', snapshot([t('replacement')])));
assert.equal(memory.get('travellog/mock-trips/cloud-alice'), before); failWrite = false;
memory.set('travellog/mock-trips/cloud-corrupt', '{broken');
await assert.rejects(service.mergeRemoteNotebook('cloud-corrupt', remote));
assert.equal(memory.get('travellog/mock-trips/cloud-corrupt'), '{broken');

// A competing server revision retries from a fresh snapshot on the next trigger.
let first = true;
await service.updateTrip('cloud-alice', 'a', { notes: 'retry me' });
runner = makeRunner('alice', { saveRemote: async trips => {
  if (first) { first = false; remote = snapshot([...remote.trips, t('concurrent-new')], 'competing'); throw Object.assign(new Error('conflict'), { code: 'sync/conflict' }); }
  remote = snapshot(trips, 'retried'); return remote;
} });
await runner.request(); assert.equal(reports.at(-1).status, 'pending');
await runner.request(); runner.stop();
assert.ok(remote.trips.some(x => x.id === 'concurrent-new'));
assert.equal(remote.trips.find(x => x.id === 'a').notes, 'retry me');
console.log('PASS: atomic failure/corruption preserves storage; revision conflict retries without losing visits.');

// Portable sync must never upload local photo paths, or wipe the local gallery.
const localPhoto = { id: 'photo-test-1', fileName: 'photo-test-1.jpg', thumbFileName: 'photo-test-1-thumb.jpg', storage: 'local' };
await service.updateTrip('cloud-alice', 'a', { photos: [localPhoto] });
remote = snapshot(remote.trips.map(trip => trip.id === 'a' ? { ...trip, notes: 'changed remotely with gallery retained' } : trip), 'photo-remote');
runner = makeRunner('alice'); await runner.request(); runner.stop();
assert.deepEqual((await service.getTrips('cloud-alice')).find(trip => trip.id === 'a').photos, [localPhoto]);
assert.ok(remote.trips.every(trip => !Object.hasOwn(trip, 'photos')));
await service.updateTrip('cloud-alice', 'a', { photos: [] });
runner = makeRunner('alice'); await runner.request(); runner.stop();
assert.deepEqual((await service.getTrips('cloud-alice')).find(trip => trip.id === 'a').photos, []);
console.log('PASS: cloud metadata changes preserve local gallery; removing local photos stays removed; no photo paths uploaded.');

// Photo-only edit with a timestamp-only remote difference is not a text conflict.
const oldPhotoVisit = { ...t('photo-only'), updatedAt: '2026-09-22T10:00:00Z' };
const localPhotoVisit = { ...oldPhotoVisit, photos: [localPhoto], updatedAt: '2026-09-22T11:00:00Z' };
const remotePhotoVisit = { ...oldPhotoVisit, updatedAt: '2026-09-22T12:00:00Z',
  location: { longitude: 21, latitude: 48 } };
const photoMerge = mergeSync([oldPhotoVisit], [localPhotoVisit], [remotePhotoVisit]);
assert.equal(photoMerge.conflicts, 0);
assert.equal(photoMerge.trips.length, 1);
assert.deepEqual(photoMerge.trips[0].photos, [localPhoto]);
assert.equal(fingerprint([oldPhotoVisit]), fingerprint([{ ...oldPhotoVisit, location: { longitude: 21, latitude: 48 } }]));
const photoAndText = mergeSync([oldPhotoVisit], [localPhotoVisit], [{ ...remotePhotoVisit, notes: 'Real remote note' }]);
assert.equal(photoAndText.conflicts, 0);
assert.equal(photoAndText.trips[0].notes, 'Real remote note');
assert.deepEqual(photoAndText.trips[0].photos, [localPhoto]);
const beforePhotoEdit = (await service.getTrips('cloud-alice')).find(trip => trip.id === 'a');
await service.updateTrip('cloud-alice', 'a', { photos: [localPhoto] });
assert.equal((await service.getTrips('cloud-alice')).find(trip => trip.id === 'a').updatedAt, beforePhotoEdit.updatedAt);
console.log('PASS: gallery-only edit keeps shared timestamp; timestamp/key-order differences never create a conflict copy; real remote text edit retains local gallery.');

// Drive restore must be photo-only and must lose to concurrent local gallery edits.
const restoreUser = 'cloud-drive-restore';
const visit = await service.addTrip(restoreUser, { ...t('restore'), photos: [] });
const beforeRestore = (await service.getTrips(restoreUser))[0];
assert.equal(await service.restoreVisitPhotos(restoreUser, visit.id, [{ id: 'photo-drive', fileName: 'photo-drive.jpg' }], '[]', () => false), false);
assert.equal(await service.restoreVisitPhotos(restoreUser, visit.id, [{ id: 'photo-drive', fileName: 'photo-drive.jpg' }], '[]', () => true), true);
assert.equal((await service.getTrips(restoreUser))[0].updatedAt, beforeRestore.updatedAt);
assert.equal(await service.restoreVisitPhotos(restoreUser, visit.id, [{ id: 'photo-other', fileName: 'photo-other.jpg' }], '[]', () => true), false);
await service.deleteTrip(restoreUser, visit.id);
assert.equal(await service.restoreVisitPhotos(restoreUser, visit.id, [], '[]', () => true), false);
console.log('PASS: Drive photo-only restore preserves timestamps, respects account cancellation and existing galleries, never recreates a deleted visit.');

const wishVisit1 = await service.addTrip('cloud-wishlist-test', t('ignored', 'Planned zoo'), 'wish-123');
const wishVisit2 = await service.addTrip('cloud-wishlist-test', t('ignored', 'Retry'), 'wish-123');
assert.equal(wishVisit1.id, wishVisit2.id);
assert.equal((await service.getTrips('cloud-wishlist-test')).length, 1);
assert.equal(wishVisit2.name, 'Planned zoo');
console.log('PASS: wishlist conversion retry creates one visit and preserves the first saved visit.');
