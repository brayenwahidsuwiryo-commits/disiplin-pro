(() => {
  const cfg = window.APP_CONFIG || {};
  if (!window.supabase || !cfg.supabaseUrl || !cfg.supabaseAnonKey) return;
  const db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  const $ = (s, r=document) => r.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const num = v => Number(v || 0);
  const fmt = v => new Intl.NumberFormat('id-ID').format(num(v));
  const pct = v => `${num(v).toFixed(1)}%`;
  const cleanPhone = raw => {
    let p = String(raw || '').replace(/[^0-9]/g, '');
    if (p.startsWith('0')) p = '62' + p.slice(1);
    if (p.startsWith('8')) p = '62' + p;
    return p;
  };
  const waText = (s, type='pemberitahuan') => {
    const name = s?.name || 'siswa';
    const cls = s?.class_name ? ` kelas ${s.class_name}` : '';
    if (type === 'panggilan') return `Assalamu'alaikum Bapak/Ibu orang tua/wali dari ${name}${cls}. Kami dari sekolah ingin menyampaikan pemberitahuan dan mengundang Bapak/Ibu untuk berkomunikasi terkait perkembangan siswa. Mohon kesediaannya untuk membalas pesan ini. Terima kasih.`;
    return `Assalamu'alaikum Bapak/Ibu orang tua/wali dari ${name}${cls}. Kami dari sekolah ingin menyampaikan pemberitahuan terkait perkembangan dan kedisiplinan siswa. Mohon berkenan berkomunikasi dengan pihak sekolah melalui WhatsApp ini. Terima kasih.`;
  };
  const waLink = (s, type='pemberitahuan') => {
    const p = cleanPhone(s?.parent_phone);
    return p ? `https://wa.me/${p}?text=${encodeURIComponent(waText(s,type))}` : '';
  };
  let lastKey = '';
  let cache = null;
  async function load(){
    const {data:{user}} = await db.auth.getUser();
    if(!user) return null;
    const {data:profile} = await db.from('profiles').select('*,schools(*)').eq('id',user.id).single();
    if(!profile?.school_id && !profile?.schools?.id) return null;
    const schoolId = profile.school_id || profile.schools.id;
    const [st, ev, vt, at, sl] = await Promise.all([
      db.from('students').select('*').eq('school_id',schoolId).order('name').limit(5000),
      db.from('discipline_events').select('*,students(nis,name,class_name,homeroom_teacher),violation_types(name,category,code),achievement_types(name,level,code),sanction_levels(level,action)').eq('school_id',schoolId).order('event_date',{ascending:false}).limit(5000),
      db.from('violation_types').select('*').eq('school_id',schoolId).order('code'),
      db.from('achievement_types').select('*').eq('school_id',schoolId).order('code'),
      db.from('sanction_levels').select('*').eq('school_id',schoolId).order('level')
    ]);
    const settings = profile.schools?.settings || {};
    const classes = Array.isArray(settings.classes) ? settings.classes.filter(x=>x?.name) : [];
    cache = {profile,school:profile.schools,students:st.data||[],events:ev.data||[],violations:vt.data||[],achievements:at.data||[],sanctions:sl.data||[],classes,threshold:20,fastDays:30,fastPoints:15};
    return cache;
  }
  function classRows(d){
    const by = {};
    d.classes.forEach(c => by[c.name]={name:c.name,teacher:c.homeroom_teacher||'',students:0,events:0,v:0,a:0,attention:0});
    d.students.filter(s=>s.status==='Aktif').forEach(s=>{ const k=s.class_name||'Belum diisi'; by[k] ||= {name:k,teacher:s.homeroom_teacher||'',students:0,events:0,v:0,a:0,attention:0}; by[k].students++; if(!by[k].teacher&&s.homeroom_teacher) by[k].teacher=s.homeroom_teacher; });
    const points={};
    d.events.forEach(e=>{const k=e.students?.class_name||'Belum diisi'; by[k] ||= {name:k,teacher:e.students?.homeroom_teacher||'',students:0,events:0,v:0,a:0,attention:0}; by[k].events++; if(e.event_type==='pelanggaran') by[k].v+=num(e.points); if(e.event_type==='prestasi') by[k].a+=Math.abs(num(e.points));});
    d.students.forEach(s=>{const p=d.events.filter(e=>e.student_id===s.id).reduce((a,e)=>a+(e.event_type==='sanksi'?0:num(e.points)),0); if(p>=d.threshold){const k=s.class_name||'Belum diisi'; by[k] ||= {name:k,teacher:s.homeroom_teacher||'',students:0,events:0,v:0,a:0,attention:0}; by[k].attention++;}});
    return Object.values(by).map(x=>({...x,net:x.v-x.a,avg:x.students?((x.v-x.a)/x.students):0})).filter(x=>x.name).sort((a,b)=>a.name.localeCompare(b.name,'id'));
  }
  function homeroomRows(d){
    const by={};
    d.students.filter(s=>s.status==='Aktif').forEach(s=>{const k=s.homeroom_teacher||'Belum diisi';by[k] ||= {teacher:k,classes:new Set(),students:0,events:0,v:0,a:0,attention:0};by[k].students++;if(s.class_name)by[k].classes.add(s.class_name);const ev=d.events.filter(e=>e.student_id===s.id);by[k].events+=ev.length;const p=ev.reduce((a,e)=>a+(e.event_type==='sanksi'?0:num(e.points)),0);by[k].v+=ev.filter(e=>e.event_type==='pelanggaran').reduce((a,e)=>a+num(e.points),0);by[k].a+=ev.filter(e=>e.event_type==='prestasi').reduce((a,e)=>a+Math.abs(num(e.points)),0);if(p>=d.threshold)by[k].attention++;});
    return Object.values(by).map(x=>({...x,classes:[...x.classes].join(', '),net:x.v-x.a,avg:x.students?((x.v-x.a)/x.students):0})).sort((a,b)=>b.net-a.net);
  }
  function dashboardHTML(d){
    const classes=classRows(d), homerooms=homeroomRows(d);
    const vp=d.events.filter(e=>e.event_type==='pelanggaran').reduce((a,e)=>a+num(e.points),0);
    const ap=d.events.filter(e=>e.event_type==='prestasi').reduce((a,e)=>a+Math.abs(num(e.points)),0);
    const monitored=d.students.filter(s=>d.events.filter(e=>e.student_id===s.id).reduce((a,e)=>a+(e.event_type==='sanksi'?0:num(e.points)),0)>=d.threshold).length;
    const since=Date.now()-d.fastDays*86400000;
    const fast=d.students.map(s=>{const ev=d.events.filter(e=>e.student_id===s.id&&new Date(e.event_date).getTime()>=since&&e.event_type==='pelanggaran');return {...s,rapid:ev.reduce((a,e)=>a+num(e.points),0),net:d.events.filter(e=>e.student_id===s.id).reduce((a,e)=>a+(e.event_type==='sanksi'?0:num(e.points)),0)}}).filter(s=>s.rapid>=d.fastPoints).sort((a,b)=>b.rapid-a.rapid).slice(0,10);
    const sanctionMap={}; d.events.filter(e=>e.event_type==='sanksi').forEach(e=>{const k=e.sanction_levels?.level??'-';sanctionMap[k]=(sanctionMap[k]||0)+1;});
    return `<div class="dashboard-report">
      <div class="grid stats"><div class="card stat"><div class="label">TOTAL KEJADIAN</div><div class="value">${fmt(d.events.length)}</div></div><div class="card stat"><div class="label">POIN PELANGGARAN</div><div class="value">${fmt(vp)}</div></div><div class="card stat"><div class="label">POIN PRESTASI</div><div class="value">${fmt(ap)}</div></div><div class="card stat"><div class="label">SISWA DIPANTAU</div><div class="value">${fmt(monitored)}</div></div></div>
      <div class="grid two" style="margin-top:16px"><div class="card"><h3>DETEKSI DINI — SISWA YANG POINNYA NAIK CEPAT ${d.fastDays} HARI TERAKHIR</h3><p class="hint">Ambang kenaikan cepat: ${fmt(d.fastPoints)} poin. Siswa yang muncul di sini layak mendapat perhatian lebih awal.</p><div class="table-wrap"><table class="data-table"><thead><tr><th>NIS</th><th>NAMA SISWA</th><th>KELAS</th><th>POIN BERSIH</th><th>NAIK ${d.fastDays} HR</th><th>Aksi</th></tr></thead><tbody>${fast.map(s=>`<tr><td>${esc(s.nis)}</td><td><b>${esc(s.name)}</b></td><td>${esc(s.class_name)}</td><td>${fmt(s.net)}</td><td><b>${fmt(s.rapid)}</b></td><td>${waLink(s)?`<a class="secondary" target="_blank" rel="noopener" href="${waLink(s)}">WA Orang Tua</a>`:'-'}</td></tr>`).join('')||'<tr><td colspan="6" class="empty">Belum ada siswa dengan kenaikan cepat.</td></tr>'}</tbody></table></div></div>
      <div class="card"><h3>SEBARAN TINGKAT SANKSI</h3><div class="kpi-list">${Object.entries(sanctionMap).map(([k,v])=>`<div class="kpi-line"><span>Tingkat ${esc(k)}</span><b>${fmt(v)} kejadian</b></div>`).join('')||'<div class="empty">Belum ada sanksi.</div>'}</div></div></div>
      <div class="card" style="margin-top:16px"><div class="toolbar"><div><h3>POIN PER KELAS & WALI KELAS</h3><span class="hint">Tampilan gabungan Dashboard, Rekap Kelas, dan Rekap Wali Kelas.</span></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>NO</th><th>KELAS</th><th>WALI KELAS</th><th>JML SISWA</th><th>JML KEJADIAN</th><th>POIN PELANGGARAN</th><th>POIN PRESTASI</th><th>POIN BERSIH</th><th>RATA-RATA / SISWA</th><th>SISWA PERLU PERHATIAN</th></tr></thead><tbody>${classes.map((x,i)=>`<tr><td>${i+1}</td><td><b>${esc(x.name)}</b></td><td>${esc(x.teacher||'-')}</td><td>${fmt(x.students)}</td><td>${fmt(x.events)}</td><td>${fmt(x.v)}</td><td>${fmt(x.a)}</td><td><b>${fmt(x.net)}</b></td><td>${x.avg.toFixed(1)}</td><td>${fmt(x.attention)}</td></tr>`).join('')||'<tr><td colspan="10" class="empty">Belum ada kelas.</td></tr>'}</tbody></table></div></div>
      <div class="card" style="margin-top:16px"><h3>REKAP PER WALI KELAS</h3><div class="table-wrap"><table class="data-table"><thead><tr><th>NO</th><th>NAMA WALI KELAS</th><th>KELAS</th><th>JML SISWA</th><th>JML KEJADIAN</th><th>POIN BERSIH</th><th>RATA-RATA / SISWA</th><th>SISWA PERLU PERHATIAN</th></tr></thead><tbody>${homerooms.map((x,i)=>`<tr><td>${i+1}</td><td><b>${esc(x.teacher)}</b></td><td>${esc(x.classes||'-')}</td><td>${fmt(x.students)}</td><td>${fmt(x.events)}</td><td><b>${fmt(x.net)}</b></td><td>${x.avg.toFixed(1)}</td><td>${fmt(x.attention)}</td></tr>`).join('')||'<tr><td colspan="8" class="empty">Belum ada data wali kelas.</td></tr>'}</tbody></table></div></div>
    </div>`;
  }
  function analysisHTML(d){
    const m={}; d.events.filter(e=>e.event_type==='pelanggaran').forEach(e=>{const n=e.violation_types?.name||'Lainnya';m[n] ||= {count:0,points:0,classes:new Set()};m[n].count++;m[n].points+=num(e.points);if(e.students?.class_name)m[n].classes.add(e.students.class_name);});
    const rows=Object.entries(m).map(([name,x])=>({...x,name,classes:[...x.classes]})).sort((a,b)=>b.count-a.count||b.points-a.points);
    const max=rows[0]?.count||1;
    return `<div class="card"><div class="toolbar"><div><h3>PELANGGARAN PALING SERING TERJADI</h3><span class="hint">Diurutkan otomatis dari jumlah kejadian terbanyak, dari seluruh siswa dan seluruh kelas.</span></div><span class="badge neutral">${fmt(d.events.filter(e=>e.event_type==='pelanggaran').length)} total kejadian</span></div><div class="chart-bars">${rows.map((x,i)=>`<div class="bar-row"><div><b>#${i+1} ${esc(x.name)}</b><br><span class="hint">${esc(x.classes.join(', ')||'Semua kelas')}</span></div><div class="bar"><i style="width:${Math.max(3,(x.count/max)*100)}%"></i></div><b>${fmt(x.count)}</b></div>`).join('')||'<div class="empty">Belum ada data pelanggaran.</div>'}</div></div>
    <div class="card" style="margin-top:16px"><h3>PELANGGARAN MENURUT KATEGORI</h3><div class="table-wrap"><table class="data-table"><thead><tr><th>PERINGKAT</th><th>KATEGORI / JENIS</th><th>JML KEJADIAN</th><th>TOTAL POIN</th><th>KELAS TERDAMPAK</th></tr></thead><tbody>${rows.map((x,i)=>`<tr><td><b>${i+1}</b></td><td>${esc(x.name)}</td><td>${fmt(x.count)}</td><td>${fmt(x.points)}</td><td>${esc(x.classes.join(', ')||'-')}</td></tr>`).join('')||'<tr><td colspan="5" class="empty">Belum ada data.</td></tr>'}</tbody></table></div></div>`;
  }
  function replacePage(){
    const title=($('#pageTitle')?.textContent||'').trim();
    if(title==='Dashboard'||title==='Rekap Kelas'||title==='Rekap Wali Kelas'){
      const key=title+'|'+(cache?.events.length||0)+'|'+(cache?.students.length||0); if(key===lastKey)return; lastKey=key;
      load().then(d=>{if(d&&($('#pageTitle')?.textContent||'').trim()===title) $('#page').innerHTML=dashboardHTML(d);});
    } else if(title==='Analisis Pola'){
      const key='analysis|'+(cache?.events.length||0); if(key===lastKey)return; lastKey=key;
      load().then(d=>{if(d&&($('#pageTitle')?.textContent||'').trim()===title) $('#page').innerHTML=analysisHTML(d);});
    }
    if(title==='Dashboard'||title==='Rekap Kelas'||title==='Rekap Wali Kelas'){
      $('#page')?.querySelectorAll('.deleteStudent,.deleteEvent,.deleteCoaching,.deleteMaster,.deleteClass').forEach(b=>b.classList.add('danger'));
    }
    addWhatsAppButtons();
  }
  function addWhatsAppButtons(){
    const table=$('#studentTable'); if(!table)return;
    table.querySelectorAll('tbody tr').forEach(tr=>{
      if(tr.querySelector('.wa-parent'))return;
      const phoneCell=tr.querySelector('td:nth-child(5)'); if(!phoneCell)return;
      const text=phoneCell.textContent.trim(); const p=cleanPhone(text); if(!p)return;
      const name=tr.querySelector('td:nth-child(2)')?.textContent.trim()||'siswa';
      const cls=tr.querySelector('td:nth-child(3)')?.textContent.trim()||'';
      const s={name,class_name:cls,parent_phone:text};
      const td=tr.querySelector('td:last-child'); if(!td)return;
      const a=document.createElement('a'); a.className='secondary wa-parent'; a.target='_blank'; a.rel='noopener'; a.href=waLink(s); a.textContent='WA'; a.title='Kirim pemberitahuan ke WhatsApp orang tua/wali'; td.appendChild(document.createTextNode(' ')); td.appendChild(a);
    });
  }
  const observer=new MutationObserver(()=>setTimeout(replacePage,30));
  observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('click',e=>{
    const b=e.target.closest('.editStudent'); if(b)setTimeout(addWhatsAppButtons,50);
    const nav=e.target.closest('[data-page]'); if(nav){lastKey='';setTimeout(replacePage,80);}
  });
  setInterval(()=>{addWhatsAppButtons();replacePage();},1500);
})();
