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
