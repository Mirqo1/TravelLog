export function coverGeometry(sourceWidth, sourceHeight, frameWidth, frameHeight) {
  if (![sourceWidth, sourceHeight, frameWidth, frameHeight].every(value => Number.isFinite(value) && value > 0)) return null;
  const scale = Math.max(frameWidth / sourceWidth, frameHeight / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  return { width, height, limitX: Math.max(0, (width - frameWidth) / 2), limitY: Math.max(0, (height - frameHeight) / 2) };
}

export function clampCrop(offset, geometry) {
  if (!geometry) return { x: 0, y: 0 };
  return {
    x: Math.max(-geometry.limitX, Math.min(geometry.limitX, offset.x)),
    y: Math.max(-geometry.limitY, Math.min(geometry.limitY, offset.y)),
  };
}

export function cropRect(sourceWidth, sourceHeight, frameWidth, frameHeight, offset) {
  const geometry = coverGeometry(sourceWidth, sourceHeight, frameWidth, frameHeight);
  if (!geometry) return null;
  const scale = geometry.width / sourceWidth;
  const width = Math.min(sourceWidth, Math.max(1, Math.round(frameWidth / scale)));
  const height = Math.min(sourceHeight, Math.max(1, Math.round(frameHeight / scale)));
  const safe = clampCrop(offset, geometry);
  return {
    originX: Math.max(0, Math.min(sourceWidth - width, Math.round((sourceWidth - width) / 2 - safe.x / scale))),
    originY: Math.max(0, Math.min(sourceHeight - height, Math.round((sourceHeight - height) / 2 - safe.y / scale))),
    width, height,
  };
}
