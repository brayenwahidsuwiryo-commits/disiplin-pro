(() => {
  const APP_NAME = 'BANTU BERES DISIPLIN PRO';
  const LOGO_SRC = 'brand-logo.svg';

  const setText = (el, value) => {
    if (el && el.textContent !== value) el.textContent = value;
  };

  const applyBrand = () => {
    if (!document.body) return;
    document.title = `${APP_NAME} — Tata Tertib Sekolah`;

    document.querySelectorAll('.eyebrow').forEach(el => {
      if ((el.textContent || '').trim().toUpperCase() === 'DISIPLIN PRO') {
        setText(el, APP_NAME);
      }
    });

    const sideBrand = document.querySelector('.brand-row b');
    setText(sideBrand, APP_NAME);

    document.querySelectorAll('.logo-mark').forEach(el => {
      const img = el.querySelector('img');
      if (img) {
        if (img.getAttribute('src') !== LOGO_SRC) img.setAttribute('src', LOGO_SRC);
        if (img.alt !== APP_NAME) img.alt = APP_NAME;
        return;
      }
      el.replaceChildren();
      const next = document.createElement('img');
      next.src = LOGO_SRC;
      next.alt = APP_NAME;
      next.decoding = 'async';
      el.appendChild(next);
    });

    const kicker = document.querySelector('#pageKicker');
    if (kicker && (kicker.textContent || '').trim().toUpperCase() === 'DISIPLIN PRO') {
      setText(kicker, APP_NAME);
    }
  };

  let scheduled = false;
  const scheduleApply = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      applyBrand();
    });
  };

  const boot = () => {
    applyBrand();
    new MutationObserver(scheduleApply).observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  };

  if (document.body) boot();
  else document.addEventListener('DOMContentLoaded', boot, { once: true });
})();
