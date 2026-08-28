// Auth pages are a completely separate shell from the dashboard.
// IMPORTANT: hide #appView with an inline style as well as the class so
// later CSS/JS cannot accidentally make the dashboard/sidebar visible.
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
      app.style.setProperty('display', 'none', 'important');
      app.style.setProperty('visibility', 'hidden', 'important');
      app.style.setProperty('pointer-events', 'none', 'important');
    } else {
      app.classList.remove('hidden');
      app.removeAttribute('aria-hidden');
      app.style.removeProperty('display');
      app.style.removeProperty('visibility');
      app.style.removeProperty('pointer-events');
    }

    if (authVisible) {
      auth.removeAttribute('aria-hidden');
      auth.style.removeProperty('display');
    } else {
      auth.classList.add('hidden');
      auth.setAttribute('aria-hidden', 'true');
      auth.style.setProperty('display', 'none', 'important');
    }
    syncing = false;
  }

  function init() {
    syncAuthLayout();
    const observer = new MutationObserver(syncAuthLayout);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
    window.addEventListener('pageshow', syncAuthLayout);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
