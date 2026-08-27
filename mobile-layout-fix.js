(() => {
  const $ = (s, r = document) => r.querySelector(s);

  function applyMobileLayout() {
    const title = ($('#pageTitle')?.textContent || '').trim();
    const page = $('#page');
    if (!page) return;

    // Dashboard stays a dashboard. Never inject or retain the class-report block here.
    if (title === 'Dashboard') {
      page.querySelectorAll('.dashboard-report, [data-dashboard-report], .class-report-on-dashboard').forEach(el => el.remove());
    }

    // Mark the class report so CSS can give its analysis sections a mobile-first layout.
    page.classList.toggle('is-class-report', title === 'Rekap Kelas');
    page.classList.toggle('is-dashboard', title === 'Dashboard');
  }

  const observer = new MutationObserver(applyMobileLayout);
  window.addEventListener('load', () => {
    applyMobileLayout();
    const page = $('#page');
    if (page) observer.observe(page, { childList: true, subtree: true });
  });
})();
