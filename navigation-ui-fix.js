// Sidebar usability: the navigation itself scrolls on short screens while
// the account controls remain reachable at the bottom.
(() => {
  const style = document.createElement('style');
  style.textContent = `
    .sidebar { overflow-y: auto; overflow-x: hidden; scrollbar-width: thin; }
    #nav { min-height: 0; }
    .side-bottom { margin-top: 18px; padding-top: 14px; border-top: 1px solid rgba(148,163,184,.14); }
    .side-bottom .nav-btn { display:flex; align-items:center; gap:10px; min-height:42px; transition:background .15s,transform .15s; }
    .side-bottom .nav-btn:hover { transform:translateX(2px); }
    .side-bottom #settingsBtn { color:#cbd5e1; background:transparent!important; border:0!important; }
    .side-bottom #settingsBtn:hover { background:#1e293b!important; color:#fff; }
    .side-bottom #logoutBtn { color:#fda4af!important; background:rgba(127,29,29,.16)!important; border:1px solid rgba(248,113,113,.12)!important; }
    .side-bottom #logoutBtn:hover { color:#fecdd3!important; background:rgba(127,29,29,.34)!important; }
    @media(max-width:1000px){ .sidebar { height:100dvh; max-height:100dvh; } }
  `;
  document.head.appendChild(style);

  function patch() {
    const logout = document.querySelector('#logoutBtn');
    if (logout && !logout.dataset.uiFixed) {
      logout.dataset.uiFixed = '1';
      logout.innerHTML = '<span aria-hidden="true">↪</span><span>Keluar</span>';
      logout.title = 'Keluar dari perangkat ini';
    }
    const settings = document.querySelector('#settingsBtn');
    if (settings && !settings.dataset.uiFixed) {
      settings.dataset.uiFixed = '1';
      settings.innerHTML = '<span aria-hidden="true">⚙</span><span>Pengaturan</span>';
    }
  }
  window.addEventListener('load', patch);
  new MutationObserver(patch).observe(document.body, {childList:true,subtree:true});
})();
