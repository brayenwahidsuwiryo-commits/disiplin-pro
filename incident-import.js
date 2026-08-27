// Disiplin Pro incident importer.
// Matching key: student name + class, scoped to the currently authenticated school.
(() => {
  const cfg=window.APP_CONFIG||{};
  if(!cfg.supabaseUrl||!cfg.supabaseAnonKey||!window.supabase)return;
  const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey);
  const $=s=>document.querySelector(s);
  const toast=m=>{const t=$('#toast');if(!t)return;t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3500)};
  const clean=v=>v==null?'':String(v).trim();
  const norm=v=>clean(v).toLowerCase().replace(/\s+/g,' ');
  const date=v=>{if(v instanceof Date&&!isNaN(v))return v.toISOString().slice(0,10);const s=clean(v);if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;const m=s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);return m?`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`:''};
  async function context(){const{data:{user}}=await sb.auth.getUser();if(!user)throw Error('Sesi login tidak ditemukan.');const{data:p,error}=await sb.from('profiles').select('school_id').eq('id',user.id).single();if(error||!p?.school_id)throw Error('Sekolah akun belum ditemukan.');return p.school_id;}
  function rows(ws){return window.XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:false});}
  function parse(ws,sheet){const rs=rows(ws);const h=(rs[0]||[]).map(x=>norm(x));const keys=['no','nama','kelas','tanggal','jenis kejadian','poin','kategori','kronologi','pencatat'];const ix={};keys.forEach(k=>ix[k]=h.indexOf(k));if(ix.nama<0||ix.kelas<0||ix['jenis kejadian']<0)throw Error(`Sheet ${sheet}: header wajib Nama, Kelas, dan Jenis Kejadian tidak ditemukan.`);return rs.slice(1).map((r,i)=>({row:i+2,name:clean(r[ix.nama]),className:clean(r[ix.kelas]),eventDate:date(r[ix.tanggal]),item:clean(r[ix['jenis kejadian']]),points:clean(r[ix.poin]),category:clean(r[ix.kategori]),description:clean(r[ix.kronologi]),recordedBy:clean(r[ix.pencatat])})).filter(x=>x.name||x.item);}
  async function importFile(file){
    if(!window.XLSX)throw Error('Library Excel belum siap.');
    const schoolId=await context();const wb=window.XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true});
    const expected=['pelanggaran','prestasi','sangsi','sanksi'];const sheets=wb.SheetNames.filter(s=>expected.includes(norm(s)));if(!sheets.length)throw Error('Excel harus memiliki sheet Pelanggaran, Prestasi, dan Sangsi.');
    const[{data:students,error:se},{data:violations,error:ve},{data:achievements,error:ae},{data:sanctions,error:sa}]=await Promise.all([
      sb.from('students').select('id,name,class_name').eq('school_id',schoolId),sb.from('violation_types').select('*').eq('school_id',schoolId),sb.from('achievement_types').select('*').eq('school_id',schoolId),sb.from('sanction_levels').select('*').eq('school_id',schoolId)
    ]);if(se||ve||ae||sa)throw Error((se||ve||ae||sa).message);
    const studentMap=new Map((students||[]).map(s=>[`${norm(s.name)}|${norm(s.class_name)}`,s]));
    const master=(arr,name)=>arr.find(x=>norm(x.name)===norm(name));
    const all=[];const problems=[];
    for(const sheet of sheets){const type=norm(sheet)==='sangsi'?'sanksi':norm(sheet);for(const r of parse(wb.Sheets[sheet],sheet)){
      const st=studentMap.get(`${norm(r.name)}|${norm(r.className)}`);if(!st){problems.push(`Baris ${r.row} (${sheet}): siswa "${r.name}" + kelas "${r.className}" tidak ditemukan.`);continue;}
      const points=Number(String(r.points).replace(',','.'));if(!r.eventDate||isNaN(points)){problems.push(`Baris ${r.row} (${sheet}): tanggal atau poin tidak valid.`);continue;}
      if(type==='pelanggaran'){const v=master(violations,r.item);if(!v){problems.push(`Baris ${r.row}: pelanggaran "${r.item}" belum ada di Master Pelanggaran.`);continue;}if(r.category&&norm(v.category)!==norm(r.category)){problems.push(`Baris ${r.row}: kategori "${r.category}" tidak cocok dengan Master Pelanggaran untuk "${r.item}".`);continue;}all.push({school_id:schoolId,student_id:st.id,violation_type_id:v.id,achievement_type_id:null,event_date:r.eventDate,points:Math.abs(points),description:r.description||null,recorded_by_name:r.recordedBy||null,event_type:'pelanggaran'});
      }else if(type==='prestasi'){const a=master(achievements,r.item);if(!a){problems.push(`Baris ${r.row}: prestasi "${r.item}" belum ada di Master Prestasi.`);continue;}all.push({school_id:schoolId,student_id:st.id,violation_type_id:null,achievement_type_id:a.id,event_date:r.eventDate,points:-Math.abs(points),description:r.description||null,recorded_by_name:r.recordedBy||null,event_type:'prestasi'});
      }else{const s=(sanctions||[]).find(x=>norm(x.action)===norm(r.item));if(!s){problems.push(`Baris ${r.row}: sanksi "${r.item}" belum ada di Master Sanksi.`);continue;}all.push({school_id:schoolId,student_id:st.id,violation_type_id:null,achievement_type_id:null,sanction_level_id:s.id,event_date:r.eventDate,points:0,description:r.description||null,recorded_by_name:r.recordedBy||null,event_type:'sanksi'});}
    }}
    if(problems.length)throw Error(`Import dibatalkan. ${problems.length} baris perlu diperbaiki.\n\n${problems.slice(0,12).join('\n')}${problems.length>12?'\n...':''}`);
    for(let i=0;i<all.length;i+=100){const{error}=await sb.from('discipline_events').insert(all.slice(i,i+100));if(error)throw Error(error.message);}
    return{rows:all.length,sheets:sheets.length};
  }
  function template(){const wb=window.XLSX.utils.book_new();const h=['No.','Nama','Kelas','Tanggal','Jenis Kejadian','Poin','Kategori','Kronologi','Pencatat'];for(const n of ['Pelanggaran','Prestasi','Sangsi']){const ws=window.XLSX.utils.aoa_to_sheet([h,[1,'','','','',0,n==='Pelanggaran'?'':'','','']]);ws['!cols']=[{wch:8},{wch:28},{wch:18},{wch:14},{wch:30},{wch:10},{wch:18},{wch:45},{wch:25}];window.XLSX.utils.book_append_sheet(wb,ws,n)}window.XLSX.writeFile(wb,'Template_Import_Catatan_Disiplin_Pro.xlsx');}
  function install(){document.addEventListener('change',async e=>{if(e.target.id!=='incidentExcelImport')return;const f=e.target.files?.[0];if(!f)return;try{toast('Membaca 3 sheet dan mencocokkan siswa...');const r=await importFile(f);toast(`Berhasil mengimpor ${r.rows} catatan dari ${r.sheets} sheet.`);document.dispatchEvent(new CustomEvent('dp:incidents-imported',{detail:r}));}catch(err){console.error(err);toast(err.message||'Import gagal.');}e.target.value=''});document.addEventListener('click',e=>{if(e.target.id==='downloadIncidentTemplate')template()});}
  window.DisiplinProIncidentImport={importFile};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
