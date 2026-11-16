const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = readFileSync(join(__dirname, '..', 'app.js'), 'utf8');
const nudgeSource = source.slice(source.indexOf('function initScrollNudge()'), source.indexOf('function initMusic()'));

function harness({ hidden = false, reduced = false, top = 0, loaded = true, available = 1000 } = {}) {
  class Target extends EventTarget {
    emit(type) { this.dispatchEvent(new Event(type)); }
  }
  const document = new Target();
  const window = new Target();
  const motion = new Target();
  motion.matches = reduced;
  document.hidden = hidden;
  document.readyState = loaded ? 'complete' : 'interactive';
  document.documentElement = { dataset: {} };
  const writes = [];
  const scroller = {
    scrollTop: top, scrollLeft: 7, scrollHeight: available + 800, clientHeight: 800,
    scrollTo(options) {
      assert.equal(options.behavior, 'instant');
      assert.equal(options.left, 7);
      this.scrollTop = Math.round(options.top);
      writes.push(this.scrollTop);
    }
  };
  document.scrollingElement = scroller;
  window.matchMedia = () => motion;
  let now = 0;
  let id = 0;
  const timers = new Map();
  const frames = new Map();
  const context = vm.createContext({
    document, window, performance: { now: () => now },
    setTimeout: (callback, delay) => { timers.set(++id, { callback, at: now + delay }); return id; },
    clearTimeout: key => timers.delete(key),
    requestAnimationFrame: callback => { frames.set(++id, callback); return id; },
    cancelAnimationFrame: key => frames.delete(key)
  });
  const init = () => vm.runInContext('initScrollNudge()', context);
  vm.runInContext(nudgeSource, context);
  init();
  function advance(ms) {
    const end = now + ms;
    while (now < end) {
      now = Math.min(end, now + 10);
      for (const [key, timer] of [...timers]) {
        if (timer.at <= now) { timers.delete(key); timer.callback(); }
      }
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach(callback => callback(now));
      window.emit('scroll');
    }
  }
  return { document, window, motion, scroller, writes, timers, frames, init, advance };
}

test('waits the full 15 seconds, eases exactly 50px, cleans up and never repeats', () => {
  const h = harness();
  h.init();
  assert.equal(h.timers.size, 1);
  h.advance(14990);
  assert.equal(h.writes.length, 0);
  h.advance(410);
  assert.ok(h.scroller.scrollTop > 0 && h.scroller.scrollTop < 50);
  h.advance(400);
  assert.equal(h.scroller.scrollTop, 50);
  assert.equal(h.frames.size + h.timers.size, 0);
  const count = h.writes.length;
  h.scroller.scrollTop = 0;
  h.window.emit('scroll');
  h.init();
  h.advance(30000);
  assert.equal(h.writes.length, count);
  const reload = harness();
  reload.advance(15800);
  assert.equal(reload.scroller.scrollTop, 50);
});

for (const event of ['pointerdown', 'touchstart', 'wheel', 'click', 'keydown', 'focusin']) {
  test(`${event} cancels before the timer and during animation without blocking input`, () => {
    for (const elapsed of [5000, 15400]) {
      const h = harness();
      h.advance(elapsed);
      let received = false;
      h.document.addEventListener(event, () => { received = true; });
      h.document.emit(event);
      const count = h.writes.length;
      h.advance(30000);
      assert.equal(received, true);
      assert.equal(h.writes.length, count);
    }
  });
}

test('manual scrolling down and back up cancels, including during animation', () => {
  for (const elapsed of [5000, 15400]) {
    const h = harness();
    h.advance(elapsed);
    h.scroller.scrollTop = 120;
    h.window.emit('scroll');
    h.scroller.scrollTop = 0;
    h.window.emit('scroll');
    const count = h.writes.length;
    h.advance(30000);
    assert.equal(h.writes.length, count);
  }
});

test('hidden tabs, reduced motion and page exit cancel pending and active nudges', () => {
  for (const elapsed of [5000, 15400]) {
    for (const reason of ['hidden', 'motion', 'pagehide']) {
      const h = harness();
      h.advance(elapsed);
      if (reason === 'hidden') { h.document.hidden = true; h.document.emit('visibilitychange'); }
      if (reason === 'motion') { h.motion.matches = true; h.motion.emit('change'); }
      if (reason === 'pagehide') h.window.emit('pagehide');
      h.document.hidden = false;
      h.motion.matches = false;
      h.document.emit('visibilitychange');
      h.window.emit('pageshow');
      const count = h.writes.length;
      h.advance(30000);
      assert.equal(h.writes.length, count);
    }
  }
  for (const options of [{ hidden: true }, { reduced: true }, { top: 100 }]) {
    const h = harness(options);
    h.advance(30000);
    assert.equal(h.writes.length, 0);
  }
});

test('starts after load, catches early input and clamps to available document space', () => {
  const h = harness({ loaded: false, available: 20 });
  h.advance(20000);
  assert.equal(h.writes.length, 0);
  h.window.emit('load');
  h.advance(14990);
  assert.equal(h.writes.length, 0);
  h.advance(810);
  assert.equal(h.scroller.scrollTop, 20);
  const cancelled = harness({ loaded: false });
  cancelled.document.emit('touchstart');
  cancelled.window.emit('load');
  cancelled.advance(30000);
  assert.equal(cancelled.writes.length, 0);
});
