import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const read = path => readFile(path, 'utf8');
const load = source => import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const dates = await load(await read('app/utils/visitDate.js'));
const backup = await load(await read('app/utils/backup.js'));
globalThis.transferUtilsDouble = { ...dates, ...backup };
const utils = await load((await read('app/utils/visitTransfer.js'))
  .replace(/^import .*;\n/gm, '')
  .replace('export const TRANSFER_FORMAT', 'const {parseVisitDate, validVisitTime, normalizeTags} = globalThis.transferUtilsDouble;\nexport const TRANSFER_FORMAT'));
const hash = text => createHash('sha256').update(text).digest('hex');
const trip = { id: 'source', userId: 'private-owner', name: 'Zoo Košice', date: '2026-09-29', visitTime: '09:30',
  locationName: 'Košice', countryCode: 'SK', location: { latitude: 48.8, longitude: 21.2 }, rating: 5,
  placeId: 'google:zoo', description: 'Zoo with family', notes: 'PRIVATE NOTE', tags: ['family'],
  photos: [{ id: 'photo-one', fileName: 'photo-one.jpg', uri: 'file:///documents/visit-photos/photo-one.jpg' }] };
const metadata = { entry: 'photos/0.jpg', width: 1200, height: 900, bytes: 300, sha256: hash('JPEG') };
const manifest = { format: utils.TRANSFER_FORMAT, version: 1, kind: 'invitation', sourceId: hash('source'),
  author: 'Miroslav', visit: utils.transferVisit(trip), photos: [metadata] };
assert.equal(manifest.visit.notes, undefined); assert.equal(manifest.visit.rating, undefined);
assert.equal(manifest.visit.id, undefined); assert.equal(manifest.visit.photos, undefined);
assert.equal(manifest.visit.userId, undefined); assert.equal(manifest.visit.tags, undefined);
assert.equal(utils.transferVisit(trip, { notes: true }).notes, 'PRIVATE NOTE');
assert.equal(utils.transferVisit(trip, { date: false }).date, undefined);
assert.deepEqual(utils.validateVisitTransfer(manifest).visit, manifest.visit);
for (const patch of [{ version: 2 }, { sourceId: '../bad' }, { author: 123 }, { photos: Array(11).fill(metadata) },
  { photos: [{ ...metadata, entry: '../manifest.json' }] }, { photos: [{ ...metadata, width: 50000 }] },
  { photos: [{ ...metadata, bytes: 3 * 1024 * 1024 }] }, { photos: [{ ...metadata, sha256: 'wrong' }] },
  { visit: { ...manifest.visit, date: '2026-02-31' } }, { visit: { ...manifest.visit, location: { latitude: 999, longitude: 21 } } }])
  assert.throws(() => utils.validateVisitTransfer({ ...manifest, ...patch }));
const own = utils.receivedVisitDraft({ ...manifest.visit, notes: 'shared note', rating: 5 }, '2026-09-30', '10:15');
assert.equal(own.notes, ''); assert.equal(own.rating, 0); assert.deepEqual(own.photos, []);
assert.equal(own.date, '2026-09-30'); assert.equal(own.visitTime, '10:15');
assert.throws(() => utils.receivedVisitDraft(manifest.visit, null, ''));
assert.throws(() => utils.receivedVisitDraft(manifest.visit, '2026-02-31', ''));
assert.throws(() => utils.receivedVisitDraft(manifest.visit, '2026-09-30', '31:12'));
console.log('PASS: whitelisted private fields, opt-in notes, bounded schema/photos, real dates/time and independent personal notes/rating.');

let current = true, pick = null, cloned = 0, createdManifest, createdUrls, shared = [], discarded = [], removed = [], visits = [], writeFailure = false;
const native = {
  sha256: hash,
  createVisitPackage: async (content, urls) => { createdManifest = JSON.parse(content); createdUrls = urls; return 'file:///cache/package.zip'; },
  pickVisitPackage: async () => pick,
  discardVisitPackage: async uri => { discarded.push(uri); },
};
const mocks = { Native: native, Sharing: { isAvailableAsync: async () => true, shareAsync: async (...args) => shared.push(args) },
  photoUri: photo => photo.uri, importVisitPhoto: async photo => ({ id: 'photo-copy-' + (++cloned), fileName: 'photo-copy-' + cloned + '.jpg', width: photo.width, height: photo.height }),
  deleteManagedPhoto: async photo => { removed.push(photo.id); }, getTrips: async () => visits,
  importSharedVisit: async (_, sourceId, draft, isCurrent) => {
    if (!isCurrent()) throw Error('account changed');
    if (writeFailure) throw Error('disk full');
    const existing = visits.find(v => v.sharedSourceId === sourceId);
    if (existing) return { trip: existing, already: true };
    const saved = { ...draft, sharedSourceId: sourceId, id: 'own-' + visits.length }; visits.push(saved); return { trip: saved, already: false };
  }, ...utils };
globalThis.transferServiceDouble = mocks;
const source = (await read('app/services/visitTransferService.js')).replace(/^import .*;\n/gm, '').replace("const Native = requireOptionalNativeModule('TravelLogDrive');", '');
const service = await load(`const {${Object.keys(mocks).join(',')}} = globalThis.transferServiceDouble;\n${source}`);
await service.sendVisitTransfer({ trip, notebookId: 'cloud-private-owner', author: 'Miroslav', kind: 'copy', options: utils.DEFAULT_TRANSFER_OPTIONS, photos: trip.photos, isCurrent: () => current });
assert.equal(shared.length, 1); assert.equal(shared[0][1].mimeType, 'application/zip');
assert.equal(createdManifest.kind, 'copy'); assert.equal(createdManifest.visit.notes, undefined);
assert.ok(!JSON.stringify(createdManifest).includes('private-owner')); assert.ok(!JSON.stringify(createdManifest).includes('file:///'));
assert.deepEqual(createdUrls, [trip.photos[0].uri]);
assert.equal(discarded.length, 0, 'A receiver may read an exported package after the chooser returns');
const receive = { manifest: JSON.stringify(manifest), directory: 'file:///cache/receive',
  photos: [{ ...metadata, uri: 'file:///cache/receive/0.jpg', thumbUri: 'file:///cache/receive/0-thumb.jpg' }] };
pick = receive; const incoming = await service.openVisitTransfer();
assert.equal(visits.length, 0, 'Preview must never create a visit'); assert.equal(incoming.kind, 'invitation');
const accept = extra => service.acceptVisitTransfer({ data: incoming, notebookId: 'recipient', date: '2026-09-30', visitTime: '10:15',
  includePhotos: true, confirmed: true, isCurrent: () => current, ...extra });
await assert.rejects(accept({ confirmed: false })); assert.equal(cloned, 0);
const accepted = await accept(); assert.equal(accepted.already, false); assert.equal(visits.length, 1);
assert.notEqual(accepted.trip.id, trip.id); assert.equal(accepted.trip.photos.length, 1); assert.notEqual(accepted.trip.photos[0].id, trip.photos[0].id);
visits[0].notes = 'MY OWN NOTE';
const again = await accept(); assert.equal(again.already, true); assert.equal(visits.length, 1); assert.equal(cloned, 1);
assert.equal(visits[0].notes, 'MY OWN NOTE');
await service.discardVisitTransfer(incoming); assert.equal(discarded.at(-1), receive.directory);
assert.equal(visits.length, 1, 'Discarding a preview cannot delete an accepted visit');
visits = []; writeFailure = true; await assert.rejects(accept()); assert.ok(removed.includes('photo-copy-2')); writeFailure = false;
await accept({ includePhotos: false }); assert.deepEqual(visits[0].photos, []);
current = false; await assert.rejects(accept()); current = true;
pick = { ...receive, photos: [{ ...receive.photos[0], sha256: hash('CORRUPT') }] };
await assert.rejects(service.openVisitTransfer()); assert.equal(discarded.at(-1), receive.directory);
pick = null; assert.equal(await service.openVisitTransfer(), null);
console.log('PASS: ZIP handoff, no UID/local URI leaks, preview without writes, explicit acceptance, cloned ownership, duplicate suppression, text-only import, rollback, cancellation and corrupt preview disposal.');
