(() => {
  // UX rule: violations are managed inside categories. There is no separate
  // "Tambah pelanggaran" action; adding is done from the category area only.
  function cleanAndFix() {
    const page = document.querySelector('#page');
    const title = (document.querySelector('#pageTitle')?.textContent || '').toLowerCase();
    if (!page || !title.includes('master data')) return;

    // Remove every add-violation control. Categories remain the only entry point.
    page.querySelectorAll('.dp-add-v').forEach(el => el.remove());

    // The original renderer attaches handlers directly to buttons and can be
    // rerun by other UI observers. Rebind edit buttons safely by cloning them,
    // then use one delegated handler so editing remains clickable after rerenders.
    page.querySelectorAll('.dp-edit-v').forEach(btn => {
      if (btn.dataset.editFixed === '1') return;
      const clone = btn.cloneNode(true);
      clone.dataset.editFixed = '1';
      btn.replaceWith(clone);
    });
  }

  document.addEventListener('click', (event) => {
    const btn = event.target.closest('#page .dp-edit-v[data-edit-fixed="1"]');
    if (!btn) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    // Reuse the existing renderer's edit action without exposing a second add UI.
    // The renderer's handler is not retained after cloning, so dispatch a
    // custom request that the fix below resolves from the current DOM data.
    const id = btn.dataset.id;
    const page = document.querySelector('#page');
    const category = btn.closest('.vc-category');
    const item = btn.closest('.vc-item');
    if (!id || !item || !category) return;

    const name = item.querySelector('.vc-item-name')?.textContent?.trim() || '';
    const pointsText = item.querySelector('.vc-item-points')?.textContent || '';
    const points = Number((pointsText.match(/-?\d+(?:[.,]\d+)?/) || ['0'])[0].replace(',', '.'));
    const categoryName = category.querySelector('h4')?.textContent?.trim() || '';

    const old = document.querySelector('#dpVCModal');
    if (old) old.remove();
    const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
    const modal = document.createElement('div');
    modal.id = 'dpVCModal';
    modal.className = 'dp-vc-modal';
    modal.innerHTML = `<div class="dp-vc-dialog"><div class="modal-head"><h3>Edit pelanggaran</h3><button class="close" type="button" data-close>×</button></div><form class="form-grid" id="dpEditViolationForm"><label>Nama pelanggaran<input name="name" required value="${esc(name)}"></label><label>Poin<input name="points" type="number" min="0" step="1" required value="${points}"></label><label>Kategori<input name="category" required value="${esc(categoryName)}" readonly></label><div class="actions full"><button type="button" class="secondary" data-close>Batal</button><button class="primary" type="submit">Simpan</button></div></form></div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal || e.target.closest('[data-close]')) modal.remove(); });
    modal.querySelector('form').addEventListener('submit', async e => {
      e.preventDefault();
      const cfg = window.APP_CONFIG || {};
      if (!cfg.supabaseUrl || !cfg.supabaseAnonKey || !window.supabase) return alert('Konfigurasi database belum siap.');
      const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
      const d = Object.fromEntries(new FormData(e.currentTarget));
      const result = await sb.from('violation_types').update({ name: d.name.trim(), points: Number(d.points), category: d.category.trim(), active: true }).eq('id', id);
      if (result.error) return alert(result.error.message);
      modal.remove();
      // Trigger the existing category renderer to refresh the list immediately.
      window.dispatchEvent(new Event('disiplin:master-refresh'));
      setTimeout(cleanAndFix, 100);
      const toast = document.querySelector('#toast');
      if (toast) { toast.textContent = 'Pelanggaran berhasil diperbarui'; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2400); }
    });
  }, true);

  const mo = new MutationObserver(() => { clearTimeout(window.__violationEditFixTimer); window.__violationEditFixTimer = setTimeout(cleanAndFix, 80); });
  window.addEventListener('load', () => { cleanAndFix(); mo.observe(document.body, { childList: true, subtree: true }); });
})();
