const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = readFileSync(join(__dirname, '..', 'app.js'), 'utf8');
const musicSource = source.slice(source.indexOf('function initMusic()'), source.indexOf('\nfunction init()'));
const settle = () => new Promise(setImmediate);

function harness({ blocked = false, pending = false } = {}) {
  class Target {
    listeners = new Map();
    addEventListener(name, callback) {
      if (!this.listeners.has(name)) this.listeners.set(name, new Set());
      this.listeners.get(name).add(callback);
    }
    removeEventListener(name, callback) {
      this.listeners.get(name)?.delete(callback);
    }
    emit(type, detail = {}) {
      for (const listener of [...(this.listeners.get(type) || [])]) listener({ type, ...detail });
    }
    count() {
      return [...this.listeners.values()].reduce((sum, listeners) => sum + listeners.size, 0);
    }
  }
  const audio = new Target();
  Object.assign(audio, {
    dataset: {}, paused: true, ended: false, loop: true, playCalls: 0, error: null
  });
  let muted = false;
  let volume = 1;
  let position = 0;
  let resolvePlay;
  Object.defineProperties(audio, {
    currentTime: {
      get: () => position,
      set(value) { position = value; audio.ended = false; }
    },
    muted: {
      get: () => muted,
      set(value) {
        if (muted !== value) { muted = value; audio.emit('volumechange'); }
      }
    },
    volume: {
      get: () => volume,
      set(value) {
        if (volume !== value) { volume = value; audio.emit('volumechange'); }
      }
    }
  });
  audio.play = async () => {
    audio.playCalls++;
    if (blocked) throw Object.assign(new Error('Autoplay blocked'), { name: 'NotAllowedError' });
    audio.paused = false;
    audio.ended = false;
    audio.emit('play');
    if (pending) await new Promise(resolve => { resolvePlay = resolve; });
    audio.emit('playing');
  };
  audio.pause = () => {
    if (!audio.paused) { audio.paused = true; audio.emit('pause'); }
  };
  audio.load = () => {};
  const toggle = new Target();
  toggle.attributes = {};
  toggle.setAttribute = (name, value) => { toggle.attributes[name] = value; };
  toggle.contains = target => target === toggle;
  const status = { textContent: '' };
  const document = new Target();
  document.getElementById = id => ({ backgroundMusic: audio, musicToggle: toggle, musicStatus: status })[id];
  const window = new Target();
  const context = vm.createContext({ document, window, console });
  vm.runInContext(`${musicSource}\ninitMusic();`, context);
  return {
    audio, toggle, status, document, window,
    init: () => vm.runInContext('initMusic()', context),
    allowPlayback: () => { blocked = false; },
    resolvePlay: () => { pending = false; resolvePlay(); },
    end() {
      audio.currentTime = 76.773141;
      audio.ended = true;
      audio.paused = true;
      audio.emit('ended');
    }
  };
}

function assertStopped(h) {
  assert.equal(h.audio.paused, true);
  assert.equal(h.audio.muted, true);
  assert.equal(h.toggle.attributes['aria-pressed'], 'false');
  assert.equal(h.toggle.hidden, false);
}

test('plays exactly two complete cycles and permanently stops/mutes', async () => {
  const h = harness();
  await settle();
  assert.equal(h.audio.loop, false);
  assert.equal(h.audio.playCalls, 1);
  h.end();
  await settle();
  assert.equal(h.audio.currentTime, 0);
  assert.equal(h.audio.playCalls, 2);
  assert.equal(h.audio.paused, false);
  h.end();
  assertStopped(h);
  assert.match(h.status.textContent, /दोनों/);
  h.audio.emit('ended');
  h.toggle.emit('click');
  h.document.emit('pointerup', { target: {} });
  h.window.emit('pageshow', { persisted: true });
  assert.equal(h.audio.playCalls, 2);
  h.audio.muted = false;
  await h.audio.play();
  assertStopped(h);
});

test('manual stop immediately pauses/mutes and blocks automatic restart', async () => {
  const h = harness();
  await settle();
  h.audio.currentTime = 10;
  h.toggle.emit('click');
  assertStopped(h);
  h.document.emit('click', { target: {} });
  h.end();
  h.window.emit('pagehide', { persisted: true });
  h.window.emit('pageshow', { persisted: true });
  assert.equal(h.audio.playCalls, 1);
  assertStopped(h);
});

test('explicit unmute resumes remaining sequence, not a new pair of plays', async () => {
  const h = harness();
  await settle();
  h.end();
  await settle();
  h.audio.currentTime = 12;
  h.toggle.emit('click');
  assertStopped(h);
  h.toggle.emit('click');
  await settle();
  assert.equal(h.audio.currentTime, 12);
  assert.equal(h.audio.paused, false);
  h.end();
  assertStopped(h);
  assert.equal(h.audio.playCalls, 3);
});

test('blocked autoplay waits for permitted interaction without extra cycles', async () => {
  const h = harness({ blocked: true });
  await settle();
  assert.match(h.status.textContent, /टैप/);
  assert.equal(h.audio.paused, true);
  h.allowPlayback();
  h.document.emit('pointerup', { target: {} });
  await settle();
  h.end();
  await settle();
  h.end();
  assertStopped(h);
  assert.equal(h.audio.playCalls, 3);
});

test('duplicate initialization and ended notifications do not add plays', async () => {
  const h = harness();
  await settle();
  const count = h.audio.count();
  h.init();
  h.audio.emit('playing');
  h.end();
  h.audio.emit('ended');
  await settle();
  assert.equal(h.audio.count(), count);
  assert.equal(h.audio.playCalls, 2);
  h.end();
  assertStopped(h);
});

test('manual stop while play promise is pending cannot restart on resolution', async () => {
  const h = harness({ pending: true });
  h.toggle.emit('click');
  assertStopped(h);
  h.resolvePlay();
  await settle();
  assertStopped(h);
  assert.equal(h.audio.playCalls, 1);
});

test('external mute/zero volume pauses immediately and never auto resumes', async () => {
  for (const property of ['muted', 'volume']) {
    const h = harness();
    await settle();
    h.audio[property] = property === 'muted' ? true : 0;
    assertStopped(h);
    h.document.emit('click', { target: {} });
    assert.equal(h.audio.playCalls, 1);
  }
});

test('back/forward cache preserves completed cycles and resumes only previously active music', async () => {
  const h = harness();
  await settle();
  h.end();
  await settle();
  h.window.emit('pagehide', { persisted: true });
  assert.equal(h.audio.paused, true);
  h.window.emit('pageshow', { persisted: true });
  await settle();
  h.end();
  assertStopped(h);
});

test('page exit removes listeners and stops pending playback', async () => {
  const h = harness({ pending: true });
  h.window.emit('pagehide', { persisted: false });
  h.resolvePlay();
  await settle();
  assertStopped(h);
  for (const target of [h.audio, h.toggle, h.document, h.window]) assert.equal(target.count(), 0);
});

test('pending playback cannot resume while cached page is suspended', async () => {
  const h = harness({ pending: true });
  h.window.emit('pagehide', { persisted: true });
  h.resolvePlay();
  await settle();
  assert.equal(h.audio.paused, true);
  h.window.emit('pageshow', { persisted: true });
  await settle();
  assert.equal(h.audio.paused, false);
  h.end();
  await settle();
  h.end();
  assertStopped(h);
});
