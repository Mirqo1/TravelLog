import * as FileSystem from 'expo-file-system/legacy';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as Sharing from 'expo-sharing';
import { managedName, MAX_PHOTO_BYTES, photoList, resizeWithin } from '../utils/visitPhotos';

const directory = () => {
  if (!FileSystem.documentDirectory) throw new Error('Úložisko fotografií nie je dostupné.');
  return `${FileSystem.documentDirectory}visit-photos/`;
};
export function photoUri(photo, thumbnail = false) {
  if (typeof photo === 'string') return photo;
  const name = thumbnail && managedName(photo?.thumbFileName) ? photo.thumbFileName : photo?.fileName;
  return managedName(name) ? directory() + name : null;
}
async function renderJpeg(uri, size, compress) {
  const context = ImageManipulator.manipulate(uri);
  let rendered;
  try {
    context.resize(size);
    rendered = await context.renderAsync();
    return await rendered.saveAsync({ format: SaveFormat.JPEG, compress });
  } finally { rendered?.release(); context.release(); }
}
export async function importVisitPhoto(asset) {
  if (!asset?.uri || (asset.type && asset.type !== 'image')) throw new Error('Vyber fotografiu. Videá zatiaľ nepodporujeme.');
  const id = `photo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  const photo = { id, fileName: `${id}.jpg`, thumbFileName: `${id}-thumb.jpg`, storage: 'local' };
  const temporary = [];
  try {
    await FileSystem.makeDirectoryAsync(directory(), { intermediates: true });
    const size = resizeWithin(asset.width, asset.height, 2000);
    let full = await renderJpeg(asset.uri, size, 0.78); temporary.push(full.uri);
    let info = await FileSystem.getInfoAsync(full.uri);
    if (info.size > MAX_PHOTO_BYTES) {
      full = await renderJpeg(full.uri, resizeWithin(full.width, full.height, 1600), 0.62); temporary.push(full.uri);
      info = await FileSystem.getInfoAsync(full.uri);
    }
    if (!info.exists || !info.size || info.size > MAX_PHOTO_BYTES) throw new Error('Fotografia je príliš veľká. Vyber menší obrázok.');
    const thumb = await renderJpeg(full.uri, resizeWithin(full.width, full.height, 720), 0.7); temporary.push(thumb.uri);
    await FileSystem.copyAsync({ from: full.uri, to: photoUri(photo) });
    await FileSystem.copyAsync({ from: thumb.uri, to: photoUri(photo, true) });
    return { ...photo, width: full.width, height: full.height, bytes: info.size };
  } catch (error) { await deleteManagedPhoto(photo); throw error; }
  finally { await Promise.all(temporary.map(uri => FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {}))); }
}
export async function deleteManagedPhoto(photo) {
  if (typeof photo !== 'object' || !photo) return;
  await Promise.all([photo.fileName, photo.thumbFileName].filter(managedName)
    .map(name => FileSystem.deleteAsync(directory() + name, { idempotent: true }).catch(() => {})));
}
// Only newly imported files belong to an editor draft. Never delete an existing
// visit's file here: guest import and conflict recovery may share those files.
export async function discardUnusedDrafts(created, readVisits) {
  try {
    const visits = await readVisits();
    const retained = new Set(visits.flatMap(trip => photoList(trip.photos).map(photo => photo?.fileName)));
    await Promise.all(created.filter(photo => !retained.has(photo.fileName)).map(deleteManagedPhoto));
  } catch { /* On storage failure keep the file rather than risk deleting a saved photo. */ }
}
export async function exportVisitPhoto(photo) {
  let uri = photoUri(photo);
  if (!uri || !/^(file:|content:)/.test(uri)) throw new Error('Táto fotografia nie je dostupná v telefóne.');
  if (!await Sharing.isAvailableAsync()) throw new Error('Zdieľanie súborov nie je na tomto zariadení dostupné.');
  await Sharing.shareAsync(uri, { mimeType: 'image/jpeg', dialogTitle: 'Uložiť alebo zdieľať fotografiu', UTI: 'public.jpeg' });
}
