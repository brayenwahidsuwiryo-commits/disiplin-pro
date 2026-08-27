(() => {
  const $ = (s,r=document)=>r.querySelector(s);
  const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
  function closeMobileNav(){ $('#sidebar')?.classList.remove('open'); document.body.classList.remove('sidebar-open'); }
  // Any navigation item, including dynamically injected document items, closes the mobile drawer.
  document.addEventListener('click', e => {
    const b=e.target.closest('[data-page],[data-report-template]');
    if(b) closeMobileNav();
  }, true);

  function normalize(s){return String(s??'').trim().toLowerCase().replace(/\s+/g,' ')}
  function installPointCategoryBehavior(){
    // Existing event forms can have either a native select or generated controls. Hide category input for violation entry.
    const forms=$$('form');
    forms.forEach(form=>{
      const text=(form.textContent||'').toLowerCase();
      if(!text.includes('pelanggaran')) return;
      $$('label',form).forEach(label=>{
        const t=(label.textContent||'').toLowerCase();
        if(t.includes('kategori') && !t.includes('kategori pelanggaran')) label.style.display='none';
      });
    });
  }
  // Keep UI category derived from the selected points. The database RPC is authoritative on save.
  window.DisiplinProCategory = {
    forPoints(points){
      const cats=(window.__dpViolationCategories||[]).filter(c=>c.active!==false);
      const p=Number(points);
      return cats.find(c=>p>=Number(c.points_from)&&p<=Number(c.points_to))?.name || '';
    }
  };
  const mo=new MutationObserver(installPointCategoryBehavior);
  window.addEventListener('load',()=>{installPointCategoryBehavior();mo.observe(document.body,{childList:true,subtree:true});});
})();
