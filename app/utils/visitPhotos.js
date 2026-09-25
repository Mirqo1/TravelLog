export const MAX_VISIT_PHOTOS = 10;
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
export const managedName = name => typeof name === 'string' && /^photo-[a-z0-9-]+(?:-thumb)?\.jpg$/.test(name);
export const photoKey = photo => typeof photo === 'string' ? photo : photo?.id || photo?.fileName || '';
export const photoList = photos => Array.isArray(photos) ? photos.filter(photo =>
  typeof photo === 'string' ? /^(file:|content:|https?:)/.test(photo) :
    photo && managedName(photo.fileName) && typeof photo.id === 'string') : [];
export const selectCover = (photos, key) => {
  const index = photos.findIndex(photo => photoKey(photo) === key);
  return index < 0 ? photos : [photos[index], ...photos.filter((_, i) => i !== index)];
};
export function resizeWithin(width, height, maxEdge) {
  if (!(width > 0 && height > 0)) throw new Error('Fotografiu sa nepodarilo načítať.');
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export const photoAccess = (packageName, claims = {}) => ({
  preview: packageName === 'com.miroslavu19.travellog.preview',
  canAddPhotos: packageName === 'com.miroslavu19.travellog.preview' || claims.premium === true || claims.admin === true,
});
