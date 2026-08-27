(() => {
  const $ = (s, r = document) => r.querySelector(s);

  function addMobileLabels(root) {
    root.querySelectorAll('.data-table').forEach(table => {
      const headers = [...table.querySelectorAll('thead th')].map(th => (th.textContent || '').trim());
      if (!headers.length) return;
      table.querySelectorAll('tbody tr').forEach(row => {
        [...row.children].forEach((cell, i) => {
          if (!cell.getAttribute('data-label') && headers[i]) cell.setAttribute('data-label', headers[i]);
        });
      });
    });
  }

  function applyMobileLayout() {
    const title = ($('#pageTitle')?.textContent || '').trim();
    const page = $('#page');
    if (!page) return;
    // Dashboard remains a dashboard; remove any legacy class-report block if injected by another UI layer.
    if (title === 'Dashboard') {
      page.querySelectorAll('.dashboard-report, [data-dashboard-report], .class-report-on-dashboard').forEach(el => el.remove());
    }
    page.classList.toggle('is-class-report', title === 'Rekap Kelas');
    page.classList.toggle('is-dashboard', title === 'Dashboard');
    addMobileLabels(page);
  }

  const observer = new MutationObserver(applyMobileLayout);
  window.addEventListener('load', () => {
    applyMobileLayout();
    const page = $('#page');
    if (page) observer.observe(page, { childList: true, subtree: true });
  });
})();
