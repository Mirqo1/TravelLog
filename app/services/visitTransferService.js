import { requireOptionalNativeModule } from 'expo-modules-core';
import * as Sharing from 'expo-sharing';
import { photoUri, importVisitPhoto, deleteManagedPhoto } from './visitPhotoService';
import { getTrips, importSharedVisit } from './tripsService';
import { TRANSFER_FORMAT, transferVisit, validateVisitTransfer, receivedVisitDraft } from '../utils/visitTransfer';

const Native = requireOptionalNativeModule('TravelLogDrive');
export const visitTransferAvailable = !!Native?.createVisitPackage && !!Native?.pickVisitPackage;
const unavailable = () => new Error('Pre zdieľanie celej návštevy nainštaluj nový Android build.');
export async function sendVisitTransfer({ trip, notebookId, author, kind, options, photos, isCurrent }) {
  if (!visitTransferAvailable) throw unavailable();
  if (!isCurrent()) throw new Error('Účet sa zmenil. Skús to znova.');
  const manifest = validateVisitTransfer({ format: TRANSFER_FORMAT, version: 1, kind,
    sourceId: Native.sha256(JSON.stringify([notebookId, trip.id])), author: author.slice(0, 50),
    visit: transferVisit(trip, options), photos: [] });
  if (!await Sharing.isAvailableAsync()) throw new Error('Zdieľanie súborov nie je na tomto zariadení dostupné.');
  if (!Array.isArray(photos) || photos.length > 10) throw new Error('Vyber najviac 10 fotografií.');
  const urls = photos.map(photo => photoUri(photo));
  if (urls.some(uri => !uri?.startsWith('file:'))) throw new Error('Zdieľať môžeš iba fotografie uložené v aplikácii.');
  let uri;
  try { uri = await Native.createVisitPackage(JSON.stringify(manifest), urls); }
  catch { throw new Error('Súbor návštevy sa nepodarilo pripraviť. Skontroluj, či sú fotografie dostupné v telefóne.'); }
  if (!isCurrent()) { await Native.discardVisitPackage(uri).catch(() => {}); throw new Error('Účet sa zmenil. Skús to znova.'); }
  try { await Sharing.shareAsync(uri, { mimeType: 'application/zip', UTI: 'public.zip-archive', dialogTitle: 'Zdieľať celú návštevu' }); }
  catch (error) { await Native.discardVisitPackage(uri).catch(() => {}); throw error; }
  // Successful handoff is not proof of delivery/acceptance. Keep the temporary
  // archive for receivers reading asynchronously; native cache expires after 24h.
}
export async function openVisitTransfer() {
  if (!visitTransferAvailable) throw unavailable();
  let result;
  try { result = await Native.pickVisitPackage(); }
  catch (error) {
    if (error.code === 'INVALID_PACKAGE') throw new Error('Súbor návštevy je neplatný, poškodený alebo príliš veľký.');
    throw error;
  }
  if (!result) return null;
  try {
    const manifest = validateVisitTransfer(JSON.parse(result.manifest));
    if (!Array.isArray(result.photos) || result.photos.length !== manifest.photos.length) throw new Error('Fotografie v súbore nesúhlasia s návštevou.');
    const photos = manifest.photos.map((photo, i) => {
      const file = result.photos[i];
      if (file.entry !== photo.entry || file.sha256 !== photo.sha256 || file.bytes !== photo.bytes
          || file.width !== photo.width || file.height !== photo.height || !file.uri?.startsWith('file:'))
        throw new Error('Fotografie v súbore nesúhlasia s návštevou.');
      return { ...photo, uri: file.uri, ...(file.thumbUri?.startsWith('file:') ? { thumbUri: file.thumbUri } : {}) };
    });
    return { ...manifest, photos, temporaryDirectory: result.directory };
  } catch (error) { await discardVisitTransfer(result); throw error; }
}
export async function discardVisitTransfer(data) {
  const uri = data?.temporaryDirectory || data?.directory;
  if (uri && Native?.discardVisitPackage) await Native.discardVisitPackage(uri).catch(() => {});
}
export async function acceptVisitTransfer({ data, notebookId, date, visitTime, includePhotos, confirmed, isCurrent }) {
  validateVisitTransfer(data);
  if (confirmed !== true) throw new Error('Najprv potvrď prijatie návštevy.');
  const created = [];
  try {
    if (!isCurrent()) throw new Error('Účet sa zmenil. Skús to znova.');
    const draft = receivedVisitDraft(data.visit, date, visitTime);
    const existing = (await getTrips(notebookId)).find(trip => trip.sharedSourceId === data.sourceId);
    if (!isCurrent()) throw new Error('Účet sa zmenil. Skús to znova.');
    if (existing) return { trip: existing, already: true };
    if (includePhotos) for (const photo of data.photos) {
      if (!isCurrent()) throw new Error('Účet sa zmenil. Skús to znova.');
      created.push(await importVisitPhoto({ uri: photo.uri, width: photo.width, height: photo.height, type: 'image' }));
    }
    const result = await importSharedVisit(notebookId, data.sourceId, { ...draft, photos: created }, isCurrent);
    if (result.already) await Promise.all(created.map(deleteManagedPhoto));
    return result;
  } catch (error) {
    // A storage call can fail after committing. Never remove photos referenced
    // by a durable record, or assume that a read failure means no record exists.
    try {
      const visits = await getTrips(notebookId);
      const retained = new Set(visits.flatMap(v => (v.photos || []).map(p => p?.fileName)));
      await Promise.all(created.filter(p => !retained.has(p.fileName)).map(deleteManagedPhoto));
    } catch { /* Keep files if their ownership cannot be safely checked. */ }
    throw error;
  }
}
