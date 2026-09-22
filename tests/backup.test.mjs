import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../app/utils/backup.js', import.meta.url), 'utf8');
const { portableTrips, validateBackup, mergeBackup } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const trip = { id: 'one', name: 'Zoo', location: { latitude: 48, longitude: 21 }, date: '2026-09-16', photos: ['file:///private/photo.jpg'], userId: 'local-user' };
const snapshot = { version: 1, revision: 'r1', trips: portableTrips([trip]) };
assert.equal(snapshot.trips[0].photos, undefined);
assert.equal(snapshot.trips[0].userId, undefined);
assert.deepEqual(validateBackup(snapshot), snapshot);
assert.throws(() => validateBackup({ ...snapshot, version: 2 }));
assert.throws(() => validateBackup({ ...snapshot, trips: [...snapshot.trips, ...snapshot.trips] }));
assert.throws(() => validateBackup({ ...snapshot, trips: [{ ...trip, location: { latitude: 99, longitude: 21 } }] }));
const merged = mergeBackup([trip], [{ ...trip, name: 'Older name' }, { ...trip, id: 'two' }], 'target');
assert.equal(merged.length, 2);
assert.equal(merged[0].name, 'Zoo');
assert.deepEqual(merged[0].photos, trip.photos);
assert.equal(merged[1].userId, 'target');
assert.deepEqual(merged[1].photos, []);
assert.deepEqual(mergeBackup(merged, snapshot.trips, 'target'), merged);
console.log('PASS: portable backup, invalid/duplicate records rejected, local photos preserved, idempotent additive restore.');

// Exercise the actual local service with an asynchronous storage double.
const memory = new Map();
globalThis.backupTestStorage = {
  async getItem(key) { await Promise.resolve(); return memory.get(key) ?? null; },
  async setItem(key, value) { await Promise.resolve(); memory.set(key, value); },
};
const mergeSource = (await readFile(new URL('../app/utils/syncMerge.js', import.meta.url), 'utf8')).replace("import { portableTrips } from './backup';", '').replace(/export /g, '');
const serviceSource = (await readFile(new URL('../app/services/mockTripsService.js', import.meta.url), 'utf8'))
  .replace("import AsyncStorage from '@react-native-async-storage/async-storage';", 'const AsyncStorage = globalThis.backupTestStorage;')
  .replace("import { compareTripsNewest } from '../utils/tripOrder';", 'const compareTripsNewest = (a, b) => b.date.localeCompare(a.date);')
  .replace("import { mergeBackup } from '../utils/backup';", source.replace(/export /g, ''))
  .replace("import { mergeSync, sameVisitContent } from '../utils/syncMerge';", mergeSource);
const service = await import('data:text/javascript;base64,' + Buffer.from(serviceSource).toString('base64'));
assert.deepEqual(await service.getTrips('new-device'), []);
await Promise.all([
  service.restoreTripsBackup('new-device', snapshot.trips),
  service.addTrip('new-device', { ...trip, name: 'Added while restoring' }),
]);
assert.equal((await service.getTrips('new-device')).length, 2);
memory.set('travellog/mock-trips/broken', 'invalid-json');
await assert.rejects(service.getTrips('broken'));
assert.equal(memory.get('travellog/mock-trips/broken'), 'invalid-json');
console.log('PASS: concurrent restore/add retained, new device has no demo records, corrupt storage never overwritten.');
