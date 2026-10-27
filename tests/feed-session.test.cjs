const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const moduleUnderTest = { exports: {} };
vm.runInNewContext(ts.transpileModule(readFileSync('lib/feed-session.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: moduleUnderTest.exports, module: moduleUnderTest });
const { createFeedPivot, createFeedSession } = moduleUnderTest.exports;
const collection = Array.from({ length: 43 }, (_, index) => ({ id: String(index).padStart(3, '0'), created_at: String(index) }));
const recent = async () => [...collection].reverse().slice(0, 3);
const query = async ({ pivot, after, wrapped, limit }) => collection.filter(post =>
  (wrapped ? post.id < pivot : post.id >= pivot) && (!after || post.id > after)
).slice(0, limit);

test('feed seed works without crypto or secure-context browser APIs', () => {
  // The VM intentionally has no crypto global, matching an HTTP mobile preview.
  const pivot = createFeedPivot();
  assert.match(pivot, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.notEqual(createFeedPivot(() => .2), createFeedPivot(() => .8));
});

test('newest post leads; different reload seeds discover different videos', async () => {
  const a = await createFeedSession('010').next(recent, query);
  const b = await createFeedSession('030').next(recent, query);
  assert.equal(a.posts[0].id, '042');
  assert.equal(b.posts[0].id, '042');
  assert.notDeepEqual(Array.from(a.posts, p => p.id), Array.from(b.posts, p => p.id));
});

test('pagination wraps the collection exactly once without repeats or omissions', async () => {
  for (const pivot of ['000', '015', '040', '999']) {
    const session = createFeedSession(pivot), posts = [];
    let more = true, pages = 0;
    while (more && pages++ < 10) {
      const result = await session.next(recent, query);
      posts.push(...result.posts); more = result.hasMore;
    }
    assert.equal(more, false);
    assert.equal(posts.length, collection.length);
    assert.equal(new Set(posts.map(p => p.id)).size, collection.length);
  }
});

test('failed wrap query can retry without losing cursor positions', async () => {
  const session = createFeedSession('040');
  let fail = true;
  const flaky = options => {
    if (options.wrapped && fail) { fail = false; throw new Error('Offline'); }
    return query(options);
  };
  await assert.rejects(session.next(recent, flaky), /Offline/);
  const result = await session.next(recent, flaky);
  assert.equal(result.posts[0].id, '042');
  assert.ok(result.posts.some(post => post.id === '040'));
  assert.ok(result.posts.some(post => post.id === '000'));
});

test('empty collection terminates without an infinite load loop', async () => {
  const result = await createFeedSession('010').next(async () => [], async () => []);
  assert.equal(result.posts.length, 0);
  assert.equal(result.hasMore, false);
});
