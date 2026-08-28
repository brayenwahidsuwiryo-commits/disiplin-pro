(() => {
  const cfg = window.APP_CONFIG || {};
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey || !window.supabase) return;
  const db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const $ = s => document.querySelector(s);
  let lastPage = '';
  let rows = [];
  let rendering = false;

  async function getSchoolId() {
    const { data: { user } } = await db.auth.getUser();
    if (!user) return null;
    const { data, error } = await db.from('profiles').select('school_id').eq('id', user.id).single();
    if (error) throw error;
    return data?.school_id || null;
  }

  async function load() {
    const sid = await getSchoolId();
    if (!sid) return [];
    const { data, error } = await db.from('students').select('id,nis,name,class_name,homeroom_teacher,parent_name,parent_phone,status,notes').eq('school_id', sid).order('name').limit(5000);
    if (error) throw error;
    return data || [];
  }

  function renderTable() {
    const box = $('#dpMasterStudentTable');
    if (!box) return;
    const q = ($('#dpMasterStudentSearch')?.value || '').trim().toLowerCase();
    const st = $('#dpMasterStudentStatus')?.value || '';
    const list = rows.filter(s => (!st || s.status === st) && [s.nis,s.name,s.class_name,s.homeroom_teacher,s.parent_name].join(' ').toLowerCase().includes(q));
    box.innerHTML = list.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>NIS</th><th>Nama</th><th>Kelas</th><th>Wali Kelas</th><th>Orang Tua/Wali</th><th>Status</th></tr></thead><tbody>${list.map(s=>`<tr><td>${esc(s.nis||'-')}</td><td><b>${esc(s.name)}</b></td><td>${esc(s.class_name||'-')}</td><td>${esc(s.homeroom_teacher||'-')}</td><td>${esc(s.parent_name||'-')}<br><span class="hint">${esc(s.parent_phone||'')}</span></td><td><span class="badge ${s.status==='Aktif'?'good':'neutral'}">${esc(s.status||'-')}</span></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">Tidak ada data siswa.</div>';
    const count = $('#dpMasterStudentCount');
    if (count) count.textContent = `${list.length} siswa ditampilkan dari ${rows.length} siswa sekolah ini`;
  }

  async function render() {
    const title = ($('#pageTitle')?.textContent || '').trim();
    if (title !== 'Master Siswa') return;
    const page = $('#page');
    if (!page || rendering) return;
    if (page.dataset.dpStudentDbFix === '1') { renderTable(); return; }
    rendering = true;
    try {
      rows = await load();
      // Keep the native add/import controls, but make the displayed student list
      // an independent DB read so it cannot depend on stale dashboard state.
      const nativeTable = $('#studentTable');
      if (!nativeTable) return;
      nativeTable.id = 'dpMasterStudentTable';
      nativeTable.innerHTML = '';
      const toolbar = nativeTable.parentElement?.querySelector('.toolbar');
      if (toolbar) {
        const left = toolbar.querySelector('.toolbar-left');
        if (left) {
          const search = left.querySelector('#studentSearch');
          const status = left.querySelector('#studentStatus');
          if (search) search.id = 'dpMasterStudentSearch';
          if (status) status.id = 'dpMasterStudentStatus';
          search?.addEventListener('input', renderTable);
          status?.addEventListener('change', renderTable);
        }
      }
      const card = nativeTable.parentElement;
      if (card && !$('#dpMasterStudentCount')) {
        const note = document.createElement('div'); note.id='dpMasterStudentCount'; note.className='hint'; note.style.margin='-8px 0 12px'; card.insertBefore(note,nativeTable);
      }
      page.dataset.dpStudentDbFix = '1';
      renderTable();
    } catch (e) {
      console.error('[master-students-db-fix]', e);
    } finally { rendering = false; }
  }

  function schedule() {
    clearTimeout(window.__dpMasterStudentTimer);
    window.__dpMasterStudentTimer = setTimeout(render, 180);
  }

  document.addEventListener('dp:students-imported', async () => {
    rows = await load().catch(() => []);
    renderTable();
  });
  window.addEventListener('load', () => {
    schedule();
    new MutationObserver(() => {
      const title = ($('#pageTitle')?.textContent || '').trim();
      if (title !== lastPage) { lastPage = title; schedule(); }
    }).observe(document.body, { childList:true, subtree:true });
  }, {once:true});
})();
