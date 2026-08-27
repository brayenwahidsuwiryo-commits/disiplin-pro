(() => {
  const cfg = window.APP_CONFIG || {};
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey || !window.supabase) return;
  if (window.__reportTemplateReferenceController) return;
  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  const $ = s => document.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>\"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));
  let rendering = false;
  async function school() {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw Error('Sesi login tidak ditemukan');
    const { data, error } = await sb.from('profiles').select('school_id').eq('id', user.id).single();
    if (error) throw error;
    if (!data?.school_id) throw Error('Sekolah akun tidak ditemukan');
    return data.school_id;
  }
  async function getTemplate(id) {
    const { data, error } = await sb.from('report_templates').select('*').eq('school_id', id).eq('is_default', true).maybeSingle();
    if (error) throw error;
    return data;
  }
  async function upload(file, id) {
    if (!file) return null;
    if (file.size > 10 * 1024 * 1024) throw Error('File template maksimal 10 MB.');
    const allowed = ['application/pdf','image/png','image/jpeg','image/webp'];
    if (!allowed.includes(file.type)) throw Error('Template harus PDF, PNG, JPG, atau WEBP.');
    const path = `${id}/report-template`;
    const { error } = await sb.storage.from('school-report-assets').upload(path, file, {contentType:file.type,upsert:true,cacheControl:'3600'});
    if (error) throw error;
    const { data, error: e } = await sb.storage.from('school-report-assets').createSignedUrl(path, 86400);
    if (e) throw e;
    return { url: data.signedUrl, type: file.type };
  }
  async function render() {
    if (rendering) return;
    const title = ($('#pageTitle')?.textContent || '').toLowerCase();
    if (!title.includes('template laporan')) return;
    const form = $('#reportTemplateForm');
    if (!form || form.querySelector('[data-template-reference]')) return;
    rendering = true;
    try {
      const id = await school();
      const t = await getTemplate(id);
      const currentForm = $('#reportTemplateForm');
      if (!currentForm || currentForm.querySelector('[data-template-reference]')) return;
      const wrap = document.createElement('section');
      wrap.className = 'card';
      wrap.dataset.templateReference = '1';
      wrap.style.marginTop = '16px';
      wrap.innerHTML = `<div class="eyebrow">ACUAN DESAIN</div><h3>Upload Template Laporan Sekolah</h3><p class="hint">Upload contoh kop/surat resmi sekolah (PDF atau gambar). File ini menjadi acuan visual saat menyusun laporan. Logo dan tanda tangan tetap dapat diunggah terpisah agar sistem bisa menempatkannya pada laporan.</p><input id="reportReferenceFile" type="file" accept="application/pdf,image/png,image/jpeg,image/webp"><div id="reportReferenceStatus" class="hint" style="margin-top:8px">${t?.template_file_url?'Template acuan sudah tersimpan.':''}</div><div id="reportReferencePreview" style="margin-top:12px"></div>`;
      currentForm.parentElement.appendChild(wrap);
      if (t?.template_file_url) {
        const p = wrap.querySelector('#reportReferencePreview');
        if (t.template_file_type?.startsWith('image/')) p.innerHTML = `<img src="${esc(t.template_file_url)}" alt="Template acuan" style="max-width:100%;max-height:420px;object-fit:contain;border:1px solid var(--line);border-radius:12px">`;
        else p.innerHTML = `<a class="secondary" href="${esc(t.template_file_url)}" target="_blank" rel="noopener noreferrer">Buka template PDF</a>`;
      }
      wrap.querySelector('#reportReferenceFile').onchange = async e => {
        try {
          const file = e.target.files?.[0];
          if (!file) return;
          wrap.querySelector('#reportReferenceStatus').textContent = 'Mengunggah template...';
          const uploaded = await upload(file, id);
          if (!uploaded) return;
          const payload = {template_file_url:uploaded.url,template_file_type:uploaded.type,updated_at:new Date().toISOString()};
          const query = t?.id ? sb.from('report_templates').update(payload).eq('id',t.id) : sb.from('report_templates').insert({school_id:id,name:'Template Utama',...payload,is_default:true});
          const { error } = await query;
          if (error) throw error;
          wrap.querySelector('#reportReferenceStatus').textContent = 'Template acuan berhasil disimpan.';
          const p = wrap.querySelector('#reportReferencePreview');
          if (file.type.startsWith('image/')) p.innerHTML = `<img src="${esc(uploaded.url)}" alt="Template acuan" style="max-width:100%;max-height:420px;object-fit:contain;border:1px solid var(--line);border-radius:12px">`;
          else p.innerHTML = `<a class="secondary" href="${esc(uploaded.url)}" target="_blank" rel="noopener noreferrer">Buka template PDF</a>`;
        } catch (err) { wrap.querySelector('#reportReferenceStatus').textContent = 'Gagal: ' + (err?.message || 'Terjadi kesalahan'); }
      };
    } catch (err) { console.error('report-template-reference:', err); }
    finally { rendering = false; }
  }
  function schedule() { clearTimeout(window.__rtReferenceTimer); window.__rtReferenceTimer = setTimeout(render,120); }
  window.__reportTemplateReferenceController = {render:schedule};
  window.addEventListener('load', () => { schedule(); new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true}); }, {once:true});
})();
