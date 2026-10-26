const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = ts.transpileModule(fs.readFileSync('app/profile-video-gallery.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 }
}).outputText;
const posts = [0, 1, 2].map(n => ({ id: `post-${n}`, video_path: `/clip-${n}.mp4`, poster_path: n ? `/poster-${n}.jpg` : null, caption: `Highlight ${n}`, created_at: '2026-10-26T00:00:00Z' }));

function setup() {
  const contexts = new Map(), listeners = new Map();
  let context;
  const video = { muted: false, plays: 0, pauses: 0, play() { this.plays++; return Promise.resolve(); }, pause() { this.pauses++; } };
  const dialog = { shows: 0, closes: 0, showModal() { this.shows++; }, close() { this.closes++; } };
  const focused = { restored: false, focus() { this.restored = true; } };
  const document = { body: { style: { overflow: 'auto' } }, hidden: false, activeElement: focused, addEventListener(name, fn) { listeners.set(name, fn); }, removeEventListener(name) { listeners.delete(name); } };
  const jsx = (type, props) => { if (props?.ref) props.ref.current = type === 'dialog' ? dialog : type === 'video' ? video : null; return { type, props: props || {} }; };
  const module = { exports: {} };
  vm.runInNewContext(source, { module, exports: module.exports, document, require: name => {
    if (name.endsWith('.css')) return {};
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'fragment' };
    if (name === 'react-dom') return { createPortal: tree => tree };
    if (name === 'react') return {
      useState(initial) { const c = context, i = c.cursor++; if (!(i in c.state)) c.state[i] = initial; return [c.state[i], value => { c.state[i] = typeof value === 'function' ? value(c.state[i]) : value; }]; },
      useRef(initial) { const c = context, i = c.cursor++; return c.state[i] ||= { current: initial }; },
      useEffect(fn) { context.effects.push(fn); }
    };
    throw new Error(name);
  } });
  const render = (component, props) => { context = contexts.get(component) || { state: [], cursor: 0, effects: [] }; contexts.set(component, context); context.cursor = 0; context.effects = []; const tree = component(props); return { tree, effects: context.effects }; };
  return { Gallery: module.exports.default, render, video, dialog, document, focused, listeners };
}
function find(tree, predicate) {
  if (!tree || typeof tree !== 'object') return null;
  if (predicate(tree)) return tree;
  for (const child of [tree.props?.children].flat(Infinity)) { const match = find(child, predicate); if (match) return match; }
  return null;
}
const button = (tree, label) => find(tree, n => n.type === 'button' && n.props['aria-label'] === label);
function openViewer(h, index = 0) {
  const props = { posts, username: 'hooper', variant: 'own' };
  let result = h.render(h.Gallery, props);
  button(result.tree, `Open video ${index + 1}: Highlight ${index}`).props.onClick();
  result = h.render(h.Gallery, props);
  const viewer = find(result.tree, n => typeof n.type === 'function');
  return h.render(viewer.type, viewer.props);
}
test('profile thumbnails open the selected clip instead of playing inline', () => {
  const h = setup();
  const { tree } = h.render(h.Gallery, { posts, username: 'hooper' });
  const preview = find(tree, n => n.type === 'video');
  assert.equal(preview.props.controls, undefined); assert.equal(preview.props.autoPlay, undefined);
  const props = { posts, username: 'hooper' };
  button(tree, 'Open video 2: Highlight 1').props.onClick();
  const viewer = find(h.render(h.Gallery, props).tree, n => typeof n.type === 'function');
  assert.equal(viewer.props.index, 1);
});
test('viewer opens a modal, plays only its selected video, and restores focus and scrolling', () => {
  const h = setup(), { tree, effects } = openViewer(h, 1);
  assert.equal(find(tree, n => n.type === 'video').props.src, '/clip-1.mp4');
  const cleanups = effects.map(effect => effect());
  assert.equal(h.dialog.shows, 1); assert.equal(h.document.body.style.overflow, 'hidden'); assert.equal(h.video.plays, 1);
  h.document.hidden = true; h.listeners.get('visibilitychange')(); assert.equal(h.video.pauses, 1);
  cleanups.forEach(cleanup => cleanup?.());
  assert.equal(h.document.body.style.overflow, 'auto'); assert.equal(h.focused.restored, true); assert.equal(h.dialog.closes, 1); assert.equal(h.listeners.size, 0);
});
test('navigation respects profile ordering and stops at the first and last clips', () => {
  const h = setup(), { tree } = openViewer(h, 0);
  assert.equal(button(tree, 'Previous video').props.disabled, true);
  button(tree, 'Next video').props.onClick();
  const props = { posts, username: 'hooper', variant: 'own' };
  let viewer = find(h.render(h.Gallery, props).tree, n => typeof n.type === 'function');
  assert.equal(viewer.props.index, 1);
  const nextTree = h.render(viewer.type, viewer.props).tree;
  nextTree.props.onKeyDown({ key: 'ArrowDown', target: { matches: () => false }, preventDefault() {} });
  viewer = find(h.render(h.Gallery, props).tree, n => typeof n.type === 'function');
  assert.equal(viewer.props.index, 2);
  assert.equal(button(h.render(viewer.type, viewer.props).tree, 'Next video').props.disabled, true);
});
test('Escape closes the viewer and leaves the gallery on the profile', () => {
  const h = setup(), { tree } = openViewer(h, 1);
  tree.props.onCancel({ preventDefault() {} });
  assert.equal(find(h.render(h.Gallery, { posts, username: 'hooper' }).tree, n => typeof n.type === 'function'), null);
});
test('vertical swipe moves forward while seek-bar gestures do not navigate', () => {
  const h = setup(), { tree } = openViewer(h, 0);
  const stage = find(tree, n => n.props.className === 'profile-video-stage');
  stage.props.onTouchStart({ touches: [{ clientX: 50, clientY: 300 }], currentTarget: { getBoundingClientRect: () => ({ bottom: 600 }) } });
  stage.props.onTouchEnd({ changedTouches: [{ clientX: 55, clientY: 100 }] });
  const props = { posts, username: 'hooper' };
  let viewer = find(h.render(h.Gallery, props).tree, n => typeof n.type === 'function'); assert.equal(viewer.props.index, 1);
  const nextStage = find(h.render(viewer.type, viewer.props).tree, n => n.props.className === 'profile-video-stage');
  nextStage.props.onTouchStart({ touches: [{ clientX: 50, clientY: 580 }], currentTarget: { getBoundingClientRect: () => ({ bottom: 600 }) } });
  nextStage.props.onTouchEnd({ changedTouches: [{ clientX: 55, clientY: 100 }] });
  viewer = find(h.render(h.Gallery, props).tree, n => typeof n.type === 'function'); assert.equal(viewer.props.index, 1);
});
