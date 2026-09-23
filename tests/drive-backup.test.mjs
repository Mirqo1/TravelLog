import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const moduleOf = source => import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const utils = await readFile('app/utils/visitPhotos.js', 'utf8');
const memory = new Map(), disk = new Map(), remote = new Map();
const hash = (s, kind = 'sha256') => createHash(kind).update(s).digest('hex');
const photo = { id: 'photo-one', fileName: 'photo-one.jpg', width: 1200, height: 800, bytes: 300 };
const photoUri = p => 'file:///documents/visit-photos/' + p.fileName;
const image = { size: 300, md5: hash('image', 'md5') };
const binding = { permissionId: 'drive-alice', email: 'alice@example.com' };
let active = true, online = true, wifi = true, wrongIdentity = false, uploads = 0, albums = 0, seq = 0;
let failUpload = false, failAlbum = false, corruptDownload = false, changeAccountOnList = false, failStatus = 0, tokenCleared = false;
let latestLocation, canceled = 0, holdUpload = false, releaseUpload, uploadStarted;
const reports = [];
const native = { sha256: hash, authorize: async () => 'private-access-token', clearToken: async () => { tokenCleared = true; }, network: () => ({ online, wifi }) };
const fs = {
  documentDirectory: 'file:///documents/', cacheDirectory: 'file:///cache/',
  FileSystemUploadType: { BINARY_CONTENT: 0 }, FileSystemSessionType: { FOREGROUND: 0 },
  makeDirectoryAsync: async () => {}, getInfoAsync: async uri => ({ exists: disk.has(uri), ...disk.get(uri) }),
  deleteAsync: async uri => { disk.delete(uri); }, moveAsync: async ({ from, to }) => { disk.set(to, disk.get(from)); disk.delete(from); },
  createUploadTask: (url, uri) => ({ cancelAsync: async () => { canceled++; releaseUpload?.(); }, uploadAsync: async () => {
    assert.equal(url, latestLocation);
    if (holdUpload) { uploadStarted?.(); return new Promise(resolve => { releaseUpload = resolve; }); }
    if (failUpload) throw new Error('connection lost');
    uploads++;
    const id = new URL(url).searchParams.get('id');
    const f = remote.get(id); Object.assign(f, { size: disk.get(uri).size, md5Checksum: disk.get(uri).md5, complete: true });
    return { status: 200, body: JSON.stringify(f) };
  } }),
  createDownloadResumable: (url, destination) => ({ cancelAsync: async () => { canceled++; }, downloadAsync: async () => {
    const f = remote.get(new URL(url).pathname.split('/').at(-1));
    disk.set(destination, { size: Number(f.size), md5: corruptDownload ? hash('corrupt', 'md5') : f.md5Checksum });
    return { status: 200 };
  } }),
};
globalThis.driveDouble = { native, fs, storage: { getItem: async k => memory.get(k) ?? null, setItem: async (k, v) => memory.set(k, v) }, photoUri };
const source = (await readFile('app/services/drivePhotoBackup.js', 'utf8'))
 .replace("import AsyncStorage from '@react-native-async-storage/async-storage';", 'const AsyncStorage = globalThis.driveDouble.storage;')
 .replace("import * as FileSystem from 'expo-file-system/legacy';", 'const FileSystem = globalThis.driveDouble.fs;')
 .replace("import { requireOptionalNativeModule } from 'expo-modules-core';", 'const requireOptionalNativeModule = () => globalThis.driveDouble.native;')
 .replace("import { photoUri } from './visitPhotoService';", 'const photoUri = globalThis.driveDouble.photoUri;')
 .replace("import { managedName, MAX_PHOTO_BYTES, MAX_VISIT_PHOTOS, photoList } from '../utils/visitPhotos';", utils.replace(/export /g, ''));
const { createDriveSession, validatePhotoManifest } = await moduleOf(source);
const response = (data, status = 200, headers = {}) => ({ ok: status >= 200 && status < 300, status, text: async () => data ? JSON.stringify(data) : '', headers: { get: n => headers[n] } });
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, opts) => {
  assert.equal(opts.headers.Authorization, 'Bearer private-access-token');
  const u = new URL(url);
  if (failStatus) return response({ error: { errors: [{ reason: failStatus === 403 ? 'storageQuotaExceeded' : 'expired' }] } }, failStatus);
  if (u.pathname.endsWith('/about')) return response({ user: { permissionId: wrongIdentity ? 'another-drive' : binding.permissionId, emailAddress: binding.email } });
  if (opts.method === 'POST' && u.searchParams.get('uploadType') === 'resumable') {
    const id = 'f' + (++seq); remote.set(id, { ...JSON.parse(opts.body), id, complete: false });
    latestLocation = 'https://www.googleapis.com/upload/session?id=' + id;
    return response(null, 200, { location: latestLocation });
  }
  if (u.searchParams.get('uploadType') === 'multipart') {
    if (failAlbum) throw new Error('album response lost');
    const chunks = opts.body.split('\r\n');
    const metadata = JSON.parse(chunks.find(x => x.startsWith('{')));
    const content = JSON.parse(chunks.filter(x => x.startsWith('{'))[1]);
    const id = 'f' + (++seq); albums++;
    remote.set(id, { ...metadata, id, content, size: 1000, complete: true, modifiedTime: String(seq).padStart(8, '0') }); return response({ id });
  }
  const id = u.pathname.split('/').at(-1);
  if (opts.method === 'PATCH') {
    if (failAlbum) throw new Error('album response lost');
    Object.assign(remote.get(id), { content: JSON.parse(opts.body), modifiedTime: String(++seq).padStart(8, '0') }); albums++; return response({ id });
  }
  if (id !== 'files') {
    const f = remote.get(id); return response(u.searchParams.get('alt') === 'media' ? f.content : f);
  }
  const q = u.searchParams.get('q');
  if (changeAccountOnList) active = false;
  const match = q.match(/name = '([^']+)'/);
  return response({ files: [...remote.values()].filter(f => f.complete && (match ? f.name === match[1] : f.appProperties.kind === 'album' && f.appProperties.owner === hash('alice'))) });
};
let trips = [{ id: 'visit-1', photos: [photo] }];
const make = (options = {}) => createDriveSession({ uid: 'alice', binding, isCurrent: () => active, wifiOnly: () => true, ...options });
const backup = s => s.backup({ readTrips: async () => structuredClone(trips), report: r => reports.push(r) });
disk.set(photoUri(photo), image);
try {
  const owner = hash('alice');
  assert.throws(() => validatePhotoManifest({ version: 1, owner, tripId: 'a', photos: [{ ...photo, fileName: '../private', driveId: 'f1', md5: image.md5 }] }, owner));
  wrongIdentity = true; await assert.rejects(make().authorize(), e => e.code === 'IDENTITY'); wrongIdentity = false;
  wifi = false; await assert.rejects(backup(make()), e => e.code === 'WIFI'); wifi = true;
  online = false; await assert.rejects(backup(make()), e => e.code === 'OFFLINE'); online = true;
  failUpload = true; await assert.rejects(backup(make())); assert.equal(albums, 0); failUpload = false;
  failAlbum = true; await assert.rejects(backup(make())); assert.equal(uploads, 1); failAlbum = false;
  await backup(make()); assert.equal(uploads, 1); assert.equal(albums, 1); // restart reuses uploaded blob
  await backup(make()); assert.equal(uploads, 1); assert.equal(albums, 1); // no duplicate on unchanged notebook
  assert.equal(reports.at(-1).status, 'saved');
  assert.ok(!JSON.stringify([...memory]).includes('private-access-token'));
  console.log('PASS: Wi-Fi/offline gates, Drive identity binding, durable interrupted upload recovery, blob reuse, no stored tokens.');

  disk.clear(); trips = [{ id: 'visit-1', photos: [] }];
  let attached = 0;
  const restore = s => s.restore({ readTrips: async () => structuredClone(trips), report: r => reports.push(r),
    attachPhotos: async (id, photos) => { attached++; trips.find(t => t.id === id).photos = photos; return true; } });
  corruptDownload = true; await assert.rejects(restore(make()), e => e.code === 'INVALID_BACKUP');
  assert.equal(attached, 0); assert.equal(disk.size, 0); corruptDownload = false;
  await restore(make()); assert.equal(attached, 1); assert.equal(trips[0].photos[0].id, photo.id); assert.ok(disk.has(photoUri(photo)));
  await restore(make()); assert.equal(attached, 1); // existing gallery not overwritten
  trips = []; await restore(make()); assert.equal(attached, 1); // deleted visit not recreated
  console.log('PASS: checksum-verified restore, corrupt download cleanup, existing galleries preserved, deleted visits not resurrected.');

  trips = [{ id: 'visit-2', photos: [photo] }];
  changeAccountOnList = true; await assert.rejects(backup(make()), e => e.code === 'STOPPED');
  assert.equal(albums, 1); changeAccountOnList = false; active = true;
  failStatus = 403; await assert.rejects(backup(make()), e => e.code === 'QUOTA');
  failStatus = 401; await assert.rejects(backup(make()), e => e.code === 'AUTH_REQUIRED'); assert.equal(tokenCleared, true); failStatus = 0;
  const stopped = make(); stopped.stop(); await assert.rejects(backup(stopped), e => e.code === 'STOPPED');
  console.log('PASS: account-switch cancellation before writes, quota and authorization errors, stopped runner.');
  remote.clear(); trips = [{ id: 'visit-1', photos: [photo] }];
  const priorUploads = uploads;
  await backup(make()); assert.equal(uploads, priorUploads + 1); // cleared hidden Drive data must be recreated
  remote.clear(); holdUpload = true;
  const start = new Promise(resolve => { uploadStarted = resolve; });
  const running = make(); const operation = backup(running);
  await start; running.stop();
  await assert.rejects(operation, e => e.code === 'STOPPED'); assert.equal(canceled, 1);
  assert.ok(![...remote.values()].some(f => f.complete));
  console.log('PASS: cleared cloud data repaired; in-flight native transfer is cancelled without acknowledging an album.');
} finally { globalThis.fetch = originalFetch; }
