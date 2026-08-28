// Keep authentication screens completely isolated from the dashboard shell.
// The sidebar/top navigation belongs only to #appView and must never appear
// while Login / Daftar Sekolah is visible.
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
    const appVisible = !app.classList.contains('hidden');

    if (authVisible) {
      app.classList.add('hidden');
      app.setAttribute('aria-hidden', 'true');
    } else if (appVisible) {
      auth.classList.add('hidden');
      auth.setAttribute('aria-hidden', 'true');
    }

    if (!authVisible) auth.removeAttribute('aria-hidden');
    if (!appVisible) app.removeAttribute('aria-hidden');
    syncing = false;
  }

  function init() {
    syncAuthLayout();
    const observer = new MutationObserver(syncAuthLayout);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
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
