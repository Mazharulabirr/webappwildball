const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = ts.transpileModule(readFileSync('lib/inbox.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const mod = { exports: {} };
vm.runInNewContext(source, { module: mod, exports: mod.exports });
const { friendIds, requestIds, threadMessages } = mod.exports;
const message = (id, sender_id, recipient_id) => ({ id, sender_id, recipient_id, body: 'Hello', created_at: '2026-10-27T12:00:00Z' });

test('only mutual follows count as friends, even without messages', () => {
  assert.deepEqual([...friendIds(['alice', 'bob'], ['bob', 'charlie'])], ['bob']);
  assert.equal(friendIds(['alice'], []).size, 0);
  assert.equal(friendIds([], ['alice']).size, 0);
});

test('incoming messages from non-followers are visible as requests', () => {
  assert.deepEqual([...requestIds([message('1', 'stranger', 'me')], 'me', friendIds([], []))], ['stranger']);
});

test('one-way following still routes messages to requests for both participants', () => {
  const messages = [message('1', 'alice', 'bob')];
  assert.deepEqual([...requestIds(messages, 'alice', friendIds(['bob'], []))], ['bob']);
  assert.deepEqual([...requestIds(messages, 'bob', friendIds([], ['alice']))], ['alice']);
});

test('mutual follow moves existing requests into Friends without changing history', () => {
  const messages = [message('1', 'alice', 'me'), message('2', 'me', 'alice')];
  assert.equal(requestIds(messages, 'me', friendIds(['alice'], [])).size, 1);
  const friends = friendIds(['alice'], ['alice']);
  assert.equal(requestIds(messages, 'me', friends).size, 0);
  assert.equal(threadMessages(messages, 'me', 'alice').length, 2);
});

test('unfollowing returns a conversation to requests and preserves history', () => {
  const messages = [message('1', 'alice', 'me')];
  assert.equal(requestIds(messages, 'me', friendIds(['alice'], ['alice'])).size, 0);
  assert.deepEqual([...requestIds(messages, 'me', friendIds([], ['alice']))], ['alice']);
  assert.equal(threadMessages(messages, 'me', 'alice')[0].id, '1');
});

test('threads exclude third-party conversations and requests exclude self and duplicates', () => {
  const messages = [message('1', 'alice', 'me'), message('2', 'me', 'alice'), message('3', 'alice', 'bob'), message('4', 'me', 'me')];
  assert.deepEqual(Array.from(threadMessages(messages, 'me', 'alice'), row => row.id), ['1', '2']);
  assert.deepEqual([...requestIds(messages, 'me', new Set())], ['alice']);
});
