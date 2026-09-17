import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const memory = new Map();
globalThis.profileNameStorage = {
  async getItem(key) { return memory.get(key) ?? null; },
  async setItem(key, value) { memory.set(key, value); },
  async removeItem(key) { memory.delete(key); },
};
const source = (await readFile(new URL('../app/services/mockAuthService.js', import.meta.url), 'utf8'))
  .replace("import AsyncStorage from '@react-native-async-storage/async-storage';", 'const AsyncStorage = globalThis.profileNameStorage;');
const auth = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const registered = await auth.registerWithEmail('miroslav.ulicny@gmail.com', 'password', 'Miroslav Uličný');
assert.equal(registered.user.displayName, 'Miroslav Uličný');
await auth.updateDisplayName('Miro');
assert.equal(auth.auth.currentUser.displayName, 'Miro');
assert.equal(JSON.parse(memory.get('travellog/mock-auth-user')).displayName, 'Miro');
await assert.rejects(auth.updateDisplayName('M'));
console.log('PASS: registration and profile edit preserve a user-chosen display name.');
