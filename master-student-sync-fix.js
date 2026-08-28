(() => {
  const clean = v => String(v ?? '').trim();
  function repairMasterNavigation() {
    const title = clean(document.querySelector('#pageTitle')?.textContent).toLowerCase();
    if (!title.includes('master data')) return;
    const page = document.querySelector('#page');
    if (!page) return;
    // A Template Laporan action must never be able to hijack the Master Data page.
    page.querySelectorAll('[data-report-template]').forEach(el => el.removeAttribute('data-report-template'));
    // Keep the actual Master Data navigation button authoritative.
    const master = document.querySelector('#nav [data-page="masters"]');
    if (master) master.onclick = () => {
      const nav = document.querySelector('#nav');
      const buttons = nav?.querySelectorAll('[data-page]') || [];
      buttons.forEach(b => b.classList.toggle('active', b === master));
      document.querySelector('#pageKicker').textContent = 'MASTER';
      document.querySelector('#pageTitle').textContent = 'Master Data';
    };
  }

  // The module keeps its data in memory. After an Excel import, refresh once so
  // Dashboard, Master Siswa and all class views read the newly inserted rows.
  let refreshing = false;
  document.addEventListener('dp:students-imported', () => {
    if (refreshing) return;
    refreshing = true;
    setTimeout(() => window.location.reload(), 350);
  }, false);

  let timer;
  const schedule = () => { clearTimeout(timer); timer = setTimeout(repairMasterNavigation, 60); };
  window.addEventListener('load', () => {
    schedule();
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  }, { once: true });
})();
