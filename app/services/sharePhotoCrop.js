import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';

export async function prepareSharePhoto(uri, rect) {
  const context = ImageManipulator.manipulate(uri);
  let rendered;
  try {
    context.crop(rect);
    rendered = await context.renderAsync();
    const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.88 });
    return saved.uri;
  } finally {
    rendered?.release();
    context.release();
  }
}

export async function removeSharePhoto(uri) {
  if (uri?.startsWith(FileSystem.cacheDirectory || '___no_cache___')) {
    await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
  }
}
