// Keep Login / Daftar Sekolah completely isolated from the dashboard shell.
// This guard runs before the deferred app module and also repairs accidental
// dashboard visibility when auth state changes.
(() => {
  const AUTH = document.getElementById('authView');
  const APP = document.getElementById('appView');
  if (!AUTH || !APP) return;

  const sync = () => {
    const authVisible = !AUTH.classList.contains('hidden');

    if (authVisible) {
      APP.classList.add('hidden');
      APP.setAttribute('aria-hidden', 'true');
      APP.style.setProperty('display', 'none', 'important');
      APP.style.setProperty('visibility', 'hidden', 'important');
      APP.style.setProperty('pointer-events', 'none', 'important');
      AUTH.removeAttribute('aria-hidden');
      AUTH.style.removeProperty('display');
    } else {
      APP.classList.remove('hidden');
      APP.removeAttribute('aria-hidden');
      APP.style.removeProperty('display');
      APP.style.removeProperty('visibility');
      APP.style.removeProperty('pointer-events');
      AUTH.classList.add('hidden');
      AUTH.setAttribute('aria-hidden', 'true');
      AUTH.style.setProperty('display', 'none', 'important');
    }
  };

  sync();
  new MutationObserver(() => sync()).observe(AUTH, {
    attributes: true,
    attributeFilter: ['class']
  });
  window.addEventListener('pageshow', sync);
})();
