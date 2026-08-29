(() => {
  const cfg = window.APP_CONFIG || {};
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey || !window.supabase) return;
  const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  const $ = (s, r = document) => r.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const toast = msg => { const t = $('#toast'); if (!t) return; t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2800); };
  let ctx = null;

  async function getCtx() {
    if (ctx) return ctx;
    const { data: { user } } = await client.auth.getUser();
    if (!user) return null;
    const { data: profile, error } = await client.from('profiles').select('*,schools(*)').eq('id', user.id).single();
    if (error || !profile?.schools) return null;
    ctx = { user, profile, school: profile.schools };
    return ctx;
  }

  function modal(title, html) {
    document.querySelector('#modal')?.remove();
    const d = document.createElement('div'); d.id = 'modal'; d.className = 'modal';
    d.innerHTML = `<div class="modal-box"><div class="modal-head"><h2>${esc(title)}</h2><button class="close" data-close>✕</button></div>${html}</div>`;
    document.body.appendChild(d);
    d.querySelectorAll('[data-close]').forEach(x => x.onclick = () => d.remove());
    return d;
  }

  async function renderMasters() {
    const c = await getCtx(); if (!c) return;
    const [v, a, s] = await Promise.all([
      client.from('violation_types').select('*').order('code'),
      client.from('achievement_types').select('*').order('code'),
      client.from('sanction_levels').select('*').order('level')
    ]);
    if (v.error || a.error || s.error) { toast((v.error || a.error || s.error).message); return; }
    const violations = v.data || [], achievements = a.data || [], sanctions = s.data || [];
    const page = $('#page'); if (!page) return;
    page.innerHTML = `
      <div class="master-v2-stack">
        ${masterSection('prestasi','Prestasi Siswa','Master jenis prestasi yang dapat dicatat pada siswa.',achievements)}
        ${masterSection('sanksi','Sanksi','Master tingkatan dan tindakan sanksi disiplin.',sanctions)}
        ${masterSection('pelanggaran','Pelanggaran','Master jenis pelanggaran, kategori, dan poin disiplin.',violations)}
      </div>`;
    page.querySelectorAll('.master-v2-add').forEach(b => b.onclick = () => masterForm(b.dataset.key));
    page.querySelectorAll('.master-v2-edit').forEach(b => b.onclick = () => masterForm(b.dataset.key, JSON.parse(b.dataset.item)));
    page.querySelectorAll('.master-v2-delete').forEach(b => b.onclick = () => deleteMaster(b.dataset.key, b.dataset.id));
  }

  function masterSection(key, title, desc, arr) {
    const rows = arr.map(x => key === 'sanksi' ? `
      <div class="master-v2-row"><div><b>Tingkat ${esc(x.level)}</b><div class="hint">${esc(x.action)}${x.executor ? ' · Pelaksana: '+esc(x.executor) : ''}</div></div><div class="master-v2-actions"><span class="badge neutral">${x.points_from ?? 0}${x.points_to != null ? '–'+x.points_to : ''} poin</span>${editBtn(key,x)}${delBtn(key,x.id)}</div></div>` : `
      <div class="master-v2-row"><div><b>${esc(x.name)}</b><div class="hint">${key==='pelanggaran' ? (esc(x.category || 'Tanpa kategori')+' · '+esc(x.code || '')) : (esc(x.level || 'Umum')+' · '+esc(x.code || ''))}</div></div><div class="master-v2-actions"><span class="badge ${key==='pelanggaran'?'bad':'good'}">${key==='pelanggaran'?'+':'−'}${Number(x.points || 0)} poin</span>${editBtn(key,x)}${delBtn(key,x.id)}</div></div>`).join('');
    return `<section class="card master-v2-section master-v2-${key}"><div class="master-v2-head"><div><div class="eyebrow">MASTER DATA</div><h2>${title}</h2><p class="hint">${desc}</p></div><button class="primary master-v2-add" data-key="${key}">＋ Tambah ${title.replace('Siswa','')}</button></div><div class="master-v2-count">${arr.length} data aktif</div><div class="master-v2-list">${rows || '<div class="empty">Belum ada data. Tambahkan data pertama.</div>'}</div></section>`;
  }
  function editBtn(key,x){return `<button class="secondary master-v2-edit" data-key="${key}" data-item='${esc(JSON.stringify(x))}'>Edit</button>`;}
  function delBtn(key,id){return `<button class="danger master-v2-delete" data-key="${key}" data-id="${id}">Hapus</button>`;}

  function masterForm(key,item=null) {
    const title = key==='pelanggaran'?'Pelanggaran':key==='prestasi'?'Prestasi Siswa':'Sanksi';
    const isS = key==='sanksi';
    modal(item ? `Edit ${title}` : `Tambah ${title}`, `<form id="masterV2Form" class="form-grid">${isS ? `
      <label>Tingkat<input name="level" type="number" min="1" required value="${esc(item?.level)}"></label>
      <label>Poin mulai<input name="points_from" type="number" min="0" required value="${esc(item?.points_from ?? 0)}"></label>
      <label>Poin sampai<input name="points_to" type="number" min="0" value="${esc(item?.points_to)}"></label>
      <label>Tindakan<input name="action" required value="${esc(item?.action)}"></label>
      <label>Pelaksana<input name="executor" value="${esc(item?.executor)}"></label>
      <label>Keterangan<input name="notes" value="${esc(item?.notes)}"></label>` : `
      <label>Kode<input name="code" required value="${esc(item?.code)}"></label>
      <label>Nama<input name="name" required value="${esc(item?.name)}"></label>
      <label>${key==='pelanggaran'?'Kategori':'Tingkat'}<input name="${key==='pelanggaran'?'category':'level'}" value="${esc(item?.[key==='pelanggaran'?'category':'level'])}"></label>
      <label>Poin<input name="points" type="number" min="0" step="0.01" required value="${esc(item?.points ?? 0)}"></label>
      <label class="full">Keterangan<input name="description" value="${esc(item?.description)}"></label>`}<div class="actions full"><button type="button" class="secondary" data-close>Batal</button><button class="primary">Simpan</button></div></form>`);
    $('#masterV2Form').onsubmit = async e => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(e.target));
      Object.keys(d).forEach(k => { if (d[k] === '') d[k] = null; });
      if (isS) { d.level=Number(d.level); d.points_from=Number(d.points_from); d.points_to=d.points_to==null?null:Number(d.points_to); }
      else d.points=Number(d.points);
      const table = key==='pelanggaran'?'violation_types':key==='prestasi'?'achievement_types':'sanction_levels';
      const payload = {...d, school_id:candidateSchoolId()};
      const result = item ? await client.from(table).update(payload).eq('id',item.id) : await client.from(table).insert(payload);
      if (result.error) { toast('Gagal menyimpan: '+result.error.message); return; }
      document.querySelector('#modal')?.remove(); toast('Data berhasil disimpan.'); await renderMasters();
    };
  }
  function candidateSchoolId(){ return ctx?.school?.id; }
  async function deleteMaster(key,id){
    const table = key==='pelanggaran'?'violation_types':key==='prestasi'?'achievement_types':'sanction_levels';
    if (!confirm(`Hapus master ${key}? Jika sudah dipakai histori, sistem database dapat menolak penghapusan.`)) return;
    const {error} = await client.from(table).delete().eq('id',id);
    if(error){toast('Tidak bisa dihapus: '+error.message);return;}
    toast('Data berhasil dihapus.'); await renderMasters();
  }

  async function renderStudentClasses() {
    const c = await getCtx(); if (!c) return;
    const studentsRes = await client.from('students').select('id,nis,name,class_name,homeroom_teacher,status').order('name').limit(5000);
    if (studentsRes.error) return;
    const students = studentsRes.data || [];
    const classes = Array.isArray(c.school.settings?.classes) ? c.school.settings.classes.filter(x=>x?.name) : [];
    const counts = {}; students.filter(s=>s.status==='Aktif').forEach(s=>{ if(s.class_name) counts[s.class_name]=(counts[s.class_name]||0)+1; });
    const host = document.createElement('section'); host.className='card master-v2-class-section';
    host.innerHTML = `<div class="master-v2-head"><div><div class="eyebrow">STRUKTUR SISWA</div><h2>Data Kelas & Wali Kelas</h2><p class="hint">Kelas dikelola dari halaman Master Siswa agar hubungan siswa, kelas, dan wali kelas terlihat dalam satu tempat.</p></div><button class="primary" id="masterV2AddClass">＋ Tambah kelas</button></div><div class="master-v2-class-grid">${classes.map((x,i)=>`<div class="master-v2-class-card"><div><b>${esc(x.name)}</b><span>${counts[x.name]||0} siswa aktif</span><small>Wali: ${esc(x.homeroom_teacher||'Belum diisi')}</small></div><div><button class="secondary master-v2-edit-class" data-i="${i}">Edit</button><button class="danger master-v2-delete-class" data-i="${i}">Hapus</button></div></div>`).join('') || '<div class="empty">Belum ada master kelas.</div>'}</div>`;
    $('#page')?.appendChild(host);
    host.querySelector('#masterV2AddClass').onclick=()=>classForm(classes,-1,c);
    host.querySelectorAll('.master-v2-edit-class').forEach(b=>b.onclick=()=>classForm(classes,Number(b.dataset.i),c));
    host.querySelectorAll('.master-v2-delete-class').forEach(b=>b.onclick=()=>deleteClass(classes,Number(b.dataset.i),students,c));
  }
  function classForm(classes,index,c){
    const item=index>=0?classes[index]:null;
    modal(item?'Edit kelas':'Tambah kelas',`<form id="classV2Form" class="form-grid"><label>Nama kelas<input name="name" required value="${esc(item?.name)}"></label><label>Wali kelas<input name="homeroom_teacher" value="${esc(item?.homeroom_teacher)}"></label><div class="actions full"><button type="button" class="secondary" data-close>Batal</button><button class="primary">Simpan</button></div></form>`);
    $('#classV2Form').onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));if(index>=0)classes[index]=d;else classes.push(d);const settings={...(c.school.settings||{}),classes};const{data,error}=await client.from('schools').update({settings}).eq('id',c.school.id).select().single();if(error){toast('Gagal menyimpan kelas: '+error.message);return;}c.school=data;document.querySelector('#modal')?.remove();toast('Kelas berhasil disimpan.');await refreshStudentsPage();};
  }
  async function deleteClass(classes,index,students,c){const x=classes[index];if(students.some(s=>s.class_name===x.name)){toast('Kelas tidak dapat dihapus karena masih digunakan siswa. Pindahkan siswa terlebih dahulu.');return;}if(!confirm(`Hapus kelas ${x.name}?`))return;classes.splice(index,1);const settings={...(c.school.settings||{}),classes};const{data,error}=await client.from('schools').update({settings}).eq('id',c.school.id).select().single();if(error){toast(error.message);return;}c.school=data;toast('Kelas berhasil dihapus.');await refreshStudentsPage();}
  async function refreshStudentsPage(){
    const page=$('#page'); if(!page)return;
    const table=page.querySelector('#studentTable');
    if(table) { const search=page.querySelector('#studentSearch'); const status=page.querySelector('#studentStatus'); table.innerHTML='<div class="empty">Memuat data siswa...</div>'; const c=await getCtx(); const {data}=await client.from('students').select('*').order('name').limit(5000); const list=(data||[]).filter(s=>(!status?.value||s.status===status.value)&&[s.nis,s.name,s.class_name,s.homeroom_teacher,s.parent_name].join(' ').toLowerCase().includes((search?.value||'').toLowerCase())); table.innerHTML=list.length?`<div class="table-wrap"><table class="data-table"><thead><tr><th>NIS</th><th>Nama</th><th>Kelas</th><th>Wali Kelas</th><th>Orang Tua/Wali</th><th>Status</th></tr></thead><tbody>${list.map(s=>`<tr><td>${esc(s.nis)}</td><td><b>${esc(s.name)}</b></td><td>${esc(s.class_name)}</td><td>${esc(s.homeroom_teacher)}</td><td>${esc(s.parent_name)}<br><span class="hint">${esc(s.parent_phone)}</span></td><td><span class="badge ${s.status==='Aktif'?'good':'neutral'}">${esc(s.status)}</span></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Tidak ada data siswa.</div>'; }
    await renderStudentClasses();
  }

  let lastTitle='';
  const observer=new MutationObserver(()=>{
    const title=($('#pageTitle')?.textContent||'').trim();
    if(title===lastTitle)return;
    lastTitle=title;
    if(title==='Master Data') setTimeout(renderMasters,0);
    if(title==='Master Siswa') setTimeout(refreshStudentsPage,0);
  });
  window.addEventListener('load',()=>observer.observe(document.body,{childList:true,subtree:true}));
})();
