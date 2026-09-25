import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const load = source => import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const utils = await readFile(new URL('../app/utils/visitPhotos.js', import.meta.url), 'utf8');
const { selectCover, photoList, resizeWithin, photoAccess, MAX_PHOTO_BYTES } = await load(utils);
assert.deepEqual(resizeWithin(4000, 3000, 2000), { width: 2000, height: 1500 });
assert.deepEqual(resizeWithin(1200, 2400, 720), { width: 360, height: 720 });
assert.deepEqual(resizeWithin(100, 200, 720), { width: 100, height: 200 });
assert.throws(() => resizeWithin(0, 0, 720));
assert.equal(photoList([{ id: 'bad', fileName: '../secret.jpg' }]).length, 0);
assert.equal(photoAccess('production', {}).canAddPhotos, false);
assert.equal(photoAccess('production', { premium: 'true' }).canAddPhotos, false);
assert.equal(photoAccess('production', { premium: true }).canAddPhotos, true);
assert.equal(photoAccess('com.miroslavu19.travellog.preview').preview, true);
const input = ['file:///one.jpg', 'file:///two.jpg'];
assert.deepEqual(selectCover(input, input[1]), [input[1], input[0]]);
assert.deepEqual(input, ['file:///one.jpg', 'file:///two.jpg']);

const files = new Map([['file:///original.jpg', { size: 5000000 }]]);
const removed = [], resized = [];
let counter = 0, failCopy = false, released = 0;
globalThis.photoDouble = {
  fs: { documentDirectory: 'file:///documents/',
    makeDirectoryAsync: async () => {},
    getInfoAsync: async uri => ({ exists: files.has(uri), ...files.get(uri) }),
    copyAsync: async ({ from, to }) => { if (failCopy && to.endsWith('-thumb.jpg')) throw new Error('disk full'); files.set(to, files.get(from)); },
    deleteAsync: async uri => { removed.push(uri); files.delete(uri); },
  },
  manipulator: { manipulate: uri => {
    let dimensions;
    return { resize: size => { dimensions = size; resized.push(size); }, release: () => released++,
      renderAsync: async () => ({ release: () => released++, saveAsync: async () => {
        const saved = 'file:///cache/' + (++counter) + '.jpg'; files.set(saved, { size: 200000 });
        return { uri: saved, ...dimensions };
      } }) };
  } },
  sharing: { isAvailableAsync: async () => true, shareAsync: async uri => { assert.ok(files.has(uri)); } },
};
const source = (await readFile(new URL('../app/services/visitPhotoService.js', import.meta.url), 'utf8'))
  .replace("import * as FileSystem from 'expo-file-system/legacy';", 'const FileSystem = globalThis.photoDouble.fs;')
  .replace("import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';", "const ImageManipulator = globalThis.photoDouble.manipulator; const SaveFormat = { JPEG: 'jpeg' };")
  .replace("import * as Sharing from 'expo-sharing';", 'const Sharing = globalThis.photoDouble.sharing;')
  .replace("import { managedName, MAX_PHOTO_BYTES, photoList, resizeWithin } from '../utils/visitPhotos';", utils.replace(/export /g, ''));
const service = await load(source);
const photo = await service.importVisitPhoto({ uri: 'file:///original.jpg', type: 'image', width: 4000, height: 3000 });
assert.ok(files.has(service.photoUri(photo)));
assert.ok(files.has(service.photoUri(photo, true)));
assert.ok(photo.bytes <= MAX_PHOTO_BYTES);
assert.equal(photo.width, 2000); assert.equal(photo.height, 1500);
assert.equal(photo.uri, undefined); // durable metadata is independent of the sandbox's absolute path
assert.equal(released, 4);
assert.ok(![...files.keys()].some(uri => uri.startsWith('file:///cache/')));
assert.ok(files.has('file:///original.jpg'));
await service.exportVisitPhoto(photo);
await service.discardUnusedDrafts([photo], async () => [{ photos: [photo] }]);
assert.ok(files.has(service.photoUri(photo))); // closing an editor after save must keep its committed file
await service.discardUnusedDrafts([photo], async () => { throw new Error('storage unreadable'); });
assert.ok(files.has(service.photoUri(photo))); // fail safe
await service.discardUnusedDrafts([photo], async () => []);
assert.equal(files.has(service.photoUri(photo)), false);
assert.equal(files.has(service.photoUri(photo, true)), false);
failCopy = true;
await assert.rejects(service.importVisitPhoto({ uri: 'file:///original.jpg', type: 'image', width: 4000, height: 3000 }));
assert.deepEqual([...files.keys()], ['file:///original.jpg']);
await service.deleteManagedPhoto('file:///original.jpg');
assert.ok(files.has('file:///original.jpg'));
console.log('PASS: premium/preview access, cover ordering, landscape/portrait sizing, durable full/thumbnail copies, cache cleanup, failed import rollback, safe draft cleanup, originals untouched.');
