// Final UI/data fix for Master Data, Master Siswa, and Catatan ordering.
(() => {
  const cfg = window.APP_CONFIG || {};
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey || !window.supabase) return;
  const db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  const $ = (s, r = document) => r.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const norm = v => String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  const toast = msg => { const t = $('#toast'); if (!t) return; t.textContent = msg; t.classList.add('show'); clearTimeout(window.__dpFinalToast); window.__dpFinalToast = setTimeout(() => t.classList.remove('show'), 3000); };
  let school = null;
  let busy = false;

  async function context() {
    if (school) return school;
    const { data: { user } } = await db.auth.getUser();
    if (!user) return null;
    const { data: p, error } = await db.from('profiles').select('school_id').eq('id', user.id).single();
    if (error || !p?.school_id) return null;
    const { data: s, error: se } = await db.from('schools').select('id,name,settings').eq('id', p.school_id).single();
    if (se || !s) return null;
    school = s;
    return s;
  }

  function currentTitle() { return ($('#pageTitle')?.textContent || '').trim(); }

  async function renderMasterData() {
    if (busy || currentTitle() !== 'Master Data') return;
    const s = await context(); if (!s) return;
    busy = true;
    try {
      const [a,b,c] = await Promise.all([
        db.from('achievement_types').select('*').eq('school_id', s.id).order('code'),
        db.from('sanction_levels').select('*').eq('school_id', s.id).order('level'),
        db.from('violation_types').select('*').eq('school_id', s.id).order('code')
      ]);
      if (a.error || b.error || c.error) throw (a.error || b.error || c.error);
      const achievements = a.data || [], sanctions = b.data || [], violations = c.data || [];
      const page = $('#page'); if (!page) return;
      page.innerHTML = `<div class="master-v2-stack">
        ${section('prestasi','🏆 Prestasi Siswa','Master prestasi yang dapat dicatat pada siswa.',achievements)}
        ${section('sanksi','🛡️ Sanksi','Master sanksi disiplin sekolah.',sanctions)}
        ${section('pelanggaran','⚠️ Pelanggaran','Master jenis pelanggaran dan poin disiplin. Bagian ini sengaja berada paling bawah.',violations)}
      </div>`;
      bindMaster(page);
    } catch (e) { console.error('[final-master-data-fix]', e); toast('Gagal memuat Master Data: ' + (e?.message || e)); }
    finally { busy = false; }
  }

  function section(key,title,desc,arr) {
    const rows = arr.map(x => key === 'sanksi' ? `<div class="master-v2-row"><div><b>Tingkat ${esc(x.level)}</b><div class="hint">${esc(x.action || '')}${x.executor ? ' · Pelaksana: '+esc(x.executor) : ''}</div></div><div class="master-v2-actions"><span class="badge neutral">${esc(x.points_from ?? 0)}${x.points_to != null ? '–'+esc(x.points_to) : ''} poin</span><button class="secondary master-final-edit" data-key="${key}" data-id="${esc(x.id)}">Edit</button><button class="danger master-final-delete" data-key="${key}" data-id="${esc(x.id)}">Hapus</button></div></div>` : `<div class="master-v2-row"><div><b>${esc(x.name)}</b><div class="hint">${esc(key==='pelanggaran' ? (x.category || 'Tanpa kategori') : (x.level || 'Umum'))} · ${esc(x.code || '')}</div></div><div class="master-v2-actions"><span class="badge ${key==='pelanggaran'?'bad':'good'}">${key==='pelanggaran'?'+':'−'}${Number(x.points || 0)} poin</span><button class="secondary master-final-edit" data-key="${key}" data-id="${esc(x.id)}">Edit</button><button class="danger master-final-delete" data-key="${key}" data-id="${esc(x.id)}">Hapus</button></div></div>`).join('');
    return `<section class="card master-v2-section master-v2-${key}"><div class="master-v2-head"><div><div class="eyebrow">MASTER DATA</div><h2>${title}</h2><p class="hint">${desc}</p></div><button class="primary master-final-add" data-key="${key}">＋ Tambah</button></div><div class="master-v2-count">${arr.length} data aktif</div><div class="master-v2-list">${rows || '<div class="empty">Belum ada data. Tambahkan data pertama.</div>'}</div></section>`;
  }

  function bindMaster(page) {
    page.querySelectorAll('.master-final-add').forEach(b => b.onclick = () => form(b.dataset.key));
    page.querySelectorAll('.master-final-edit').forEach(b => b.onclick = async () => { const row = await loadOne(b.dataset.key,b.dataset.id); if(row) form(b.dataset.key,row); });
    page.querySelectorAll('.master-final-delete').forEach(b => b.onclick = () => removeOne(b.dataset.key,b.dataset.id));
  }
  async function loadOne(key,id){ const s=await context(); const table=key==='prestasi'?'achievement_types':key==='sanksi'?'sanction_levels':'violation_types'; const {data,error}=await db.from(table).select('*').eq('school_id',s.id).eq('id',id).single(); if(error){toast(error.message);return null} return data; }
  function form(key,item=null) {
    const isS=key==='sanksi', isP=key==='prestasi';
    const title=isS?'Sanksi':isP?'Prestasi Siswa':'Pelanggaran';
    const html=`<form id="dpFinalMasterForm" class="form-grid">${isS?`<label>Tingkat<input name="level" type="number" min="1" required value="${esc(item?.level ?? '')}"></label><label>Poin mulai<input name="points_from" type="number" min="0" value="${esc(item?.points_from ?? 0)}"></label><label>Poin sampai<input name="points_to" type="number" min="0" value="${esc(item?.points_to ?? '')}"></label><label>Tindakan<input name="action" required value="${esc(item?.action ?? '')}"></label><label>Pelaksana<input name="executor" value="${esc(item?.executor ?? '')}"></label><label>Keterangan<input name="notes" value="${esc(item?.notes ?? '')}"></label>`:`<label>Kode<input name="code" required value="${esc(item?.code ?? '')}"></label><label>Nama<input name="name" required value="${esc(item?.name ?? '')}"></label><label>${isP?'Tingkat':'Kategori'}<input name="${isP?'level':'category'}" value="${esc(item?.[isP?'level':'category'] ?? '')}"></label><label>Poin<input name="points" type="number" min="0" step="0.01" value="${esc(item?.points ?? 0)}"></label><label class="full">Keterangan<input name="description" value="${esc(item?.description ?? '')}"></label>`}<div class="actions full"><button type="button" class="secondary" data-close>Batal</button><button class="primary">Simpan</button></div></form>`;
    const d=document.createElement('div'); d.id='modal'; d.className='modal'; d.innerHTML=`<div class="modal-box"><div class="modal-head"><h2>${item?'Edit':'Tambah'} ${title}</h2><button class="close" data-close>✕</button></div>${html}</div>`; document.querySelector('#modal')?.remove(); document.body.appendChild(d); d.querySelector('[data-close]').onclick=()=>d.remove();
    d.querySelector('form').onsubmit=async e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.target));Object.keys(data).forEach(k=>{if(data[k]==='')data[k]=null});const s=await context();const table=isP?'achievement_types':isS?'sanction_levels':'violation_types';data.school_id=s.id;if(isS){data.level=Number(data.level);data.points_from=Number(data.points_from||0);data.points_to=data.points_to==null?null:Number(data.points_to)}else data.points=Number(data.points||0);const q=item?db.from(table).update(data).eq('school_id',s.id).eq('id',item.id):db.from(table).insert(data);const{error}=await q;if(error){toast('Gagal menyimpan: '+error.message);return}d.remove();toast('Data berhasil disimpan.');renderMasterData()};
  }
  async function removeOne(key,id){if(!confirm('Hapus master ini? Data yang sudah dipakai histori dapat ditolak oleh database.'))return;const s=await context();const table=key==='prestasi'?'achievement_types':key==='sanksi'?'sanction_levels':'violation_types';const{error}=await db.from(table).delete().eq('school_id',s.id).eq('id',id);if(error){toast('Tidak bisa dihapus: '+error.message);return}toast('Data berhasil dihapus.');renderMasterData()}

  async function renderStudentClassBlock() {
    const title=currentTitle(); if (title !== 'Master Siswa' && title !== 'Data Siswa') return;
    const page=$('#page'); if(!page || page.querySelector('#dpFinalClassBlock')) return;
    const s=await context(); if(!s)return;
    const studentsRes=await db.from('students').select('id,name,nis,class_name,homeroom_teacher,status').eq('school_id',s.id).order('name').limit(5000); if(studentsRes.error)return;
    const students=studentsRes.data||[];
    const classes=Array.isArray(s.settings?.classes)?s.settings.classes.filter(x=>x?.name):[];
    const counts={}; students.filter(x=>x.status==='Aktif').forEach(x=>{if(x.class_name)counts[x.class_name]=(counts[x.class_name]||0)+1});
    const block=document.createElement('section');block.id='dpFinalClassBlock';block.className='card master-v2-class-section';
    block.innerHTML=`<div class="master-v2-head"><div><div class="eyebrow">MASTER SISWA</div><h2>Data Kelas & Wali Kelas</h2><p class="hint">Kelas berada di halaman Master Siswa agar data siswa, kelas, dan wali kelas terlihat dalam satu alur.</p></div><button class="primary" id="dpFinalAddClass">＋ Tambah kelas</button></div><div class="master-v2-class-grid">${classes.map((x,i)=>`<div class="master-v2-class-card"><div><b>${esc(x.name)}</b><span>${counts[x.name]||0} siswa aktif</span><small>Wali: ${esc(x.homeroom_teacher||x.wali_kelas||'Belum diisi')}</small></div><div><button class="secondary dp-final-edit-class" data-i="${i}">Edit</button><button class="danger dp-final-delete-class" data-i="${i}">Hapus</button></div></div>`).join('')||'<div class="empty">Belum ada data kelas. Import Excel atau tambahkan kelas.</div>'}</div>`;
    page.insertBefore(block,page.firstElementChild||null);
    block.querySelector('#dpFinalAddClass').onclick=()=>classForm(classes,-1,s);
    block.querySelectorAll('.dp-final-edit-class').forEach(b=>b.onclick=()=>classForm(classes,Number(b.dataset.i),s));
    block.querySelectorAll('.dp-final-delete-class').forEach(b=>b.onclick=()=>deleteClass(classes,Number(b.dataset.i),students,s));
  }
  function classForm(classes,index,s){const item=index>=0?classes[index]:null;const d=document.createElement('div');d.id='modal';d.className='modal';d.innerHTML=`<div class="modal-box"><div class="modal-head"><h2>${item?'Edit':'Tambah'} kelas</h2><button class="close" data-close>✕</button></div><form id="dpFinalClassForm" class="form-grid"><label>Nama kelas<input name="name" required value="${esc(item?.name??'')}"></label><label>Wali kelas<input name="homeroom_teacher" value="${esc(item?.homeroom_teacher??item?.wali_kelas??'')}"></label><div class="actions full"><button type="button" class="secondary" data-close>Batal</button><button class="primary">Simpan</button></div></form></div>`;document.querySelector('#modal')?.remove();document.body.appendChild(d);d.querySelector('[data-close]').onclick=()=>d.remove();d.querySelector('form').onsubmit=async e=>{e.preventDefault();const v=Object.fromEntries(new FormData(e.target));if(index>=0)classes[index]=v;else classes.push(v);const settings={...(s.settings||{}),classes};const{data,error}=await db.from('schools').update({settings}).eq('id',s.id).select('id,name,settings').single();if(error){toast('Gagal menyimpan kelas: '+error.message);return}school=data;d.remove();toast('Kelas berhasil disimpan.');document.dispatchEvent(new CustomEvent('dp:classes-changed'));renderStudentClassBlock()};}
  async function deleteClass(classes,index,students,s){const x=classes[index];if(students.some(v=>norm(v.class_name)===norm(x.name))){toast('Kelas masih digunakan siswa. Pindahkan siswa terlebih dahulu.');return}if(!confirm(`Hapus kelas ${x.name}?`))return;classes.splice(index,1);const settings={...(s.settings||{}),classes};const{data,error}=await db.from('schools').update({settings}).eq('id',s.id).select('id,name,settings').single();if(error){toast(error.message);return}school=data;toast('Kelas berhasil dihapus.');renderStudentClassBlock()}

  function observe() {
    let last='';
    const run=()=>{const t=currentTitle();if(t!==last){last=t;setTimeout(()=>{if(t==='Master Data')renderMasterData();if(t==='Master Siswa'||t==='Data Siswa')renderStudentClassBlock()},120)}};
    new MutationObserver(run).observe(document.body,{childList:true,subtree:true}); run();
  }
  window.addEventListener('load',()=>setTimeout(observe,400),{once:true});
  document.addEventListener('dp:students-imported',()=>setTimeout(renderStudentClassBlock,400));
  document.addEventListener('dp:master-data-changed',()=>setTimeout(renderMasterData,300));
})();
