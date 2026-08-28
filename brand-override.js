(() => {
  const APP_NAME = 'BANTU BERES DISIPLIN PRO';
  const LOGO_SRC = 'brand-logo.svg?v=2';

  const setText = (el, value) => {
    if (el && el.textContent !== value) el.textContent = value;
  };

  const applyBrand = () => {
    document.title = `${APP_NAME} — Tata Tertib Sekolah`;

    document.querySelectorAll('.eyebrow').forEach(el => {
      if ((el.textContent || '').trim().toUpperCase() === 'DISIPLIN PRO') {
        setText(el, APP_NAME);
      }
    });

    setText(document.querySelector('.brand-row b'), APP_NAME);

    document.querySelectorAll('.logo-mark').forEach(el => {
      const img = el.querySelector('img');
      if (!img) return;
      if (img.getAttribute('src') !== LOGO_SRC) img.setAttribute('src', LOGO_SRC);
      if (img.alt !== APP_NAME) img.alt = APP_NAME;
    });

    const kicker = document.querySelector('#pageKicker');
    if (kicker && (kicker.textContent || '').trim().toUpperCase() === 'DISIPLIN PRO') {
      setText(kicker, APP_NAME);
    }
  };

  // Branding is static in index.html, so do not observe the entire DOM.
  // A global MutationObserver caused unnecessary work while the app rendered pages.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyBrand, { once: true });
  } else {
    applyBrand();
  }
})();
