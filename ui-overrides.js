// Legacy UI override intentionally disabled.
// The canonical renderer is app.js. Keeping a second renderer caused Dashboard/Rekap
// pages to be replaced asynchronously, producing duplicate/incorrect layouts and
// occasional blank states. Feature-specific enhancements belong in dedicated modules.
(() => {
  window.DisiplinProUIOverrides = { disabled: true };
})();
