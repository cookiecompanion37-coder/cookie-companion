const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const cache = new Map();
function load(relative) {
  const file = path.resolve(root, relative);
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const localRequire = (name) => name.startsWith('@/') ? load(`${name.slice(2)}.ts`) : require(name);
  new Function('require', 'module', 'exports', code)(localRequire, module, module.exports);
  return module.exports;
}
const { sanitize } = load('lib/server/sanitize.ts');
const request = { mode: 'chat', event: 'message', allowImage: true, messages: [], character: {}, memory: [], user: {} };
assert.ok(!sanitize(null, request, '{"tool_calls":[{"name":"image"}]}').bubbles.join('').includes('tool_calls'));
assert.deepEqual(sanitize({ bubbles: ['hello', '{"arguments":{}}'] }, request, '').bubbles, ['hello']);
assert.deepEqual(sanitize({ bubbles: ['hello there'] }, request, '').bubbles, ['hello there']);
const { photographyPrompt } = load('lib/eternal-engine/photography.ts');
const prompt = photographyPrompt({ scene: 'coffee shop', appearance: 'blue jacket', aspect: '1:1', purpose: 'portrait' });
assert.match(prompt, /coffee shop/);
assert.match(prompt, /blue jacket/);
assert.match(prompt, /circular avatar crop/);
assert.ok(prompt.length <= 1800);
const { checkCredentials, verifyAdminToken, createAdminToken } = load('lib/server/admin.ts');
process.env.ADMIN_EMAIL = 'admin@example.com';
process.env.ADMIN_PASSCODE = '';
process.env.ADMIN_SECRET = '';
assert.equal(checkCredentials('admin@example.com', ''), false);
assert.equal(verifyAdminToken('anything'), null);
process.env.ADMIN_PASSCODE = 'regression-test-password';
process.env.ADMIN_SECRET = 'regression-test-only-secret-at-least-32-characters';
assert.equal(checkCredentials('admin@example.com', 'wrong'), false);
assert.equal(checkCredentials('admin@example.com', 'regression-test-password'), true);
assert.deepEqual(verifyAdminToken(createAdminToken('admin@example.com')), { email: 'admin@example.com' });
assert.equal(verifyAdminToken(`${createAdminToken('admin@example.com')}tampered`), null);
let context;
class FakeAudioContext {
  currentTime = 0;
  state = 'running';
  destination = {};
  starts = [];
  constructor() { context = this; }
  createGain() { return { gain: { value: 1 }, connect() {} }; }
  createBuffer(channels, length, rate) { return { duration: length / rate, getChannelData: () => new Float32Array(length) }; }
  createBufferSource() { return { connect() {}, disconnect() {}, stop() {}, start: (time) => this.starts.push(time) }; }
  async close() { this.state = 'closed'; }
}
global.AudioContext = FakeAudioContext;
const { CallAudioPlayer } = load('lib/engine/callAudio.ts');
(async () => {
  const player = new CallAudioPlayer();
  await player.unlock();
  player.play(new Int16Array(2400).buffer);
  player.play(new Int16Array(2400).buffer);
  assert.deepEqual(context.starts, [0, 0.1]);
  assert.equal(player.playing, true);
  player.play(new ArrayBuffer(3));
  assert.equal(context.starts.length, 2);
  player.close();
  assert.equal(player.playing, false);
  assert.equal(context.state, 'closed');
  console.log('Offline regressions passed: tool filtering, photography prompts, admin security, ordered audio playback.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
