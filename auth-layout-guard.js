// Auth shell guard. Keep Login / Daftar isolated from the dashboard shell.
// Do NOT observe style mutations: changing inline styles inside this guard would
// otherwise trigger its own MutationObserver repeatedly and lock up the page.
(() => {
  const AUTH = '#authView';
  const APP = '#appView';
  let syncing = false;

  function syncAuthLayout() {
    if (syncing) return;
    const auth = document.querySelector(AUTH);
    const app = document.querySelector(APP);
    if (!auth || !app) return;

    syncing = true;
    const authVisible = !auth.classList.contains('hidden');

    if (authVisible) {
      app.classList.add('hidden');
      app.setAttribute('aria-hidden', 'true');
      app.style.display = 'none';
      app.style.visibility = 'hidden';
      app.style.pointerEvents = 'none';

      auth.classList.remove('hidden');
      auth.removeAttribute('aria-hidden');
      auth.style.removeProperty('display');
    } else {
      auth.classList.add('hidden');
      auth.setAttribute('aria-hidden', 'true');
      auth.style.display = 'none';

      app.classList.remove('hidden');
      app.removeAttribute('aria-hidden');
      app.style.removeProperty('display');
      app.style.removeProperty('visibility');
      app.style.removeProperty('pointer-events');
    }

    syncing = false;
  }

  function init() {
    syncAuthLayout();

    // Only watch class changes. This catches auth state changes without creating
    // a self-triggering loop from the inline style updates above.
    const observer = new MutationObserver(syncAuthLayout);
    observer.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });

    window.addEventListener('pageshow', syncAuthLayout);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
