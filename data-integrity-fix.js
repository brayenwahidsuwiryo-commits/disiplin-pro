(() => {
  const cfg = window.APP_CONFIG || {};
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey || !window.supabase) return;
  const db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  const clean = v => String(v ?? '').trim();
  const norm = v => clean(v).toLowerCase().replace(/\s+/g, ' ');
  const toast = msg => { const t=document.querySelector('#toast'); if(!t)return; t.textContent=msg; t.classList.add('show'); clearTimeout(window.__dpIntegrityToast); window.__dpIntegrityToast=setTimeout(()=>t.classList.remove('show'),4200); };
  async function schoolId(){ const {data:{user}}=await db.auth.getUser(); if(!user) throw Error('Sesi login tidak ditemukan.'); const {data,error}=await db.from('profiles').select('school_id').eq('id',user.id).single(); if(error||!data?.school_id) throw Error('Sekolah akun belum ditemukan.'); return data.school_id; }
  async function syncClasses(){
    const sid=await schoolId();
    const {data:students,error}=await db.from('students').select('class_name,homeroom_teacher').eq('school_id',sid).not('class_name','is',null);
    if(error) throw error;
    const {data:school,error:se}=await db.from('schools').select('settings').eq('id',sid).single(); if(se) throw se;
    const settings={...(school?.settings||{})}; const current=Array.isArray(settings.classes)?settings.classes:[]; const map=new Map(current.map(c=>[norm(c?.name),{name:clean(c?.name),homeroom_teacher:clean(c?.homeroom_teacher||'')}]).filter(([k])=>k));
    (students||[]).forEach(s=>{const name=clean(s.class_name);if(!name)return;const k=norm(name),old=map.get(k)||{name,homeroom_teacher:''};if(clean(s.homeroom_teacher))old.homeroom_teacher=clean(s.homeroom_teacher);map.set(k,old)});
    settings.classes=[...map.values()].sort((a,b)=>a.name.localeCompare(b.name,'id'));
    const {error:ue}=await db.from('schools').update({settings}).eq('id',sid); if(ue) throw ue;
    return settings.classes.length;
  }
  async function ensureCategory(sid,name){
    name=clean(name)||'Lain-lain'; const {data,error}=await db.from('violation_categories').select('*').eq('school_id',sid).ilike('name',name).limit(1); if(error)throw error; if(data?.[0])return data[0];
    const {data:created,error:ce}=await db.from('violation_categories').insert({school_id:sid,name,points_from:0,points_to:null,active:true}).select().single(); if(ce)throw ce; return created;
  }
  async function ensureViolation(sid,name,category,points){
    name=clean(name); if(!name)return null; const {data,error}=await db.from('violation_types').select('*').eq('school_id',sid).ilike('name',name).limit(1); if(error)throw error; if(data?.[0])return data[0];
    const cat=await ensureCategory(sid,category); const code='IMP-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,7).toUpperCase(); const {data:created,error:ce}=await db.from('violation_types').insert({school_id:sid,code,name,category:cat.name,points:Number.isFinite(points)?Math.abs(points):0,description:'Dibuat otomatis dari import Excel',active:true}).select().single(); if(ce)throw ce; return created;
  }
  async function importIncidents(file){
    if(!window.XLSX)throw Error('Library Excel belum siap.'); const sid=await schoolId(); const wb=window.XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true}); const names=wb.SheetNames.map(s=>({raw:s,norm:norm(s)})); const sheets=names.filter(x=>['pelanggaran','prestasi','sangsi','sanksi'].includes(x.norm)); if(!sheets.length)throw Error('Sheet Pelanggaran/Prestasi/Sangsi tidak ditemukan.');
    const {data:students,error:se}=await db.from('students').select('id,name,class_name').eq('school_id',sid); if(se)throw se; const sm=new Map((students||[]).map(s=>[norm(s.name)+'|'+norm(s.class_name),s]));
    const {data:achievements,error:ae}=await db.from('achievement_types').select('*').eq('school_id',sid); if(ae)throw ae; const {data:sanctions,error:sne}=await db.from('sanction_levels').select('*').eq('school_id',sid); if(sne)throw sne;
    const rows=[];
    for(const sh of sheets){ const type=sh.norm==='pelanggaran'?'pelanggaran':(sh.norm==='prestasi'?'prestasi':'sanksi'); const rs=window.XLSX.utils.sheet_to_json(wb.Sheets[sh.raw],{header:1,defval:'',raw:false}); const h=(rs[0]||[]).map(norm); const ix=k=>h.indexOf(k); const ni=ix('nama'),ki=ix('kelas'),di=ix('tanggal'),ii=ix('jenis kejadian'),pi=ix('poin'),ci=ix('kategori'),xi=ix('kronologi'),ri=ix('pencatat'); if(ni<0||ki<0||ii<0)throw Error(`Sheet ${sh.raw}: wajib ada kolom Nama, Kelas, Jenis Kejadian.`);
      for(let r=1;r<rs.length;r++){const row=rs[r]||[],name=clean(row[ni]),cl=clean(row[ki]),item=clean(row[ii]);if(!name&&!item)continue;const st=sm.get(norm(name)+'|'+norm(cl));if(!st)throw Error(`Baris ${r+1} (${sh.raw}): siswa ${name} dengan kelas ${cl} tidak ditemukan.`);let points=Number(String(row[pi]??'').replace(',','.'));if(!Number.isFinite(points))points=0;let eventDate=clean(row[di]);if(/^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}$/.test(eventDate)){const m=eventDate.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);eventDate=`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;}if(!eventDate)eventDate=new Date().toISOString().slice(0,10);
        if(type==='pelanggaran'){const v=await ensureViolation(sid,item,clean(row[ci]),points);rows.push({school_id:sid,student_id:st.id,violation_type_id:v.id,achievement_type_id:null,sanction_level_id:null,event_date:eventDate,points:Math.abs(points),description:clean(row[xi])||null,recorded_by_name:clean(row[ri])||null,event_type:'pelanggaran'});}
        else if(type==='prestasi'){const a=(achievements||[]).find(x=>norm(x.name)===norm(item));if(!a)throw Error(`Baris ${r+1}: prestasi ${item} belum ada di Master Prestasi.`);rows.push({school_id:sid,student_id:st.id,violation_type_id:null,achievement_type_id:a.id,sanction_level_id:null,event_date:eventDate,points:-Math.abs(points),description:clean(row[xi])||null,recorded_by_name:clean(row[ri])||null,event_type:'prestasi'});}
        else {const s=(sanctions||[]).find(x=>norm(x.action)===norm(item));if(!s)throw Error(`Baris ${r+1}: sanksi ${item} belum ada di Master Sanksi.`);rows.push({school_id:sid,student_id:st.id,violation_type_id:null,achievement_type_id:null,sanction_level_id:s.id,event_date:eventDate,points:0,description:clean(row[xi])||null,recorded_by_name:clean(row[ri])||null,event_type:'sanksi'});}
      }
    }
    for(let i=0;i<rows.length;i+=100){const {error}=await db.from('discipline_events').insert(rows.slice(i,i+100));if(error)throw error;} return rows.length;
  }
  document.addEventListener('dp:students-imported',async()=>{try{const n=await syncClasses();toast(`Import siswa selesai. ${n} kelas/wali kelas disinkronkan ke Master Kelas.`);document.body.appendChild(document.createComment('classes-synced'));}catch(e){console.error(e);toast('Siswa masuk, tetapi sinkronisasi Master Kelas gagal: '+e.message);}},false);
  document.addEventListener('change',async e=>{if(e.target?.id!=='incidentExcelImport')return;e.stopImmediatePropagation();e.preventDefault();const f=e.target.files?.[0];if(!f)return;try{toast('Mengimpor catatan dan membuat master pelanggaran/kategori yang belum ada...');const n=await importIncidents(f);toast(`Berhasil: ${n} catatan masuk. Master pelanggaran/kategori otomatis disesuaikan.`);document.dispatchEvent(new CustomEvent('dp:incidents-imported',{detail:{rows:n}}));document.body.appendChild(document.createComment('incidents-synced'));}catch(err){console.error(err);toast(err?.message||'Import catatan gagal.')}finally{e.target.value=''}},true);
  window.DisiplinProIntegrity={syncClasses,importIncidents};
  window.addEventListener('load',async()=>{try{await syncClasses()}catch(e){console.debug('initial class sync skipped',e)}},{once:true});
})();
