(() => {
  function closeSidebar(){document.querySelector('#sidebar')?.classList.remove('open');}
  function bind(){document.querySelectorAll('[data-report-template], [data-page="dashboard"]').forEach(b=>{if(b.dataset.navCloseBound)return;b.dataset.navCloseBound='1';b.addEventListener('click',closeSidebar,{capture:true})});}
  const mo=new MutationObserver(bind);window.addEventListener('load',()=>{bind();mo.observe(document.body,{childList:true,subtree:true})});
})();
