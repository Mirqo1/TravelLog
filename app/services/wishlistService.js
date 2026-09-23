import AsyncStorage from '@react-native-async-storage/async-storage';
import { mergeWishes, validateWish } from '../utils/wishlist';
const pending = new Map();
export function wishlistStore(id, incoming) {
  if (!id) return Promise.reject(new Error('Najprv otvor profil.'));
  const key = `travellog/wishlist/${id}`;
  const operation = (pending.get(key) || Promise.resolve()).catch(() => {}).then(async () => {
    const raw = await AsyncStorage.getItem(key);
    const current = raw ? mergeWishes(JSON.parse(raw)) : [];
    if (!incoming) return current;
    const result = typeof incoming === 'function' ? incoming(current) : mergeWishes(current, incoming);
    await AsyncStorage.setItem(key, JSON.stringify(result));
    return result;
  });
  pending.set(key, operation);
  operation.finally(() => { if (pending.get(key) === operation) pending.delete(key); }).catch(() => {});
  return operation;
}
export function saveWish(id, data, remove = false) {
  return wishlistStore(id, current => {
    const previous = current.find(item => item.id === data.id);
    const changedAt = Math.max(Date.now(), (previous?.changedAt || 0) + 1);
    return mergeWishes(current, [validateWish({ ...data, id: data.id || `wish-${Date.now()}-${Math.random().toString(36).slice(2)}`, changedAt, deleted: remove })]);
  });
}
