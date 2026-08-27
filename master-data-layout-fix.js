(() => {
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  function fixMasterPage(){
    const page = $('#page');
    const title = ($('#pageTitle')?.textContent || '').toLowerCase();
    if (!page || !title.includes('master data')) return;
    const manager = $('.dp-vc-manager', page);
    if (!manager) return;
    const classCard = [...page.children].find(el => el.classList.contains('card') && /master kelas/i.test(el.textContent || ''));
    const legacyGrid = [...page.children].find(el => el.classList.contains('grid') && el.classList.contains('three'));
    if (classCard && classCard.nextElementSibling !== manager) classCard.after(manager);
    if (legacyGrid){
      // The legacy grid contains Prestasi and Sanksi. Keep those sections, but place them below Pelanggaran.
      const cards = [...legacyGrid.children];
      cards.forEach(card => {
        const text=(card.textContent||'').toLowerCase();
        if (/prestasi|sanksi/.test(text)) card.classList.add('dp-legacy-master-section');
        else card.remove();
      });
      if (manager.nextElementSibling !== legacyGrid) manager.after(legacyGrid);
      legacyGrid.classList.add('dp-master-secondary-list');
    }
    // Keep all violation item actions compact on every rerender.
    $$('.vc-item', page).forEach(item => item.classList.add('dp-vc-row'));
    $$('.vc-item-name', page).forEach(name => name.setAttribute('title', name.textContent.trim()));
  }
  let timer;
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(fixMasterPage,80)};
  const mo=new MutationObserver(schedule);
  window.addEventListener('load',()=>{schedule();mo.observe(document.body,{childList:true,subtree:true})});
})();
