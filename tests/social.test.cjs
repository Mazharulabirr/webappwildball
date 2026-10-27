const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const moduleObject = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/social.ts', 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText, { module: moduleObject, exports: moduleObject.exports, require });
const social = moduleObject.exports;

function database() {
  const db = { follows: [], profiles: [], posts: [], post_likes: [], queries: [], failCounts: false, failWrites: false };
  class Query {
    constructor(table) { this.table = table; this.filters = []; this.orders = []; this.action = 'read'; this.take = Infinity; this.start = 0; db.queries.push(this); }
    select(fields, options = {}) { this.fields = fields; this.options = options; return this; }
    eq(key, value) { this.filters.push([key, value]); return this; }
    in(key, values) { this.includes = [key, values]; return this; }
    order(key, options = {}) { this.orders.push([key, options.ascending !== false]); return this; }
    range(start, end) { this.start = start; this.take = end - start + 1; return this; }
    limit(value) { this.take = value; return this; }
    or(expression) { this.cursor = expression; return this; }
    upsert(row, options) { this.action = 'upsert'; this.row = row; this.writeOptions = options; return this; }
    delete() { this.action = 'delete'; return this; }
    then(resolve, reject) {
      try {
        if ((this.action !== 'read' && db.failWrites) || (this.options?.count && db.failCounts)) return Promise.resolve({ data: null, count: null, error: { message: 'Database unavailable' } }).then(resolve, reject);
        const matches = row => this.filters.every(([key, value]) => key === 'post.author_id' ? db.posts.some(post => post.id === row.post_id && post.author_id === value) : row[key] === value);
        if (this.action === 'upsert') {
          if (!db[this.table].some(row => row.follower_id === this.row.follower_id && row.following_id === this.row.following_id)) db[this.table].push({ ...this.row });
          return Promise.resolve({ error: null }).then(resolve, reject);
        }
        if (this.action === 'delete') { db[this.table] = db[this.table].filter(row => !matches(row)); return Promise.resolve({ error: null }).then(resolve, reject); }
        let rows = db[this.table].filter(matches);
        if (this.includes) rows = rows.filter(row => this.includes[1].includes(row[this.includes[0]]));
        if (this.cursor) {
          const match = this.cursor.match(/^created_at\.lt\.(.*),and\(created_at\.eq\.(.*),id\.lt\.(.*)\)$/);
          if (!match) throw new Error('Malformed pagination cursor');
          rows = rows.filter(row => row.created_at < match[1] || (row.created_at === match[2] && row.id < match[3]));
        }
        rows = [...rows].sort((a, b) => { for (const [key, ascending] of this.orders) { const value = String(a[key]).localeCompare(String(b[key])); if (value) return ascending ? value : -value; } return 0; });
        const count = rows.length;
        rows = rows.slice(this.start, this.start + this.take);
        if (this.table === 'follows' && this.fields?.includes('profile:')) rows = rows.map(row => ({ ...row, profile: db.profiles.find(profile => profile.id === row.following_id) || null }));
        return Promise.resolve({ data: rows, count, error: null }).then(resolve, reject);
      } catch (error) { return Promise.reject(error).then(resolve, reject); }
    }
  }
  return { db, client: { from: table => new Query(table) } };
}
function player(id) { return { id, username: `real_player_${id}`, display_name: id, location: null }; }
function post(id, author, date, status = 'published') { return { id, author_id: author, created_at: date, status, caption: id, video_path: '/clip.mp4', poster_path: null }; }

test('following a real account survives a fresh read and increments both profile counts', async () => {
  const { db, client } = database(); db.profiles.push(player('athlete'));
  await social.setPlayerFollow(client, 'viewer', 'athlete', true);
  assert.equal((await social.getFollowing(client, 'viewer'))[0].username, 'real_player_athlete');
  assert.equal((await social.getFollowCounts(client, 'viewer')).following, 1);
  assert.equal((await social.getFollowCounts(client, 'athlete')).followers, 1);
  await social.setPlayerFollow(client, 'viewer', 'athlete', true);
  assert.equal(db.follows.length, 1);
});
test('unfollow removes only the signed-in account relation and counts return to zero', async () => {
  const { db, client } = database(); db.follows.push({ follower_id: 'viewer', following_id: 'athlete' }, { follower_id: 'other', following_id: 'athlete' });
  await social.setPlayerFollow(client, 'viewer', 'athlete', false);
  assert.equal((await social.getFollowCounts(client, 'viewer')).following, 0);
  assert.equal((await social.getFollowCounts(client, 'athlete')).followers, 1);
});
test('self follow and failed saves never produce a successful saved relation', async () => {
  const { db, client } = database();
  await assert.rejects(social.setPlayerFollow(client, 'viewer', 'viewer', true), /own account/);
  db.failWrites = true;
  await assert.rejects(social.setPlayerFollow(client, 'viewer', 'athlete', true)); assert.equal(db.follows.length, 0);
});
test('follow list reads beyond a single database page without a demo-name restriction', async () => {
  const { db, client } = database();
  for (let i = 0; i < 501; i++) { db.profiles.push(player(`${i}`)); db.follows.push({ follower_id: 'viewer', following_id: `${i}` }); }
  assert.equal((await social.getFollowing(client, 'viewer')).length, 501);
  assert.equal(db.queries.length, 2);
});
test('Following feed contains published clips only from followed accounts', async () => {
  const { db, client } = database();
  db.posts.push(post('a', 'followed', '2026-10-26'), post('b', 'stranger', '2026-10-27'), post('c', 'followed', '2026-10-28', 'draft'));
  const result = await social.getFollowingPosts(client, ['followed']);
  assert.equal(result.posts.length, 1); assert.equal(result.posts[0].id, 'a'); assert.equal(result.hasMore, false);
});
test('Following pagination orders equal timestamps by id without duplicates or omissions', async () => {
  const { db, client } = database();
  db.posts.push(...['a', 'b', 'c', 'd', 'e'].map(id => post(id, 'followed', '2026-10-26T12:00:00Z')));
  const first = await social.getFollowingPosts(client, ['followed'], null, 2);
  const second = await social.getFollowingPosts(client, ['followed'], first.posts.at(-1), 2);
  const third = await social.getFollowingPosts(client, ['followed'], second.posts.at(-1), 2);
  assert.equal([...first.posts, ...second.posts, ...third.posts].map(post => post.id).join(','), 'e,d,c,b,a');
  assert.equal(first.hasMore, true); assert.equal(third.hasMore, false);
});
test('large follow lists merge author batches into one globally ordered page', async () => {
  const { db, client } = database(); const ids = Array.from({ length: 205 }, (_, i) => `player-${i}`);
  db.posts.push(...ids.map((id, i) => post(String(i).padStart(3, '0'), id, '2026-10-26T12:00:00Z')));
  const result = await social.getFollowingPosts(client, ids, null, 5);
  assert.equal(result.posts.map(post => post.id).join(','), '204,203,202,201,200'); assert.equal(result.hasMore, true); assert.equal(db.queries.length, 3);
});
test('empty Following feed makes no post request and never substitutes demo clips', async () => {
  const { db, client } = database();
  assert.equal((await social.getFollowingPosts(client, [])).posts.length, 0); assert.equal(db.queries.length, 0);
});
test('profile stats use real likes and expose count failures instead of false zeros', async () => {
  const { db, client } = database(); db.posts.push(post('a', 'athlete', '2026-10-26')); db.post_likes.push({ post_id: 'a' }, { post_id: 'other' });
  assert.equal((await social.getProfileStats(client, 'athlete')).likes, 1);
  db.failCounts = true; await assert.rejects(social.getProfileStats(client, 'athlete'));
});
