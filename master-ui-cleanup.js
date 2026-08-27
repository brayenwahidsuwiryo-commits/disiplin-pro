(() => {
  function cleanCodes(root=document){
    root.querySelectorAll('input[name="code"]').forEach(i=>{const l=i.closest('label');if(l)l.remove();});
    root.querySelectorAll('option').forEach(o=>{o.textContent=o.textContent.replace(/^\s*(null|undefined|P-\d+)\s*[·•-]\s*/i,'');});
    root.querySelectorAll('.kpi-line span:first-child').forEach(s=>{s.childNodes.forEach(n=>{if(n.nodeType===3)n.textContent=n.textContent.replace(/^\s*(null|undefined|P-\d+)\s*[·•-]\s*/i,'')})});
  }
  function fixPage(){const p=document.querySelector('#page');if(!p)return;cleanCodes(p);const title=(document.querySelector('#pageTitle')?.textContent||'').toLowerCase();if(title.includes('dashboard')&&!p.textContent.trim()){p.innerHTML='<div class="card"><div class="empty">Dashboard sedang memuat data…</div></div>';} }
  const mo=new MutationObserver(()=>{clearTimeout(window.__masterCleanTimer);window.__masterCleanTimer=setTimeout(fixPage,50)});window.addEventListener('load',()=>{fixPage();mo.observe(document.body,{childList:true,subtree:true})});
})();
