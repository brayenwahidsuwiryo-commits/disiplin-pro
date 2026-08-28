// Human workflow layer for Disiplin Pro.
// Designed around three daily roles: Beno (student data), Budi (incidents), Lina (follow-up/reporting).
(() => {
  const cfg = window.APP_CONFIG || {};
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey || !window.supabase) return;
  const db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  const $ = s => document.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const norm = v => String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  const money = v => new Intl.NumberFormat('id-ID').format(Number(v || 0));
  const today = () => new Date().toISOString().slice(0,10);
  let lastPage = '';
  let running = false;

  async function context() {
    const {data:{user}} = await db.auth.getUser();
    if (!user) return null;
    const {data:profile,error} = await db.from('profiles').select('school_id,full_name,role').eq('id',user.id).single();
    if (error || !profile?.school_id) return null;
    return profile;
  }

  async function dashboard() {
    const page = $('#page');
    if (!page || ($('#pageTitle')?.textContent || '').trim() !== 'Dashboard' || page.dataset.humanWorkflow === '1') return;
    if (running) return;
    running = true;
    try {
      const ctx = await context(); if (!ctx) return;
      const sid = ctx.school_id;
      const [{data:students=[]},{data:events=[]},{data:coaching=[]}] = await Promise.all([
        db.from('students').select('id,name,nis,class_name,homeroom_teacher,status,parent_name,parent_phone').eq('school_id',sid).limit(5000),
        db.from('discipline_events').select('id,student_id,event_type,points,event_date,follow_up,violation_types(name,category),sanction_levels(action)').eq('school_id',sid).order('event_date',{ascending:false}).limit(5000),
        db.from('coaching_records').select('id,student_id,result,next_review,problem,action').eq('school_id',sid).order('next_review',{ascending:true}).limit(5000)
      ]);
      const byStudent = new Map(students.map(s => [s.id,s]));
      const score = new Map(students.map(s => [s.id,0]));
      const count = new Map(students.map(s => [s.id,0]));
      events.forEach(e => {
        const p = Number(e.points || 0);
        score.set(e.student_id,(score.get(e.student_id)||0) + (e.event_type === 'prestasi' ? -Math.abs(p) : e.event_type === 'pelanggaran' ? Math.abs(p) : 0));
        if (e.event_type === 'pelanggaran') count.set(e.student_id,(count.get(e.student_id)||0)+1);
      });
      const risky = students.filter(s => s.status === 'Aktif').map(s => ({...s,points:score.get(s.id)||0,count:count.get(s.id)||0})).filter(s => s.points >= 20).sort((a,b)=>b.points-a.points).slice(0,8);
      const overdue = coaching.filter(c => c.next_review && c.next_review <= today() && norm(c.result) !== 'selesai').map(c=>({...c,student:byStudent.get(c.student_id)})).filter(c=>c.student).slice(0,8);
      const topClasses = {};
      students.forEach(s => { const k=s.class_name||'Belum ada kelas'; if(!topClasses[k])topClasses[k]={students:0,points:0,violations:0}; topClasses[k].students++; });
      events.filter(e=>e.event_type==='pelanggaran').forEach(e => { const s=byStudent.get(e.student_id); const k=s?.class_name||'Belum ada kelas'; if(!topClasses[k])topClasses[k]={students:0,points:0,violations:0}; topClasses[k].points+=Math.abs(Number(e.points||0)); topClasses[k].violations++; });
      const classRows=Object.entries(topClasses).sort((a,b)=>b[1].points-a[1].points).slice(0,6);
      const box=document.createElement('section'); box.className='card human-workflow'; box.dataset.humanWorkflow='1'; box.style.marginTop='16px';
      box.innerHTML=`<div class="toolbar"><div><h3>Pusat Tindakan</h3><p class="hint">Ringkasan yang langsung membantu pekerjaan hari ini.</p></div><div class="badge good">${students.length} siswa · ${events.length} catatan</div></div><div class="grid three"><div class="card"><div class="label">Perlu perhatian</div><div class="value">${risky.length}</div><p class="hint">Siswa aktif dengan ≥20 poin bersih.</p></div><div class="card"><div class="label">Tindak lanjut jatuh tempo</div><div class="value">${overdue.length}</div><p class="hint">Pembinaan yang sudah waktunya ditinjau.</p></div><div class="card"><div class="label">Catatan bulan berjalan</div><div class="value">${events.filter(e=>String(e.event_date||'').slice(0,7)===today().slice(0,7)).length}</div><p class="hint">Semua jenis kejadian.</p></div></div><div class="grid two" style="margin-top:16px"><div><h4>Siswa yang perlu ditindaklanjuti</h4>${risky.length?risky.map(s=>`<div class="kpi-line"><span><b>${esc(s.name)}</b><br><span class="hint">${esc(s.class_name||'-')} · ${s.count} pelanggaran</span></span><b>${money(s.points)} poin</b></div>`).join(''):`<div class="empty">Belum ada siswa pada ambang perhatian.</div>`}</div><div><h4>Pembinaan jatuh tempo</h4>${overdue.length?overdue.map(c=>`<div class="kpi-line"><span><b>${esc(c.student.name)}</b><br><span class="hint">Tinjau ${esc(c.next_review)} · ${esc(c.problem||'Pembinaan')}</span></span><span class="badge warn">Tindak lanjut</span></div>`).join(''):`<div class="empty">Tidak ada pembinaan yang jatuh tempo.</div>`}</div></div><div style="margin-top:16px"><h4>Ringkasan kelas</h4><div class="table-wrap"><table class="data-table"><thead><tr><th>Kelas</th><th>Siswa</th><th>Kejadian</th><th>Poin</th></tr></thead><tbody>${classRows.map(([k,v])=>`<tr><td><b>${esc(k)}</b></td><td>${v.students}</td><td>${v.violations}</td><td>${money(v.points)}</td></tr>`).join('')||`<tr><td colspan="4" class="empty">Belum ada data.</td></tr>`}</tbody></table></div></div>`;
      page.appendChild(box);
    } catch (e) { console.warn('[human-workflow]',e); }
    finally { running=false; }
  }

  function enhanceLetter() {
    const btn = $('#generateLetter'); const preview=$('#letterPreview');
    if (!btn || !preview || btn.dataset.humanLetter==='1') return;
    btn.dataset.humanLetter='1';
    btn.addEventListener('click', async () => {
      setTimeout(async () => {
        try {
          const ctx=await context(); if(!ctx)return;
          const sid=ctx.school_id, studentId=$('#letterStudent')?.value, type=$('#letterType')?.value||'Pemberitahuan';
          const [{data:s},{data:events=[]},{data:coaching=[]},{data:school}] = await Promise.all([
            db.from('students').select('*').eq('id',studentId).eq('school_id',sid).single(),
            db.from('discipline_events').select('event_date,event_type,points,description,violation_types(name,category),sanction_levels(action)').eq('school_id',sid).eq('student_id',studentId).order('event_date',{ascending:false}).limit(50),
            db.from('coaching_records').select('coaching_date,coach_name,problem,action,result,next_review').eq('school_id',sid).eq('student_id',studentId).order('coaching_date',{ascending:false}).limit(10),
            db.from('schools').select('name,address,phone,academic_year').eq('id',sid).single()
          ]);
          if(!s)return;
          const violations=events.filter(e=>e.event_type==='pelanggaran');
          const points=events.reduce((a,e)=>a+(e.event_type==='pelanggaran'?Math.abs(Number(e.points||0)):e.event_type==='prestasi'?-Math.abs(Number(e.points||0)):0),0);
          const sanctions=events.filter(e=>e.event_type==='sanksi');
          const lastCoach=coaching[0];
          preview.innerHTML=`<div class="card" style="margin-top:16px;box-shadow:none"><div style="text-align:center;border-bottom:2px solid #111;padding-bottom:12px"><b>${esc((school?.name||'SEKOLAH').toUpperCase())}</b><div>${esc(school?.address||'')}</div><div>${esc(school?.phone||'')}</div><h2>${esc(type).toUpperCase()}</h2></div><p>Yth. Orang Tua/Wali dari <b>${esc(s.name)}</b></p><p>Dengan hormat, kami menyampaikan tindak lanjut pembinaan siswa berikut:</p><table class="data-table"><tbody><tr><td>Nama</td><td>${esc(s.name)}</td></tr><tr><td>NIS</td><td>${esc(s.nis||'-')}</td></tr><tr><td>Kelas</td><td>${esc(s.class_name||'-')}</td></tr><tr><td>Wali kelas</td><td>${esc(s.homeroom_teacher||'-')}</td></tr><tr><td>Poin bersih</td><td><b>${money(points)}</b></td></tr><tr><td>Jumlah pelanggaran</td><td>${violations.length}</td></tr><tr><td>Sanksi tercatat</td><td>${sanctions.length}</td></tr></tbody></table><h4>Ringkasan kejadian</h4>${violations.slice(0,8).map(e=>`<p>• ${esc(e.event_date)} — <b>${esc(e.violation_types?.name||'Pelanggaran')}</b>${e.description?` — ${esc(e.description)}`:''}</p>`).join('')||'<p>Tidak ada rincian pelanggaran.</p>'}<h4>Tindak lanjut</h4><p>${lastCoach?`Pembinaan terakhir oleh ${esc(lastCoach.coach_name||'petugas')}: ${esc(lastCoach.action||'-')}. Status: ${esc(lastCoach.result||'Perlu Lanjut')}.`:'Belum ada catatan pembinaan.'}</p><p>Demikian pemberitahuan ini dibuat sebagai bahan kerja sama sekolah dan orang tua/wali dalam mendampingi siswa.</p><div style="margin-top:48px;text-align:right">${esc(school?.name||'Sekolah')}, ${new Date().toLocaleDateString('id-ID')}<br><br><br><b>________________________</b><br>Petugas/Kepala Sekolah</div><button class="secondary" onclick="window.print()">Cetak / PDF</button></div>`;
        } catch(e) { console.warn('[human-letter]',e); }
      },0);
    }, false);
  }

  function run() {
    const title=($('#pageTitle')?.textContent||'').trim();
    if(title===lastPage) return;
    lastPage=title;
    if(title==='Dashboard') setTimeout(dashboard,80);
    if(title==='Surat') setTimeout(enhanceLetter,80);
  }
  window.addEventListener('load',()=>{setTimeout(run,300);new MutationObserver(run).observe(document.body,{childList:true,subtree:true});});
})();
