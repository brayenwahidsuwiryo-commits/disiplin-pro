// Auth/dashboard isolation without MutationObserver.
// IMPORTANT: never observe the auth class while also changing that class here;
// doing so can create a feedback loop and make the UI look permanently loading.
(() => {
  const sync = () => {
    const auth = document.getElementById('authView');
    const app = document.getElementById('appView');
    if (!auth || !app) return;
    const authVisible = !auth.classList.contains('hidden');
    if (authVisible) {
      app.style.setProperty('display', 'none', 'important');
      app.style.setProperty('visibility', 'hidden', 'important');
      app.style.setProperty('pointer-events', 'none', 'important');
    } else {
      app.style.removeProperty('display');
      app.style.removeProperty('visibility');
      app.style.removeProperty('pointer-events');
    }
  };
  const start = () => { sync(); window.setInterval(sync, 250); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
