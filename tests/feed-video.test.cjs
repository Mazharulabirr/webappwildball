const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = ts.transpileModule(readFileSync('app/feed-video.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function setup(saveData = false) {
  const observers = [], effects = [], listeners = new Set();
  const video = { attrs: {}, paused: true, loads: 0, plays: 0,
    hasAttribute(key) { return key in this.attrs; },
    set src(value) { this.attrs.src = value; },
    removeAttribute(key) { delete this.attrs[key]; },
    load() { this.loads++; },
    play() { this.paused = false; this.plays++; return Promise.resolve(); },
    pause() { this.paused = true; },
  };
  class Observer {
    constructor(callback, options) { this.callback = callback; this.options = options; observers.push(this); }
    observe() {} disconnect() { this.disconnected = true; }
    trigger(value) { this.callback([{ isIntersecting: value }]); }
  }
  const document = { hidden: false,
    addEventListener(_, callback) { listeners.add(callback); },
    removeEventListener(_, callback) { listeners.delete(callback); },
  };
  const module = { exports: {} };
  vm.runInNewContext(source, { exports: module.exports, module,
    require: name => name === 'react' ? { memo: x => x, useRef: () => ({ current: video }), useEffect: effect => effects.push(effect) } : { jsx: () => null },
    navigator: { connection: { saveData } }, document, window: { IntersectionObserver: Observer }, IntersectionObserver: Observer,
  });
  module.exports.default({ src: '/clip.mp4' });
  const cleanup = effects[0]();
  return { video, observers, document, listeners, cleanup };
}

test('distant clips make no media request; nearby clips buffer and unload when far away', () => {
  const { video, observers, cleanup } = setup();
  assert.equal(video.attrs.src, undefined);
  observers[0].trigger(true);
  assert.equal(video.attrs.src, '/clip.mp4');
  assert.equal(video.preload, 'auto');
  assert.equal(video.plays, 0);
  observers[1].trigger(true);
  assert.equal(video.paused, false);
  observers[0].trigger(false);
  assert.equal(video.paused, true);
  assert.equal(video.attrs.src, undefined);
  cleanup();
});

test('background tabs pause playback and observers/listeners clean up on unmount', () => {
  const { video, observers, document, listeners, cleanup } = setup();
  observers[1].trigger(true);
  document.hidden = true;
  listeners.forEach(callback => callback());
  assert.equal(video.paused, true);
  document.hidden = false;
  listeners.forEach(callback => callback());
  assert.equal(video.paused, false);
  cleanup();
  assert.equal(listeners.size, 0);
  assert.ok(observers.every(observer => observer.disconnected));
});

test('data saver disables lookahead buffering', () => {
  const { video, observers, cleanup } = setup(true);
  assert.equal(observers[0].options.rootMargin, '0px');
  observers[0].trigger(true);
  assert.equal(video.preload, 'metadata');
  cleanup();
});
