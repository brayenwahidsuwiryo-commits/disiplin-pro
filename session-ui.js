/* Disiplin Pro session UX. No device/session-count limit is enforced. */
(() => {
  const cfg = window.APP_CONFIG || {};
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey || !window.supabase) return;
  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  const INACTIVITY_MS = 10 * 60 * 1000;
  let timer = null;
  let active = false;

  const clearTimer = () => { if (timer) clearTimeout(timer); timer = null; };
  const armTimer = () => {
    clearTimer();
    if (!active || document.hidden) return;
    timer = setTimeout(async () => {
      await sb.auth.signOut({ scope: 'local' });
      window.location.reload();
    }, INACTIVITY_MS);
  };

  const activity = () => armTimer();
  ['pointerdown','keydown','touchstart','scroll','pointermove'].forEach(e =>
    window.addEventListener(e, activity, { passive: true })
  );
  document.addEventListener('visibilitychange', () => { if (!document.hidden) armTimer(); });

  window.addEventListener('load', async () => {
    const { data: { session } } = await sb.auth.getSession();
    active = !!session;
    armTimer();
  });

  sb.auth.onAuthStateChange((_event, session) => {
    active = !!session;
    if (active) armTimer(); else clearTimer();
  });
})();
