/* Disiplin Pro security UI layer.
 * Backend RLS remains the source of truth; this only improves UX and visibility.
 */
(() => {
  const cfg = window.APP_CONFIG || {};
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey || !window.supabase) return;
  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);

  const roleOrder = { staff: 1, admin: 2, owner: 3 };
  let profile = null;

  async function loadRole() {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;
    const { data } = await sb.from('profiles').select('id,school_id,full_name,role').eq('id', user.id).single();
    profile = data || null;
    return profile;
  }

  function canManage(role) { return roleOrder[role] >= roleOrder.admin; }
  function canDelete(role) { return role === 'owner'; }

  function enforceButtons() {
    if (!profile) return;
    const role = profile.role;
    document.querySelectorAll('.deleteStudent, .deleteEvent, .deleteCoaching, .deleteMaster, [data-action="delete"]').forEach(btn => {
      if (!canDelete(role)) btn.remove();
    });
    if (!canManage(role)) {
      document.querySelectorAll('.editStudent, .editEvent, .editCoaching, .editMaster, [data-action="edit"]').forEach(btn => btn.setAttribute('disabled', 'disabled'));
    }
  }

  async function renderAudit() {
    const page = document.querySelector('#page');
    if (!page) return;
    page.innerHTML = '<div class="card"><h3>Audit Log</h3><p class="hint">Memuat riwayat perubahan data...</p></div>';
    const { data, error } = await sb.from('audit_logs')
      .select('id,actor_id,action,table_name,record_id,old_data,new_data,created_at')
      .eq('school_id', profile.school_id)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) {
      page.innerHTML = `<div class="card"><h3>Audit Log</h3><p class="hint">${escapeHtml(error.message)}</p></div>`;
      return;
    }
    const rows = (data || []).map(x => `<tr><td>${new Date(x.created_at).toLocaleString('id-ID')}</td><td>${escapeHtml(x.action)}</td><td>${escapeHtml(x.table_name)}</td><td>${escapeHtml(x.record_id || '-')}</td><td>${escapeHtml(x.actor_id || '-')}</td></tr>`).join('');
    page.innerHTML = `<div class="card"><div class="toolbar"><div><h3>Audit Log</h3><span class="hint">Riwayat insert, update, dan delete pada data sekolah. Log tidak dapat diubah melalui aplikasi.</span></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Waktu</th><th>Aksi</th><th>Tabel</th><th>Record</th><th>Pengguna</th></tr></thead><tbody>${rows || '<tr><td colspan="5">Belum ada perubahan tercatat.</td></tr>'}</tbody></table></div></div>`;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[m]));
  }

  function installAuditButton() {
    if (!profile || !['owner','admin'].includes(profile.role)) return;
    const nav = document.querySelector('#nav');
    if (!nav || nav.querySelector('[data-security-audit]')) return;
    const group = document.createElement('div');
    group.className = 'nav-group';
    group.innerHTML = '<div class="nav-label">KEAMANAN</div><button class="nav-btn" data-security-audit>◉ Audit Log</button>';
    nav.appendChild(group);
    group.querySelector('[data-security-audit]').onclick = () => renderAudit();
  }

  async function init() {
    await loadRole();
    if (!profile) return;
    enforceButtons();
    installAuditButton();
    const observer = new MutationObserver(() => { enforceButtons(); installAuditButton(); });
    observer.observe(document.body, { childList: true, subtree: true });
    sb.auth.onAuthStateChange(() => loadRole().then(() => { enforceButtons(); installAuditButton(); }));
  }

  window.addEventListener('load', init);
})();
