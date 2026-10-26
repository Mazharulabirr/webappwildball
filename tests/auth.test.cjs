const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, dependencies = {}, globals = {}) {
  const module = { exports: {} };
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(output, { exports: module.exports, module, require: name => dependencies[name] || require(name), ...globals });
  return module.exports;
}
const { ensureProfile } = load('lib/auth/profile.ts');
const user = { id: '12345678-aaaa-bbbb-cccc-123456789012', email: 'player@example.com', user_metadata: { full_name: 'New Player' } };
function profileClient(existing, errors = []) {
  const writes = [];
  return { writes, from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: existing }) }) }), upsert: async (row, options) => { writes.push({ row, options }); return { error: errors.shift() || null }; } }) };
}
test('returning OAuth login never overwrites existing profile', async () => {
  const c = profileClient({ id: user.id }); await ensureProfile(c, user); assert.equal(c.writes.length, 0);
});
test('OAuth profile gets a valid deterministic username and id-conflict protection', async () => {
  const c = profileClient(null); await ensureProfile(c, user);
  assert.match(c.writes[0].row.username, /^[a-z0-9._]{3,30}$/);
  assert.equal(c.writes[0].row.display_name, 'New Player');
  assert.equal(c.writes[0].options.ignoreDuplicates, true);
});
test('username collision retries without losing the authenticated account', async () => {
  const c = profileClient(null, [{ code: '23505' }]);
  await ensureProfile(c, { ...user, user_metadata: { username: 'taken' } });
  assert.equal(c.writes[0].row.username, 'taken'); assert.notEqual(c.writes[1].row.username, 'taken');
});
test('profile permission failures surface instead of silently completing signup', async () => {
  const c = profileClient(null, [{ code: '42501' }]); await assert.rejects(ensureProfile(c, user), { code: '42501' });
});
function callback(client) {
  return load('app/auth/callback/route.ts', {
    'next/server': { NextResponse: { redirect: url => ({ location: url.href }) } },
    '../../../lib/supabase/server': { createClient: async () => client },
    '../../../lib/auth/profile': { ensureProfile: async () => {} }
  }, { URL, process: { env: { NEXT_PUBLIC_SITE_URL: 'https://wildball.io' } } }).GET;
}
test('callback rejects missing tokens and ignores external next redirects', async () => {
  const response = await callback({})({ url: 'http://localhost:3000/auth/callback?next=https://evil.example' });
  assert.equal(response.location, 'https://wildball.io/login?auth_error=expired');
});
test('provider cancellation returns to login without exposing provider error text', async () => {
  const response = await callback({})({ url: 'http://localhost/auth/callback?error=access_denied&error_description=private' });
  assert.equal(response.location, 'https://wildball.io/login?auth_error=cancelled');
});
test('OAuth code exchange finishes on public HTTPS origin', async () => {
  let exchanged;
  const client = { auth: { exchangeCodeForSession: async code => { exchanged = code; return { data: { user }, error: null }; } } };
  const response = await callback(client)({ url: 'http://localhost/auth/callback?code=valid-code&next=https://evil.example' });
  assert.equal(exchanged, 'valid-code'); assert.equal(response.location, 'https://wildball.io/');
});
test('email token-hash confirmation supports another device', async () => {
  let verified;
  const client = { auth: { verifyOtp: async params => { verified = params; return { data: { user }, error: null }; } } };
  const response = await callback(client)({ url: 'http://localhost/auth/callback?token_hash=hash&type=email' });
  assert.equal(verified.token_hash, 'hash'); assert.equal(verified.type, 'email'); assert.equal(response.location, 'https://wildball.io/');
});
test('invalid or expired confirmation never redirects as successful', async () => {
  const client = { auth: { exchangeCodeForSession: async () => ({ error: { message: 'expired' }, data: {} }) } };
  const response = await callback(client)({ url: 'http://localhost/auth/callback?code=expired' });
  assert.match(response.location, /auth_error=expired$/);
});
test('www callbacks keep their cookie host through the VPS reverse proxy', async () => {
  const client = { auth: { exchangeCodeForSession: async () => ({ data: { user }, error: null }) } };
  const response = await callback(client)({ url: 'http://localhost/auth/callback?code=valid', headers: { get: () => 'www.wildball.io' } });
  assert.equal(response.location, 'https://www.wildball.io/');
});
test('untrusted forwarded hosts cannot turn the callback into an open redirect', async () => {
  const response = await callback({})({ url: 'http://localhost/auth/callback', headers: { get: () => 'evil.example' } });
  assert.equal(response.location, 'https://wildball.io/login?auth_error=expired');
});
function providerRoute(settings, ok = true) {
  return load('app/api/auth/providers/route.ts', {
    'next/server': { NextResponse: { json: (body, options) => ({ body, options }) } }
  }, { process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://project.example', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'public-key' } }, AbortSignal, fetch: async () => ({ ok, json: async () => settings }) }).GET;
}
test('email signup stays disabled when server-side confirmation is disabled', async () => {
  const r = await providerRoute({ external: { email: true, google: false, facebook: false }, disable_signup: false, mailer_autoconfirm: true })();
  assert.equal(r.body.emailConfirmation, false); assert.equal(r.body.google, false);
});
test('ready providers are enabled without exposing upstream configuration', async () => {
  const r = await providerRoute({ external: { email: true, google: true, facebook: true }, disable_signup: false, mailer_autoconfirm: false, private_value: 'never-return' })();
  assert.equal(r.body.emailConfirmation, true); assert.equal(r.body.facebook, true);
  assert.deepEqual(Object.keys(r.body).sort(), ['emailConfirmation', 'facebook', 'google']);
});
test('settings failures return a recoverable service error', async () => {
  const r = await providerRoute({}, false)(); assert.equal(r.options.status, 503);
});
