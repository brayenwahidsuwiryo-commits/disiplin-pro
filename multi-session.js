// Multi-device session policy for Disiplin Pro.
// Supabase supports unlimited active sessions by default. Keep logout local so
// signing out from one browser does not revoke the user's other devices.
(() => {
  const cfg = window.APP_CONFIG || {};
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey || !window.supabase) return;
  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);

  document.addEventListener('click', async (event) => {
    const button = event.target.closest('#logoutBtn');
    if (!button) return;

    // Stop legacy global signOut handlers. A global signOut would terminate
    // every device for the same account, which is not desired here.
    event.preventDefault();
    event.stopImmediatePropagation();

    button.disabled = true;
    const { error } = await sb.auth.signOut({ scope: 'local' });
    if (error) {
      button.disabled = false;
      const toast = document.querySelector('#toast');
      if (toast) {
        toast.textContent = error.message;
        toast.classList.add('show');
      }
      return;
    }

    window.location.reload();
  }, true);
})();
