const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = readFileSync(join(__dirname, '..', 'app.js'), 'utf8');
const musicSource = source.slice(source.indexOf('function initMusic()'), source.indexOf('\nfunction init()'));

function harness({ blocked = false, autoPlaying = true } = {}) {
  let now = 0;
  let nextTimer = 0;
  const timers = new Map();
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
    listenerCount() {
      return [...this.listeners.values()].reduce((sum, listeners) => sum + listeners.size, 0);
    }
  }
  const audio = new Target();
  Object.assign(audio, {
    dataset: {}, paused: true, ended: false, seeking: false, currentTime: 0,
    loop: true, playCalls: 0, error: null
  });
  let muted = false;
  let volume = 1;
  Object.defineProperties(audio, {
    muted: {
      get: () => muted,
      set(value) {
        if (muted !== value) {
          muted = value;
          audio.emit('volumechange');
        }
      }
    },
    volume: {
      get: () => volume,
      set(value) {
        if (volume !== value) {
          volume = value;
          audio.emit('volumechange');
        }
      }
    }
  });
  audio.play = async () => {
    audio.playCalls++;
    if (blocked) throw Object.assign(new Error('Autoplay blocked'), { name: 'NotAllowedError' });
    audio.paused = false;
    audio.emit('play');
    if (autoPlaying) audio.emit('playing');
  };
  audio.pause = () => {
    if (!audio.paused) {
      audio.paused = true;
      audio.emit('pause');
    }
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
  const context = vm.createContext({
    document, window, console, performance: { now: () => now },
    setTimeout(callback, delay) {
      const id = ++nextTimer;
      timers.set(id, { callback, at: now + delay });
      return id;
    },
    clearTimeout(id) { timers.delete(id); }
  });
  vm.runInContext(`${musicSource}\ninitMusic();`, context);
  return {
    audio, toggle, status, document, window, timers,
    init: () => vm.runInContext('initMusic()', context),
    allowPlayback: () => { blocked = false; },
    advance(milliseconds) {
      const end = now + milliseconds;
      while (true) {
        const next = [...timers.entries()].sort((a, b) => a[1].at - b[1].at)[0];
        if (!next || next[1].at > end) break;
        now = next[1].at;
        timers.delete(next[0]);
        next[1].callback();
      }
      now = end;
    }
  };
}

function assertStopped(h) {
  assert.equal(h.audio.paused, true);
  assert.equal(h.audio.muted, true);
  assert.equal(h.toggle.attributes['aria-pressed'], 'false');
  assert.equal(h.toggle.hidden, false);
  assert.match(h.status.textContent, /३०/);
  assert.equal(h.timers.size, 0);
}

test('stops, mutes and locks playback at exactly 30 seconds', async () => {
  const h = harness();
  await new Promise(setImmediate);
  h.advance(29999);
  assert.equal(h.audio.paused, false);
  h.advance(1);
  assertStopped(h);
  h.toggle.emit('click');
  h.audio.muted = false;
  await h.audio.play();
  assertStopped(h);
});

test('10 seconds audible, long mute, 20 seconds audible; repeated toggles cannot reset allowance', async () => {
  const h = harness();
  await new Promise(setImmediate);
  h.advance(10000);
  h.toggle.emit('click');
  assert.equal(h.audio.muted, true);
  assert.equal(h.timers.size, 0);
  h.advance(90000);
  h.audio.currentTime = 80;
  h.audio.emit('timeupdate');
  h.toggle.emit('click');
  h.advance(19999);
  assert.equal(h.audio.paused, false);
  h.advance(1);
  assertStopped(h);
});

test('paused and buffering intervals do not consume allowance', async () => {
  const h = harness();
  await new Promise(setImmediate);
  h.advance(10000);
  h.audio.pause();
  assert.equal(h.toggle.attributes['aria-pressed'], 'false');
  h.advance(50000);
  h.toggle.emit('click');
  await new Promise(setImmediate);
  h.advance(5000);
  h.audio.emit('waiting');
  h.advance(50000);
  h.audio.emit('playing');
  h.advance(15000);
  assertStopped(h);
});

test('zero volume does not consume allowance', async () => {
  const h = harness();
  await new Promise(setImmediate);
  h.advance(10000);
  h.audio.volume = 0;
  h.advance(60000);
  assert.equal(h.audio.paused, false);
  h.audio.volume = 1;
  h.advance(20000);
  assertStopped(h);
});

test('autoplay rejection and play requests do not start timer before playing', async () => {
  const h = harness({ blocked: true, autoPlaying: false });
  await new Promise(setImmediate);
  h.advance(60000);
  assert.equal(h.timers.size, 0);
  assert.match(h.status.textContent, /टैप/);
  h.allowPlayback();
  h.document.emit('pointerup', { target: {} });
  await new Promise(setImmediate);
  h.advance(60000);
  assert.equal(h.timers.size, 0);
  h.audio.emit('playing');
  h.advance(30000);
  assertStopped(h);
});

test('duplicate initialization and playing events retain one timer and the original allowance', async () => {
  const h = harness();
  await new Promise(setImmediate);
  const listeners = h.audio.listenerCount();
  h.advance(10000);
  h.init();
  h.audio.emit('playing');
  assert.equal(h.audio.playCalls, 1);
  assert.equal(h.audio.listenerCount(), listeners);
  assert.equal(h.timers.size, 1);
  h.advance(20000);
  assertStopped(h);
});

test('seeking does not reset allowance or treat media position as audible time', async () => {
  const h = harness();
  await new Promise(setImmediate);
  h.advance(10000);
  h.audio.seeking = true;
  h.audio.emit('seeking');
  h.advance(50000);
  h.audio.currentTime = 70;
  h.audio.seeking = false;
  h.audio.emit('playing');
  h.advance(20000);
  assertStopped(h);
});

test('back/forward cache preserves remaining allowance and expiry lock', async () => {
  const h = harness();
  await new Promise(setImmediate);
  h.advance(10000);
  h.window.emit('pagehide', { persisted: true });
  h.advance(60000);
  h.window.emit('pageshow', { persisted: true });
  await new Promise(setImmediate);
  h.advance(20000);
  assertStopped(h);
  h.window.emit('pagehide', { persisted: true });
  h.window.emit('pageshow', { persisted: true });
  assertStopped(h);
});

test('leaving page clears timers and all installed listeners', async () => {
  const h = harness();
  await new Promise(setImmediate);
  h.advance(10000);
  h.window.emit('pagehide', { persisted: false });
  assert.equal(h.timers.size, 0);
  assert.equal(h.audio.paused, true);
  for (const target of [h.audio, h.toggle, h.document, h.window]) assert.equal(target.listenerCount(), 0);
});

test('initial manual mute works before pending playback reports playing', async () => {
  const h = harness({ autoPlaying: false });
  await new Promise(setImmediate);
  h.toggle.emit('click');
  assert.equal(h.audio.muted, true);
  h.audio.emit('playing');
  h.advance(60000);
  assert.equal(h.timers.size, 0);
  h.toggle.emit('click');
  h.advance(30000);
  assertStopped(h);
});
