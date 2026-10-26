// Keep-screen-on via the Screen Wake Lock API. The OS drops the lock whenever
// the page is hidden, so we re-acquire it on return and on the next touch.
let lock = null;
let wanted = false;
let onChange = () => {};

async function acquire() {
  if (!wanted || lock || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
  try {
    lock = await navigator.wakeLock.request('screen');
    lock.addEventListener('release', () => { lock = null; onChange(); });
  } catch { lock = null; }
  onChange();
}

document.addEventListener('visibilitychange', acquire);
document.addEventListener('pointerdown', acquire, { passive: true });

export const wake = {
  supported: 'wakeLock' in navigator,
  get active() { return !!lock; },
  onChange(fn) { onChange = fn; },
  async set(on) {
    wanted = on;
    if (on) await acquire();
    else if (lock) { await lock.release().catch(() => {}); lock = null; onChange(); }
  },
};
