import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const raw = await readFile(new URL('../app/context/AuthContext.js', import.meta.url), 'utf8');
const load = source => import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
async function session(saved, mode, initialAccount = null) {
  const memory = new Map();
  if (saved) memory.set('travellog/mock-auth-user', typeof saved === 'string' ? saved : JSON.stringify(saved));
  if (mode) memory.set('travellog/session-mode', mode);
  let index = 0, slots = [], effects = [], account = initialAccount, callback;
  const hooks = {
    createContext: () => ({}), useContext: () => {},
    useState(value) { const i = index++; if (!(i in slots)) slots[i] = value;
      return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; },
    useMemo: factory => factory(), useCallback: fn => fn,
    useEffect(fn, deps) { const i = index++; if (!slots[i] || deps.some((d,n) => d !== slots[i][n])) { slots[i] = deps; effects.push(fn); } },
  };
  globalThis.authBoundary = { ...hooks,
    storage: { async getItem(k) { return memory.get(k) ?? null; }, async setItem(k,v) { memory.set(k,v); } },
    cloudConfigured: true, getCloudAccount: () => account,
    watchCloudAccount: fn => { callback = fn; fn(account); return () => {}; },
    cloudLogin: async (email, password, registering, displayName) => {
      if (password !== 'correct') throw new Error('invalid credential');
      account = { uid: email === 'a@example.com' ? 'account-a' : 'account-b', email, displayName: displayName || 'Name' };
      callback(account); return { user: account };
    },
    cloudLogout: async () => { account = null; callback(null); },
    cloudResetPassword: async () => {},
    updateCloudDisplayName: async (name, uid) => { assert.equal(uid, account.uid); account = { ...account, displayName: name }; },
  };
  const src = raw
    .replace(/^import React,.*;$/m, 'const { createContext, useCallback, useContext, useEffect, useMemo, useState } = globalThis.authBoundary;')
    .replace(/^import AsyncStorage.*;$/m, 'const AsyncStorage = globalThis.authBoundary.storage;')
    .replace(/^import \{ cloudConfigured.*;$/m, 'const { cloudConfigured, getCloudAccount, cloudLogin, cloudLogout, cloudResetPassword, watchCloudAccount, updateCloudDisplayName } = globalThis.authBoundary;')
    .replace('<AuthContext.Provider value={value}>{children}</AuthContext.Provider>', 'value') + '\n// ' + Math.random();
  const { AuthProvider } = await load(src);
  const render = () => { index = 0; const value = AuthProvider({}); const pending = effects; effects = []; pending.forEach(fn => fn()); return value; };
  render(); await new Promise(resolve => setImmediate(resolve));
  return { render, memory };
}
const legacy = { uid: 'mock-tester', displayName: 'Old name', email: 'fake@example.com' };
let ctx = await session(legacy);
assert.equal(ctx.render().notebookId, 'mock-tester');
await assert.rejects(ctx.render().loginWithEmail('a@example.com', 'wrong'));
assert.equal(ctx.render().account, null);
await ctx.render().loginWithEmail('a@example.com', 'correct');
assert.equal(ctx.render().notebookId, 'cloud-account-a');
assert.equal(ctx.render().guest.uid, legacy.uid);
await ctx.render().updateDisplayName('Chosen name');
assert.equal(ctx.render().user.displayName, 'Chosen name');
await ctx.render().logout();
assert.equal(ctx.render().user, null);
assert.equal(ctx.memory.get('travellog/session-mode'), 'signedout');
assert.equal(JSON.parse(ctx.memory.get('travellog/mock-auth-user')).uid, legacy.uid);
await ctx.render().loginWithEmail('b@example.com', 'correct');
assert.equal(ctx.render().notebookId, 'cloud-account-b');
await ctx.render().logout(); await ctx.render().continueAsGuest();
assert.equal(ctx.render().notebookId, 'mock-tester');
ctx = await session(legacy, 'signedout'); assert.equal(ctx.render().user, null);
ctx = await session(legacy, 'guest', { uid: 'restored', email: 'restored@example.com' });
assert.equal(ctx.render().notebookId, 'cloud-restored');
ctx = await session('corrupt');
await assert.rejects(ctx.render().continueAsGuest());
assert.equal(ctx.memory.get('travellog/mock-auth-user'), 'corrupt');
console.log('PASS: actual AuthContext rejects fake login, isolates notebook IDs, preserves legacy profile, restores cloud session, signs out, edits name, guards corrupt local profile.');
