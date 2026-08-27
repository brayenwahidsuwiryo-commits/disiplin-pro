// Global UI stability guard. Keeps the app viewport-sized and prevents legacy
// render layers from creating horizontal overflow or duplicate page roots.
(() => {
  const style = document.createElement('style');
  style.id = 'dp-ui-stability';
  style.textContent = `
    html, body { width:100%; max-width:100%; overflow-x:hidden; }
    body { min-width:0; }
    .app-shell, .main, .page { min-width:0; max-width:100%; }
    .main { overflow-x:hidden; }
    .page { width:100%; overflow-x:hidden; box-sizing:border-box; }
    .page > * { max-width:100%; box-sizing:border-box; }
    @media (max-width: 700px) {
      .page { padding-left:12px; padding-right:12px; }
      .toolbar { flex-wrap:wrap; gap:10px; }
      .toolbar-left, .toolbar-right { max-width:100%; flex-wrap:wrap; }
      .toolbar-left > *, .toolbar-right > * { max-width:100%; }
      .card { max-width:100%; }
      .table-wrap { max-width:100%; }
    }
  `;
  document.head.appendChild(style);

  // Remove accidental duplicate page children only when they carry an explicit
  // legacy/duplicate marker. Never delete normal cards or table rows.
  const page = document.querySelector('#page');
  if (page) {
    const legacy = page.querySelectorAll('[data-duplicate-page], .legacy-page-copy');
    legacy.forEach(el => el.remove());
  }
})();
