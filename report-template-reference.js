(() => {
  const cfg=window.APP_CONFIG||{};
  if(!cfg.supabaseUrl||!cfg.supabaseAnonKey||!window.supabase||window.__reportTemplateReferenceController)return;
  const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey);
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));
  let busy=false;
  async function school(){const{data:{user}}=await sb.auth.getUser();if(!user)throw Error('Sesi login tidak ditemukan');const{data,error}=await sb.from('profiles').select('school_id').eq('id',user.id).single();if(error)throw error;return data.school_id}
  async function render(){
    if(busy)return;const title=($('#pageTitle')?.textContent||'').toLowerCase();if(!title.includes('template laporan'))return;
    const form=$('#reportTemplateForm');if(!form||form.parentElement?.querySelector('[data-template-reference]'))return;
    busy=true;try{const id=await school();const{data:t,error}=await sb.from('report_templates').select('*').eq('school_id',id).eq('is_default',true).maybeSingle();if(error)throw error;
      const current=$('#reportTemplateForm');if(!current||current.parentElement?.querySelector('[data-template-reference]'))return;
      const wrap=document.createElement('section');wrap.className='card';wrap.dataset.templateReference='1';wrap.style.marginTop='16px';
      wrap.innerHTML=`<div class="eyebrow">ACUAN DESAIN</div><h3>Upload Template Laporan Sekolah</h3><p class="hint">Upload contoh kop/surat resmi sekolah (PDF atau gambar). Template ini disimpan sebagai acuan visual dan tidak akan membuat kartu berulang.</p><input id="reportReferenceFile" type="file" accept="application/pdf,image/png,image/jpeg,image/webp"><div id="reportReferenceStatus" class="hint" style="margin-top:8px">${t?.template_file_url?'Template acuan sudah tersimpan.':''}</div><div id="reportReferencePreview" style="margin-top:12px"></div>`;
      current.parentElement.appendChild(wrap);
      const p=wrap.querySelector('#reportReferencePreview');if(t?.template_file_url){p.innerHTML=t.template_file_type?.startsWith('image/')?`<img src="${esc(t.template_file_url)}" alt="Template acuan" style="max-width:100%;max-height:420px;object-fit:contain;border:1px solid var(--line);border-radius:12px">`:`<a class="secondary" href="${esc(t.template_file_url)}" target="_blank" rel="noopener noreferrer">Buka template PDF</a>`;}
      wrap.querySelector('#reportReferenceFile').onchange=async e=>{try{const file=e.target.files?.[0];if(!file)return;if(file.size>10*1024*1024)throw Error('File template maksimal 10 MB.');if(!['application/pdf','image/png','image/jpeg','image/webp'].includes(file.type))throw Error('Template harus PDF, PNG, JPG, atau WEBP.');wrap.querySelector('#reportReferenceStatus').textContent='Mengunggah template...';const path=`${id}/report-template`;const{error:ue}=await sb.storage.from('school-report-assets').upload(path,file,{contentType:file.type,upsert:true,cacheControl:'3600'});if(ue)throw ue;const{data:signed,error:se}=await sb.storage.from('school-report-assets').createSignedUrl(path,86400);if(se)throw se;const payload={template_file_url:signed.signedUrl,template_file_type:file.type,updated_at:new Date().toISOString()};const q=t?.id?sb.from('report_templates').update(payload).eq('id',t.id):sb.from('report_templates').insert({school_id:id,name:'Template Utama',...payload,is_default:true});const{error}=await q;if(error)throw error;wrap.querySelector('#reportReferenceStatus').textContent='Template acuan berhasil disimpan.';p.innerHTML=file.type.startsWith('image/')?`<img src="${esc(signed.signedUrl)}" alt="Template acuan" style="max-width:100%;max-height:420px;object-fit:contain;border:1px solid var(--line);border-radius:12px">`:`<a class="secondary" href="${esc(signed.signedUrl)}" target="_blank" rel="noopener noreferrer">Buka template PDF</a>`;}catch(err){wrap.querySelector('#reportReferenceStatus').textContent='Gagal: '+(err?.message||'Terjadi kesalahan')}finally{e.target.value=''}};
    }catch(e){console.error('report-template-reference',e)}finally{busy=false}
  }
  window.__reportTemplateReferenceController={render:()=>setTimeout(render,120)};
  window.addEventListener('load',()=>setTimeout(render,250),{once:true});
})();
