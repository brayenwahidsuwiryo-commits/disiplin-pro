(() => {
  // Codes remain internal/database metadata, but operators should not have to
  // invent or maintain them when creating master data.
  const CODE_RE = /\b(kode|code|id\s*(pelanggaran|prestasi|sanksi))\b/i;
  let busy = false;

  function clean(root = document) {
    if (busy) return;
    busy = true;
    try {
      const nodes = root.querySelectorAll?.('label, th, .form-group, .field, .input-group, .modal-body, .card') || [];
      nodes.forEach(el => {
        const text = (el.textContent || '').trim();
        if (!CODE_RE.test(text)) return;
        // Only remove a field when it contains an actual code-like input/select.
        const input = el.querySelector('input, select, textarea');
        if (!input) return;
        const name = `${input.name || ''} ${input.id || ''} ${input.placeholder || ''}`;
        if (CODE_RE.test(`${text} ${name}`)) {
          if (el.tagName === 'LABEL' || el.classList.contains('form-group') || el.classList.contains('field') || el.classList.contains('input-group')) {
            el.remove();
          }
        }
      });

      // Remove table columns explicitly labelled Kode/Code, without touching
      // unrelated IDs shown elsewhere in the application.
      document.querySelectorAll('th').forEach(th => {
        if (!/^\s*(kode|code)\s*$/i.test(th.textContent || '')) return;
        const table = th.closest('table');
        const idx = [...th.parentElement.children].indexOf(th);
        table?.querySelectorAll('tr').forEach(tr => tr.children[idx]?.remove());
      });
    } finally {
      busy = false;
    }
  }

  function run() {
    clean();
    // A short, non-recursive observer is enough for dynamically opened modals.
    if (window.__dpCodeObserver) return;
    const mo = new MutationObserver(() => {
      if (busy) return;
      clearTimeout(window.__dpCodeTimer);
      window.__dpCodeTimer = setTimeout(() => clean(), 50);
    });
    mo.observe(document.body, { childList: true, subtree: true });
    window.__dpCodeObserver = mo;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
})();
