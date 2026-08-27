// Excel import for Disiplin Pro. Each worksheet represents one class.
(() => {
  const cfg = window.APP_CONFIG || {};
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey || !window.supabase) return;
  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  const $ = s => document.querySelector(s);
  const toast = msg => { const el=$('#toast'); if(!el)return; el.textContent=msg; el.classList.add('show'); clearTimeout(window.__dpExcelToast); window.__dpExcelToast=setTimeout(()=>el.classList.remove('show'),3500); };
  const clean=v=>v==null?'':String(v).trim();
  const normalize=v=>clean(v).toLowerCase().replace(/[.]/g,'').replace(/\s+/g,' ');
  const cell=(row,i)=>clean(row?.[i]);
  async function getSchoolId(){ const {data:{user}}=await sb.auth.getUser(); if(!user)throw new Error('Sesi login tidak ditemukan.'); const {data,error}=await sb.from('profiles').select('school_id').eq('id',user.id).single(); if(error||!data?.school_id)throw new Error('Sekolah akun belum ditemukan.'); return data.school_id; }
  function parseWorkbook(file){ if(!window.XLSX)throw new Error('Library Excel belum siap. Muat ulang halaman lalu coba lagi.'); return file.arrayBuffer().then(buf=>window.XLSX.read(buf,{type:'array',cellDates:false})); }
  function parseSheet(ws,className){
    const rows=window.XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:false});
    const homeroom=cell(rows[0],0); const headers=(rows[1]||[]).map(normalize);
    const expected=['no','nis','nama','nama orang tua','nomer telepon orang tua','keterangan']; const indexes={}; expected.forEach(h=>indexes[h]=headers.findIndex(x=>x===h));
    if(indexes.nama<0)throw new Error(`Sheet "${className}": kolom Nama tidak ditemukan pada baris 2.`);
    const students=[];
    for(let r=2;r<rows.length;r++){ const row=rows[r]||[]; const name=cell(row,indexes.nama); if(!name)continue; students.push({ nis:indexes.nis>=0?cell(row,indexes.nis):'', name, class_name:className, homeroom_teacher:homeroom, parent_name:indexes['nama orang tua']>=0?cell(row,indexes['nama orang tua']):'', parent_phone:indexes['nomer telepon orang tua']>=0?cell(row,indexes['nomer telepon orang tua']):'', notes:indexes.keterangan>=0?cell(row,indexes.keterangan):'' }); }
    if(!students.length)throw new Error(`Sheet "${className}": tidak ada siswa dengan Nama pada data.`); return students;
  }
  async function importWorkbook(file){
    const schoolId=await getSchoolId(); const wb=await parseWorkbook(file); if(!wb.SheetNames.length)throw new Error('File Excel tidak memiliki sheet.');
    const all=[]; for(const className of wb.SheetNames)all.push(...parseSheet(wb.Sheets[className],className));
    const payload=all.map(s=>({school_id:schoolId,nis:s.nis||null,name:s.name,class_name:s.class_name,homeroom_teacher:s.homeroom_teacher||null,parent_name:s.parent_name||null,parent_phone:s.parent_phone||null,notes:s.notes||null,status:'active'}));
    let inserted=0; const batchSize=100;
    for(let i=0;i<payload.length;i+=batchSize){ const batch=payload.slice(i,i+batchSize); const {error}=await sb.from('students').insert(batch); if(error)throw new Error(`Import berhenti pada batch ${Math.floor(i/batchSize)+1}: ${error.message}`); inserted+=batch.length; }
    return {sheets:wb.SheetNames.length,inserted};
  }
  function install(){ document.addEventListener('change',async e=>{ const input=e.target; if(!input||input.id!=='excelStudentImport')return; const file=input.files?.[0]; if(!file)return; if(!/\.(xlsx|xls)$/i.test(file.name)){toast('Pilih file Excel .xlsx atau .xls.');input.value='';return;} try{toast('Membaca Excel dan memproses semua sheet...');const result=await importWorkbook(file);toast(`Berhasil: ${result.inserted} siswa dari ${result.sheets} kelas diimpor dan berstatus aktif.`);input.value='';document.dispatchEvent(new CustomEvent('dp:students-imported',{detail:result}));}catch(err){console.error('[Disiplin Pro Excel]',err);toast(err?.message||'Import Excel gagal.');input.value='';} }); }
  window.DisiplinProExcelImport={importWorkbook}; if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
