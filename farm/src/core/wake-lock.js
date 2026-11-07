// Screen Wake Lock: https://www.w3.org/TR/screen-wake-lock/
export function createWakeLock({ navigator = globalThis.navigator, document = globalThis.document } = {}) {
  let active = false;
  let sentinel = null;
  let pending = null;
  let attempted = false;
  const wanted = () => active && !document?.hidden;
  const release = () => { const old = sentinel; sentinel = null; if (old) Promise.resolve(old.release()).catch(() => {}); };
  async function acquire() {
    if (!wanted() || sentinel || pending || attempted || !navigator?.wakeLock?.request) return;
    attempted = true;
    pending = (async () => {
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (!wanted()) { await lock.release(); return; }
        sentinel = lock;
        lock.addEventListener('release', () => { if (sentinel === lock) sentinel = null; });
      } catch { /* unsupported, denied, low battery: game continues silently */ }
    })();
    await pending;
    pending = null;
  }
  function refresh() { attempted = false; if (wanted()) void acquire(); else release(); }
  document?.addEventListener('visibilitychange', refresh);
  return {
    setActive(on) { if (active === on) return; active = on; refresh(); },
    refresh,
    dispose() { active = false; release(); document?.removeEventListener('visibilitychange', refresh); },
  };
}
