(() => {
  const APP_NAME = 'BANTU BERES DISIPLIN PRO';
  const LOGO_SRC = 'brand-logo.svg';
  const applyBrand = () => {
    document.title = `${APP_NAME} — Tata Tertib Sekolah`;
    document.querySelectorAll('.eyebrow').forEach(el => {
      if ((el.textContent || '').trim().toUpperCase() === 'DISIPLIN PRO') el.textContent = APP_NAME;
    });
    const sideBrand = document.querySelector('.brand-row b');
    if (sideBrand) sideBrand.textContent = APP_NAME;
    document.querySelectorAll('.logo-mark').forEach(el => {
      if (el.dataset.brandApplied === '1') return;
      el.textContent = '';
      const img = document.createElement('img');
      img.src = LOGO_SRC;
      img.alt = APP_NAME;
      img.decoding = 'async';
      el.appendChild(img);
      el.dataset.brandApplied = '1';
    });
    const kicker = document.querySelector('#pageKicker');
    if (kicker && (kicker.textContent || '').trim().toUpperCase() === 'DISIPLIN PRO') kicker.textContent = APP_NAME;
  };
  const boot = () => {
    applyBrand();
    new MutationObserver(applyBrand).observe(document.body, { childList: true, subtree: true, characterData: true });
  };
  if (document.body) boot(); else document.addEventListener('DOMContentLoaded', boot, { once: true });
})();
