const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = ts.transpileModule(readFileSync('lib/theme.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;

function setup(saved, search = '', blocked = false) {
  const storage = new Map(saved ? [['wildball-theme', saved]] : []);
  const module = { exports: {} };
  vm.runInNewContext(source, { module, exports: module.exports, URLSearchParams,
    window: { location: { search }, localStorage: {
      getItem(key) { if (blocked) throw Error('blocked'); return storage.get(key); },
      setItem(key, value) { if (blocked) throw Error('blocked'); storage.set(key, value); },
    } },
  });
  return { read: module.exports.readTheme, storage };
}

test('dark is the default and explicit saved choices are preserved', () => {
  assert.equal(setup().read(), 'dark');
  assert.equal(setup('dark').read(), 'dark');
  assert.equal(setup('light').read(), 'light');
});
test('restore link replaces saved light mode and persists dark for later navigation', () => {
  const { read, storage } = setup('light', '?theme=dark');
  assert.equal(read(), 'dark');
  assert.equal(setup(storage.get('wildball-theme')).read(), 'dark');
});
test('invalid URL values preserve the saved choice and blocked storage still opens dark', () => {
  assert.equal(setup('light', '?theme=invalid').read(), 'light');
  assert.equal(setup(undefined, '', true).read(), 'dark');
  assert.equal(setup(undefined, '?theme=dark', true).read(), 'dark');
});
