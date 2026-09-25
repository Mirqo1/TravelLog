import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { photoUri } from './visitPhotoService';
import { managedName, MAX_PHOTO_BYTES, MAX_VISIT_PHOTOS, photoList } from '../utils/visitPhotos';

const Native = requireOptionalNativeModule('TravelLogDrive');
const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
export const driveAvailable = !!Native;
export const driveSettingsKey = uid => `travellog/drive/settings/${uid}`;
export const galleryFingerprint = photos => JSON.stringify(photoList(photos).map(p => typeof p === 'string' ? p :
  ({ id: p.id, fileName: p.fileName, width: p.width, height: p.height, bytes: p.bytes })));
const fault = (code, message) => Object.assign(new Error(message), { code });
const escapeQuery = value => String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const fileFields = 'id,name,size,md5Checksum,modifiedTime,appProperties';
const metadataPhotos = photos => photoList(photos).filter(p => typeof p === 'object');
const albumQuery = owner => `appProperties has { key='owner' and value='${owner}' } and appProperties has { key='kind' and value='album' }`;
const albumName = (owner, tripId, deviceId) => `tl-${owner}-${Native.sha256(tripId)}-${deviceId}.json`;
export function validatePhotoManifest(data, owner) {
  if (data?.version !== 1 || data.owner !== owner || typeof data.tripId !== 'string' || !data.tripId
      || !Array.isArray(data.photos) || data.photos.length > MAX_VISIT_PHOTOS)
    throw fault('INVALID_BACKUP', 'Záloha fotografií má neplatný formát.');
  const ids = new Set();
  for (const p of data.photos) {
    if (!p || !/^photo-[a-z0-9-]+$/.test(p.id) || p.fileName !== `${p.id}.jpg` || !managedName(p.fileName)
        || !/^[\w-]+$/.test(p.driveId) || !/^[a-f0-9]{32}$/.test(p.md5)
        || !Number.isInteger(p.bytes) || p.bytes < 1 || p.bytes > MAX_PHOTO_BYTES
        || !Number.isInteger(p.width) || !Number.isInteger(p.height) || p.width < 1 || p.height < 1
        || p.width > 2000 || p.height > 2000 || ids.has(p.id))
      throw fault('INVALID_BACKUP', 'Záloha obsahuje neplatnú fotografiu.');
    ids.add(p.id);
  }
  return data;
}

// Each run is tied to both a Firebase UID and a Drive permissionId. No OAuth
// tokens are persisted; Play Services obtains them again after process restart.
export function createDriveSession({ uid, binding, isCurrent, wifiOnly = () => true }) {
  if (!Native) throw fault('UNAVAILABLE', 'Nainštaluj nový Android build s podporou Google Disku.');
  const owner = Native.sha256(uid);
  let stopped = false, token = null;
  const cancel = new Set();
  const check = (network = false) => {
    if (stopped || !isCurrent()) throw fault('STOPPED', 'Prenos bol zastavený.');
    if (network) {
      const state = Native.network();
      if (!state.online) throw fault('OFFLINE', 'Fotky čakajú na internet.');
      if (wifiOnly() && !state.wifi) throw fault('WIFI', 'Fotky čakajú na Wi-Fi.');
    }
  };
  const stop = () => { stopped = true; for (const abort of cancel) abort(); cancel.clear(); token = null; };
  async function statusError(status, body = '') {
    if (status === 401) {
      const old = token; token = null;
      if (old) await Native.clearToken(old).catch(() => {});
      throw fault('AUTH_REQUIRED', 'Prístup k Disku vypršal. Obnov pripojenie v Profile.');
    }
    if (/storageQuotaExceeded/.test(body)) throw fault('QUOTA', 'Google Disk je plný. Uvoľni miesto; fotky zostali v telefóne.');
    if (status === 429 || status >= 500 || /rateLimitExceeded|userRateLimitExceeded/.test(body))
      throw fault('RETRY', 'Google Disk je dočasne nedostupný. Prenos zopakujeme.');
    if (status === 403) throw fault('AUTH_REQUIRED', 'Google Disk odmietol prístup. Skontroluj oprávnenie a zapnutie Drive API.');
    throw fault('DRIVE_ERROR', `Prenos fotografií zlyhal (HTTP ${status}). Skús ho zopakovať.`);
  }
  async function request(url, options = {}, gated = true) {
    check(gated);
    const controller = new AbortController();
    const abort = () => controller.abort(); cancel.add(abort);
    const timer = setTimeout(abort, 45000);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal,
        headers: { Authorization: `Bearer ${token}`, ...options.headers } });
      const body = await response.text(); check();
      if (!response.ok) await statusError(response.status, body);
      return { response, body, data: body ? JSON.parse(body) : null };
    } finally { clearTimeout(timer); cancel.delete(abort); }
  }
  async function authorize(interactive = false, chooseAccount = false) {
    check();
    token = await Native.authorize(binding?.email || null, interactive, chooseAccount); check();
    const { data } = await request(`${API}/about?fields=user(permissionId,emailAddress),storageQuota`, {}, false);
    if (!data?.user?.permissionId || !data.user.emailAddress) throw fault('IDENTITY', 'Google účet sa nepodarilo overiť.');
    if (binding?.permissionId && data.user.permissionId !== binding.permissionId)
      throw fault('IDENTITY', 'Bol vybraný iný Google účet. Odpoj Disk a pripoj požadovaný účet.');
    return { permissionId: data.user.permissionId, email: data.user.emailAddress };
  }
  async function list(query) {
    let page, files = [];
    do {
      const { data } = await request(`${API}/files?spaces=appDataFolder&pageSize=1000&fields=${encodeURIComponent(`nextPageToken,files(${fileFields})`)}&q=${encodeURIComponent(`trashed = false and (${query})`)}${page ? `&pageToken=${encodeURIComponent(page)}` : ''}`);
      files.push(...(data.files || [])); page = data.nextPageToken;
    } while (page);
    return files;
  }
  async function named(name) { return (await list(`name = '${escapeQuery(name)}'`))[0]; }
  async function nativeTransfer(task) {
    check(true);
    const abort = () => { task.cancelAsync().catch(() => {}); }; cancel.add(abort);
    const timer = setTimeout(abort, 90000);
    try { const result = await task.start(); check(true); if (!result) throw fault('RETRY', 'Prenos bol prerušený. Skús ho zopakovať.'); return result; }
    finally { clearTimeout(timer); cancel.delete(abort); }
  }
  async function uploadPhoto(photo) {
    check(true);
    const uri = photoUri(photo);
    const info = await FileSystem.getInfoAsync(uri, { md5: true }); check();
    if (!info.exists || !info.size || info.size > MAX_PHOTO_BYTES || !info.md5)
      throw fault('MISSING_PHOTO', 'Niektorá fotografia chýba v telefóne alebo je príliš veľká. Obnov ju zo zálohy.');
    const name = `tl-${owner}-${info.md5}.jpg`;
    let remote = await named(name);
    if (remote && (Number(remote.size) !== info.size || remote.md5Checksum !== info.md5))
      throw fault('INVALID_BACKUP', 'Kontrola existujúcej fotografie na Disku zlyhala.');
    if (!remote) {
      const { response } = await request(`${UPLOAD}?uploadType=resumable&fields=id,size,md5Checksum`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Upload-Content-Type': 'image/jpeg', 'X-Upload-Content-Length': String(info.size) },
        body: JSON.stringify({ name, parents: ['appDataFolder'], appProperties: { owner, kind: 'photo' } }),
      });
      const location = response.headers.get('location');
      if (!/^https:\/\/www\.googleapis\.com\//.test(location || '')) throw fault('DRIVE_ERROR', 'Google Disk nevrátil platnú adresu prenosu.');
      const task = FileSystem.createUploadTask(location, uri, { httpMethod: 'PUT', uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'image/jpeg' }, sessionType: FileSystem.FileSystemSessionType.FOREGROUND });
      const result = await nativeTransfer({ start: () => task.uploadAsync(), cancelAsync: () => task.cancelAsync() });
      if (result.status < 200 || result.status >= 300) await statusError(result.status, result.body);
      remote = JSON.parse(result.body);
      if (Number(remote.size) !== info.size || remote.md5Checksum !== info.md5) throw fault('INVALID_BACKUP', 'Kontrola nahratej fotografie zlyhala.');
    }
    return { id: photo.id, fileName: photo.fileName, width: photo.width, height: photo.height,
      bytes: info.size, md5: info.md5, driveId: remote.id };
  }
  async function saveManifest(tripId, photos, deviceId) {
    const content = { version: 1, owner, tripId, photos };
    validatePhotoManifest(content, owner);
    const name = albumName(owner, tripId, deviceId);
    const existing = await named(name);
    if (existing) {
      await request(`${UPLOAD}/${existing.id}?uploadType=media`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(content),
      });
    } else {
      const boundary = `tl_${deviceId}`;
      const metadata = { name, parents: ['appDataFolder'], mimeType: 'application/json', appProperties: { owner, kind: 'album' } };
      const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(content)}\r\n--${boundary}--`;
      await request(`${UPLOAD}?uploadType=multipart`, { method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body });
    }
  }
  async function backup({ readTrips, report }) {
    check(true); await authorize(); check(true);
    const key = `travellog/drive/journal/${uid}/${binding.permissionId}`;
    const raw = await AsyncStorage.getItem(key); check();
    const journal = raw ? JSON.parse(raw) : { deviceId: Native.sha256(`${Date.now()}-${Math.random()}`).slice(0, 24), albums: {} };
    if (!journal.deviceId || !journal.albums) throw fault('LOCAL_STATE', 'Stav zálohy sa nepodarilo načítať.');
    // Save identity before uploading. A restart reuses the same per-device album.
    await AsyncStorage.setItem(key, JSON.stringify(journal)); check();
    const trips = await readTrips(); check();
    // A user may clear hidden app data in Drive. Do not trust only the local journal.
    const remoteAlbums = new Set((await list(albumQuery(owner))).map(file => file.name));
    let count = 0;
    for (const trip of trips) {
      const photos = metadataPhotos(trip.photos);
      const fingerprint = galleryFingerprint(trip.photos);
      if (!photos.length && !journal.albums[trip.id]) continue;
      if (journal.albums[trip.id] === fingerprint && remoteAlbums.has(albumName(owner, trip.id, journal.deviceId))) { count += photos.length; continue; }
      const uploaded = [];
      for (const photo of photos) {
        check(true); uploaded.push(await uploadPhoto(photo)); count++;
        report({ status: 'uploading', message: `Overené fotografie: ${count}` });
      }
      // Publish only a complete album. Interrupted uploads are found by checksum
      // on retry; the previous album remains restorable until this succeeds.
      await saveManifest(trip.id, uploaded, journal.deviceId); check();
      journal.albums[trip.id] = fingerprint;
      await AsyncStorage.setItem(key, JSON.stringify(journal)); check();
    }
    const current = await readTrips(); check();
    const pending = current.some(t => (metadataPhotos(t.photos).length || journal.albums[t.id]) && journal.albums[t.id] !== galleryFingerprint(t.photos));
    const unsupported = current.some(t => photoList(t.photos).some(p => typeof p === 'string'));
    const lastSaved = new Date().toISOString();
    report({ status: pending ? 'pending' : unsupported ? 'partial' : 'saved', lastSaved,
      message: pending ? 'Nové zmeny čakajú na ďalšie odoslanie.' : unsupported ? 'Uložené sú fotky pridané cez aplikáciu. Staré externé obrázky nie sú zahrnuté.' : count ? `Fotografie sú zálohované na Google Disku (${count}).` : 'V tomto telefóne nie sú fotografie na odoslanie. Na novom telefóne použi Obnoviť fotografie.' });
    return lastSaved;
  }
  async function restore({ readTrips, attachPhotos, report }) {
    check(true); await authorize();
    const files = await list(albumQuery(owner));
    files.sort((a, b) => String(b.modifiedTime).localeCompare(String(a.modifiedTime)));
    const seen = new Set(); let restored = 0, skipped = 0;
    for (const file of files) {
      check(true);
      if (Number(file.size) > 50000) throw fault('INVALID_BACKUP', 'Záloha fotografií je príliš veľká.');
      const { data } = await request(`${API}/files/${file.id}?alt=media`);
      const album = validatePhotoManifest(data, owner);
      if (seen.has(album.tripId)) continue;
      seen.add(album.tripId);
      const trip = (await readTrips()).find(t => t.id === album.tripId); check();
      // Text visits must first arrive through Firebase. Never resurrect deleted visits.
      if (!trip) { skipped++; continue; }
      const expected = galleryFingerprint(trip.photos);
      if (photoList(trip.photos).length) { skipped++; continue; }
      const photos = [];
      for (const photo of album.photos) {
        // Check server metadata before downloading and the checksum afterwards.
        const { data: meta } = await request(`${API}/files/${photo.driveId}?fields=${encodeURIComponent(fileFields)}`);
        if (meta.appProperties?.owner !== owner || meta.appProperties?.kind !== 'photo'
            || Number(meta.size) !== photo.bytes || meta.md5Checksum !== photo.md5)
          throw fault('INVALID_BACKUP', 'Kontrola zálohovanej fotografie zlyhala.');
        const local = { id: photo.id, fileName: photo.fileName, storage: 'local', width: photo.width, height: photo.height, bytes: photo.bytes };
        const uri = photoUri(local);
        await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}visit-photos/`, { intermediates: true }); check();
        const existing = await FileSystem.getInfoAsync(uri, { md5: true }); check();
        if (existing.exists && (existing.md5 !== photo.md5 || existing.size !== photo.bytes))
          throw fault('LOCAL_CONFLICT', 'V telefóne už existuje iná fotografia s rovnakým názvom. Nič sa neprepísalo.');
        if (!existing.exists) {
          const temporary = `${FileSystem.cacheDirectory}drive-${photo.id}-${Date.now()}.jpg`;
          try {
            const task = FileSystem.createDownloadResumable(`${API}/files/${photo.driveId}?alt=media`, temporary,
              { headers: { Authorization: `Bearer ${token}` }, sessionType: FileSystem.FileSystemSessionType.FOREGROUND });
            const result = await nativeTransfer({ start: () => task.downloadAsync(), cancelAsync: () => task.cancelAsync() });
            if (result.status !== 200) await statusError(result.status);
            const info = await FileSystem.getInfoAsync(temporary, { md5: true }); check();
            if (!info.exists || info.size !== photo.bytes || info.md5 !== photo.md5) throw fault('INVALID_BACKUP', 'Stiahnutá fotografia neprešla kontrolou.');
            await FileSystem.moveAsync({ from: temporary, to: uri }); check();
          } finally { await FileSystem.deleteAsync(temporary, { idempotent: true }).catch(() => {}); }
        }
        photos.push(local);
      }
      check();
      // Compare-and-set inside the notebook write queue prevents lost gallery edits.
      const attached = await attachPhotos(album.tripId, photos, expected); check();
      if (attached) restored += photos.length; else skipped++;
      report({ status: 'restoring', message: `Obnovené fotografie: ${restored}` });
    }
    report({ status: 'restored', message: `Obnovené fotografie: ${restored}.${skipped ? ` Preskočené návštevy: ${skipped} (už majú fotky alebo nie sú v tomto účte).` : ''}` });
  }
  return { authorize, backup, restore, stop, check };
}
