(() => {
  function closeMobileNav(){document.querySelector('#sidebar')?.classList.remove('open');document.body.classList.remove('sidebar-open');}
  document.addEventListener('click',e=>{const b=e.target.closest('[data-page],[data-report-template]');if(b)closeMobileNav()},true);
})();
