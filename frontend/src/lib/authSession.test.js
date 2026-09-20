import test from 'node:test';
import assert from 'node:assert/strict';
import { readSession, clearSession } from './authSession.js';

function storage(values) {
  const entries = new Map(Object.entries(values));
  return { getItem: key => entries.get(key) ?? null, removeItem: key => entries.delete(key) };
}

test('restores a complete cached session', () => {
  const user = { id: 7, role: 'USER', has_store: false };
  assert.deepEqual(readSession(storage({ token: 'session', user: JSON.stringify(user) })), { token: 'session', user });
});
test('malformed or invalid cached users do not crash startup', () => {
  for (const user of ['{bad json', 'null', '[]', '"name"', '{}']) {
    const cache = storage({ token: 'session', user });
    assert.deepEqual(readSession(cache), { token: null, user: null });
    assert.equal(cache.getItem('token'), null);
    assert.equal(cache.getItem('user'), null);
  }
});
test('a user without a token cannot open the dashboard', () => {
  assert.deepEqual(readSession(storage({ user: '{"id":7}' })), { token: null, user: null });
});
test('clearing a session preserves unrelated preferences', () => {
  const cache = storage({ token: 'session', user: '{"id":7}', theme: 'dark' });
  clearSession(cache);
  assert.equal(cache.getItem('token'), null);
  assert.equal(cache.getItem('user'), null);
  assert.equal(cache.getItem('theme'), 'dark');
});
