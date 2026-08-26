import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const cfg = window.APP_CONFIG || {};
const sb = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);

const state = { user:null, profile:null, school:null, page:"dashboard", students:[], violations:[], masters:{violations:[],achievements:[],sanctions:[]}, classes:[] };

const $ = (s,root=document)=>root.querySelector(s);
const $$ = (s,root=document)=>[...root.querySelectorAll(s)];
const esc = v => String(v ?? "").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const money = v => new Intl.NumberFormat("id-ID").format(Number(v||0));
const dateID = v => v ? new Date(v).toLocaleDateString("id-ID",{day:"2-digit",month:"2-digit",year:"numeric"}) : "-";
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2600)}
function showAuth(tab="login"){$("#authView").classList.remove("hidden");$("#appView").classList.add("hidden");$$(".auth-tab").forEach(b=>b.classList.toggle("active",b.dataset.authTab===tab));$("#loginForm").classList.toggle("hidden",tab!=="login");$("#registerForm").classList.toggle("hidden",tab!=="register")}
function showApp(){$("#authView").classList.add("hidden");$("#appView").classList.remove("hidden")}

const navGroups=[
 ["UTAMA",[["dashboard","▦","Dashboard"]]],
 ["DATA",[["students","◉","Data Siswa"],["events","＋","Catatan Kejadian"],["coaching","◎","Pembinaan"]]],
 ["REKAP & ANALISIS",[["reports","▤","Rekap & Laporan"],["analysis","◌","Analisis Pola"],["semester","◫","Arsip Semester"]]],
 ["DOKUMEN",[["student-card","▣","Kartu Siswa"],["letters","✉","Surat"]]],
 ["MASTER",[["masters","◆","Master Data"]]]
];

function renderNav(){let h="";for(const [g,items] of navGroups){h+=`<div class="nav-group"><div class="nav-label">${g}</div>${items.map(x=>`<button class="nav-btn ${state.page===x[0]?"active":""}" data-page="${x[0]}">${x[1]} ${x[2]}</button>`).join("")}</div>`}$("#nav").innerHTML=h;$$("[data-page]").forEach(b=>b.onclick=()=>{state.page=b.dataset.page;renderNav();renderPage();$("#sidebar")?.classList.remove("open")})}

async function loadContext(){
 const {data:{user}}=await sb.auth.getUser(); state.user=user;
 if(!user){showAuth();return}
 const {data:profile,error}=await sb.from("profiles").select("*,schools(*)").eq("id",user.id).single();
 if(error){toast(error.message);return}
 state.profile=profile;state.school=profile.schools;showApp();
 $("#sideSchool").textContent=state.school.name;$("#userBadge").textContent=`${state.profile.full_name} · ${state.profile.role}`;
 renderNav();await loadMasters();await loadStudents();await renderPage();
}
async function loadStudents(){
 const {data,error}=await sb.from("students").select("*").order("name").limit(5000);
 if(error){toast(error.message);return}state.students=data||[];state.classes=[...new Set(state.students.map(x=>x.class_name).filter(Boolean))].sort();
}
async function loadMasters(){
 const [a,b,c]=await Promise.all([
  sb.from("violation_types").select("*").eq("active",true).order("code"),
  sb.from("achievement_types").select("*").eq("active",true).order("code"),
  sb.from("sanction_levels").select("*").eq("active",true).order("level")
 ]);
 state.masters={violations:a.data||[],achievements:b.data||[],sanctions:c.data||[]};
}

async function renderPage(){
 const titles={dashboard:["DASHBOARD","Dashboard"],students:["DATA SISWA","Data Siswa"],events:["CATATAN","Catatan Kejadian"],coaching:["PEMBINAAN","Catatan Pembinaan"],reports:["REKAP","Rekap & Laporan"],analysis:["ANALISIS","Analisis Pola"],semester:["ARSIP","Arsip Semester"],"student-card":["DOKUMEN","Kartu Siswa"],letters:["DOKUMEN","Surat"],masters:["MASTER","Master Data"],settings:["SISTEM","Pengaturan"]};
 $("#pageKicker").textContent=titles[state.page]?.[0]||"DISIPLIN PRO";$("#pageTitle").textContent=titles[state.page]?.[1]||"Dashboard";
 const pages={dashboard:pageDashboard,students:pageStudents,events:pageEvents,coaching:pageCoaching,reports:pageReports,analysis:pageAnalysis,semester:pageSemester,"student-card":pageStudentCard,letters:pageLetters,masters:pageMasters,settings:pageSettings};
 $("#page").innerHTML=await pages[state.page]();bindPage();
}

async function pageDashboard(){
 const [{count:studentCount},{data:events},{data:coaching}]=await Promise.all([
  sb.from("students").select("*",{count:"exact",head:true}).eq("status","Aktif"),
  sb.from("discipline_events").select("points,event_date,event_type").order("event_date",{ascending:false}).limit(5000),
  sb.from("coaching_records").select("result").limit(5000)
 ]);
 const ev=events||[], violations=ev.filter(x=>x.points>0).reduce((a,x)=>a+Number(x.points),0), achievements=Math.abs(ev.filter(x=>x.points<0).reduce((a,x)=>a+Number(x.points),0));
 const attention=(await getAttention()).length;
 const monthly={};ev.forEach(x=>{const m=String(x.event_date).slice(0,7);monthly[m]=(monthly[m]||0)+1});
 const rows=Object.entries(monthly).sort().slice(-6);const mx=Math.max(1,...rows.map(x=>x[1]));
 return `<div class="grid stats">
 <div class="card stat"><div class="label">Siswa aktif</div><div class="value">${money(studentCount)}</div><div class="hint">Data sekolah ini</div></div>
 <div class="card stat"><div class="label">Poin pelanggaran</div><div class="value">${money(violations)}</div><div class="hint">Total kejadian positif</div></div>
 <div class="card stat"><div class="label">Poin prestasi</div><div class="value">${money(achievements)}</div><div class="hint">Pengurang poin</div></div>
 <div class="card stat"><div class="label">Perlu perhatian</div><div class="value">${money(attention)}</div><div class="hint">Berdasarkan ambang sanksi</div></div></div>
 <div class="grid two" style="margin-top:16px">
 <div class="card"><div class="toolbar"><h3>Aktivitas kejadian bulanan</h3><span class="hint">6 bulan terakhir</span></div>
 <div class="chart-bars">${rows.length?rows.map(([m,v])=>`<div class="bar-row"><span>${m}</span><div class="bar"><i style="width:${Math.round(v/mx*100)}%"></i></div><b>${v}</b></div>`).join(""):`<div class="empty">Belum ada kejadian.</div>`}</div></div>
 <div class="card"><h3>Akses cepat</h3><div class="grid"><button class="primary" data-page="events">＋ Catat kejadian</button><button class="secondary" data-page="students">＋ Tambah siswa</button><button class="secondary" data-page="reports">Lihat rekap sekolah</button></div></div>
 </div>
 <div class="card" style="margin-top:16px"><h3>Konsep sistem</h3><p class="hint">Logika spreadsheet seperti poin otomatis, tingkat sanksi, rekap kelas/wali, laporan bulanan, pembinaan, kartu siswa, dan surat dipindahkan menjadi perhitungan database sehingga tidak perlu mengisi rumus manual.</p></div>`;
}

async function getAttention(){
 const {data:ev}=await sb.from("discipline_events").select("student_id,points");
 const map={};(ev||[]).forEach(x=>map[x.student_id]=(map[x.student_id]||0)+Number(x.points));
 const max=Math.max(0,...state.masters.sanctions.map(x=>Number(x.points_from)));
 return state.students.filter(s=>s.status==="Aktif"&&Number(map[s.id]||0)>=max);
}

function pageStudents(){
 return `<div class="card"><div class="toolbar"><div class="toolbar-left"><input id="studentSearch" class="search" placeholder="Cari NIS, nama, kelas, wali kelas..." style="min-width:280px"><select id="studentStatus" class="search"><option value="">Semua status</option><option>Aktif</option><option>Non-Aktif</option><option>Pindah</option><option>Lulus</option></select></div><div class="toolbar-right"><button class="secondary" id="importExcelBtn">Import Excel</button><button class="primary" id="addStudentBtn">＋ Tambah siswa</button></div></div><div id="studentTable"></div></div>`;
}

function studentRows(list){return `<div class="table-wrap"><table class="data-table"><thead><tr><th>NIS</th><th>Nama</th><th>Kelas</th><th>Wali Kelas</th><th>Orang Tua/Wali</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${list.map(s=>`<tr><td><b>${esc(s.nis)}</b></td><td>${esc(s.name)}</td><td>${esc(s.class_name)}</td><td>${esc(s.homeroom_teacher)}</td><td>${esc(s.parent_name)}<br><span class="hint">${esc(s.parent_phone)}</span></td><td><span class="badge ${s.status==="Aktif"?"good":"neutral"}">${esc(s.status)}</span></td><td><button class="secondary viewStudent" data-id="${s.id}">Detail</button></td></tr>`).join("")}</tbody></table></div>`}

function bindStudents(){
 const render=()=>{const q=($("#studentSearch").value||"").toLowerCase(),st=$("#studentStatus").value;let list=state.students.filter(s=>(!st||s.status===st)&&[s.nis,s.name,s.class_name,s.homeroom_teacher].join(" ").toLowerCase().includes(q));$("#studentTable").innerHTML=list.length?studentRows(list):`<div class="empty">Tidak ada data siswa.</div>`;$$(".viewStudent").forEach(b=>b.onclick=()=>studentDetail(b.dataset.id))};$("#studentSearch").oninput=render;$("#studentStatus").onchange=render;$("#addStudentBtn").onclick=()=>studentForm();$("#importExcelBtn").onclick=()=>excelImport();render();
}
function studentForm(student=null){
 openModal(student?"Edit siswa":"Tambah siswa",`<form id="studentForm" class="form-grid">
 <label>NIS<input name="nis" required value="${esc(student?.nis)}"></label><label>Nama lengkap<input name="name" required value="${esc(student?.name)}"></label>
 <label>Kelas<select name="class_name">${state.classes.map(c=>`<option ${c===student?.class_name?"selected":""}>${esc(c)}</option>`).join("")}</select></label>
 <label>Wali kelas<input name="homeroom_teacher" value="${esc(student?.homeroom_teacher)}"></label>
 <label>Nama orang tua/wali<input name="parent_name" value="${esc(student?.parent_name)}"></label><label>No. HP orang tua<input name="parent_phone" value="${esc(student?.parent_phone)}"></label>
 <label>Status<select name="status">${["Aktif","Non-Aktif","Pindah","Lulus"].map(x=>`<option ${x===student?.status?"selected":""}>${x}</option>`).join("")}</select></label>
 <label>Keterangan<input name="notes" value="${esc(student?.notes)}"></label>
 <div class="actions full"><button type="button" class="secondary" data-close> Batal </button><button class="primary">Simpan</button></div></form>`);
 $("#studentForm").onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));let q=student?sb.from("students").update(d).eq("id",student.id):sb.from("students").insert({...d,school_id:state.school.id});const {error}=await q;if(error)toast(error.message);else{toast("Data siswa tersimpan");closeModal();await loadStudents();renderPage();}};
}
async function studentDetail(id){
 const s=state.students.find(x=>x.id===id);if(!s)return;
 const {data:ev}=await sb.from("discipline_events").select("*,violation_types(name,category),achievement_types(name)").eq("student_id",id).order("event_date",{ascending:false});
 const points=(ev||[]).reduce((a,x)=>a+Number(x.points),0), level=getSanctionLevel(points);
 openModal("Detail Siswa",`<div class="grid two"><div class="student-card"><div class="eyebrow">${esc(s.nis)}</div><h2>${esc(s.name)}</h2><p>${esc(s.class_name)} · ${esc(s.homeroom_teacher)}</p><div class="score">${money(points)}</div><span class="badge ${points>=25?"bad":points>0?"warn":"good"}">Poin bersih · Tingkat ${level?.level||1}</span><div class="kpi-list" style="margin-top:16px"><div class="kpi-line"><span>Orang tua/wali</span><b>${esc(s.parent_name)}</b></div><div class="kpi-line"><span>No. HP</span><b>${esc(s.parent_phone)}</b></div><div class="kpi-line"><span>Status</span><b>${esc(s.status)}</b></div></div></div><div class="card"><h3>Riwayat kejadian</h3>${(ev||[]).length?`<div class="kpi-list">${ev.map(x=>`<div class="kpi-line"><span>${dateID(x.event_date)} · ${esc(x.violation_types?.name||x.achievement_types?.name||x.description)}</span><b>${x.points>0?"+":""}${x.points}</b></div>`).join("")}</div>`:`<div class="empty">Belum ada kejadian.</div>`}</div></div>`);
}
function getSanctionLevel(points){return [...state.masters.sanctions].reverse().find(x=>Number(points)>=Number(x.points_from))||state.masters.sanctions[0]}

function pageEvents(){return `<div class="card"><div class="toolbar"><div><h3>Catatan pelanggaran & prestasi</h3><span class="hint">Satu kejadian = satu catatan. Poin otomatis dari master.</span></div><button class="primary" id="addEventBtn">＋ Catat kejadian</button></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Tanggal</th><th>Siswa</th><th>Jenis</th><th>Kategori</th><th>Poin</th><th>Pencatat</th><th>Uraian</th></tr></thead><tbody id="eventRows"><tr><td colspan="7" class="empty">Memuat...</td></tr></tbody></table></div></div>`}
async function bindEvents(){await loadEventRows();$("#addEventBtn").onclick=()=>eventForm()}
async function loadEventRows(){const {data,error}=await sb.from("discipline_events").select("*,students(nis,name,class_name),violation_types(name,category),achievement_types(name)").order("event_date",{ascending:false}).limit(5000);if(error){toast(error.message);return}$("#eventRows").innerHTML=data.length?data.map(x=>`<tr><td>${dateID(x.event_date)}</td><td><b>${esc(x.students?.name)}</b><br><span class="hint">${esc(x.students?.nis)} · ${esc(x.students?.class_name)}</span></td><td>${esc(x.violation_types?.name||x.achievement_types?.name||"-")}</td><td>${esc(x.violation_types?.category||"Prestasi")}</td><td><span class="badge ${x.points>0?"bad":"good"}">${x.points>0?"+":""}${x.points}</span></td><td>${esc(x.recorded_by_name)}</td><td>${esc(x.description)}</td></tr>`).join(""):`<tr><td colspan="7" class="empty">Belum ada catatan.</td></tr>`}
function eventForm(){
 const options=state.masters.violations.map(x=>`<option value="${x.id}" data-points="${x.points}">Pelanggaran · ${esc(x.code)} · ${esc(x.name)} (+${x.points})</option>`).join("")+state.masters.achievements.map(x=>`<option value="${x.id}" data-points="-${x.points}" data-achievement="1">Prestasi · ${esc(x.code)} · ${esc(x.name)} (-${x.points})</option>`).join("");
 openModal("Catat Kejadian",`<form id="eventForm" class="form-grid"><label>Tanggal<input name="event_date" type="date" value="${new Date().toISOString().slice(0,10)}" required></label><label>Siswa<select name="student_id" required>${state.students.filter(s=>s.status==="Aktif").map(s=>`<option value="${s.id}">${esc(s.nis)} — ${esc(s.name)} (${esc(s.class_name)})</option>`).join("")}</select></label><label class="full>Jenis kejadian<select name="type_id" required>${options}</select></label><label class="full">Uraian / kronologi<textarea name="description" rows="4"></textarea></label><label>Pencatat<input name="recorded_by_name" value="${esc(state.profile.full_name)}"></label><label>Tindak lanjut<input name="follow_up"></label><div class="actions full"><button type="button" class="secondary" data-close>Batal</button><button class="primary">Simpan</button></div></form>`);
 $("#eventForm").onsubmit=async e=>{e.preventDefault();const f=e.target,d=Object.fromEntries(new FormData(f)),opt=f.type_id.selectedOptions[0],points=Number(opt.dataset.points);const isAch=opt.dataset.achievement==="1";const payload={school_id:state.school.id,student_id:d.student_id,event_date:d.event_date,points,description:d.description,recorded_by_name:d.recorded_by_name,follow_up:d.follow_up||null};if(isAch)payload.achievement_type_id=d.type_id;else payload.violation_type_id=d.type_id;const {error}=await sb.from("discipline_events").insert(payload);if(error)toast(error.message);else{toast("Kejadian dicatat");closeModal();renderPage();}};
}

function pageCoaching(){return `<div class="card"><div class="toolbar"><div><h3>Catatan pembinaan</h3><span class="hint">Dokumentasikan proses pembinaan siswa.</span></div><button class="primary" id="addCoachingBtn">＋ Tambah pembinaan</button></div><div id="coachingTable"></div></div>`}
async function bindCoaching(){const {data}=await sb.from("coaching_records").select("*,students(nis,name,class_name)").order("coaching_date",{ascending:false});$("#coachingTable").innerHTML=data?.length?`<div class="table-wrap"><table class="data-table"><thead><tr><th>Tanggal</th><th>Siswa</th><th>Pembina</th><th>Masalah</th><th>Tindakan</th><th>Hasil</th></tr></thead><tbody>${data.map(x=>`<tr><td>${dateID(x.coaching_date)}</td><td>${esc(x.students?.nis)}<br><b>${esc(x.students?.name)}</b></td><td>${esc(x.coach_name)}</td><td>${esc(x.problem)}</td><td>${esc(x.action)}</td><td><span class="badge ${x.result==="Membaik"?"good":x.result==="Perlu Lanjut"?"warn":"bad"}">${esc(x.result)}</span></td></tr>`).join("")}</tbody></table></div>`:`<div class="empty">Belum ada pembinaan.</div>`;$("#addCoachingBtn").onclick=()=>coachingForm()}
function coachingForm(){openModal("Tambah Pembinaan",`<form id="coachingForm" class="form-grid"><label>Tanggal<input name="coaching_date" type="date" value="${new Date().toISOString().slice(0,10)}"></label><label>Siswa<select name="student_id">${state.students.filter(s=>s.status==="Aktif").map(s=>`<option value="${s.id}">${esc(s.nis)} — ${esc(s.name)}</option>`).join("")}</select></label><label>Pembina<input name="coach_name" value="${esc(state.profile.full_name)}"></label><label>Hasil<select name="result"><option>Membaik</option><option>Perlu Lanjut</option><option>Belum Berubah</option></select></label><label class="full>Masalah<textarea name="problem" required></textarea></label><label class="full>Tindakan / rencana tindak lanjut<textarea name="action" required></textarea></label><div class="actions full"><button type="button" class="secondary" data-close>Batal</button><button class="primary">Simpan</button></div></form>`);$("#coachingForm").onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));const {error}=await sb.from("coaching_records").insert({...d,school_id:state.school.id});if(error)toast(error.message);else{toast("Pembinaan tersimpan");closeModal();renderPage()}}}

async function pageReports(){
 const {data:ev}=await sb.from("discipline_events").select("points,event_date,students(class_name,homeroom_teacher)");
 const events=ev||[], byClass={};events.forEach(x=>{const c=x.students?.class_name||"Tanpa kelas";if(!byClass[c])byClass[c]={students:0,events:0,points:0};byClass[c].events++;byClass[c].points+=Number(x.points)});
 state.classes.forEach(c=>{if(!byClass[c])byClass[c]={students:0,events:0,points:0};byClass[c].students=state.students.filter(s=>s.class_name===c&&s.status==="Aktif").length});
 const classRows=Object.entries(byClass).sort((a,b)=>b[1].points-a[1].points);
 const byTeacher={};state.students.filter(s=>s.status==="Aktif").forEach(s=>{const w=s.homeroom_teacher||"Belum diisi";byTeacher[w]=(byTeacher[w]||0)+1});
 return `<div class="grid two"><div class="card"><h3>Rekap per kelas</h3><div class="table-wrap"><table class="data-table"><thead><tr><th>Kelas</th><th>Siswa</th><th>Kejadian</th><th>Poin bersih</th></tr></thead><tbody>${classRows.map(([c,v])=>`<tr><td><b>${esc(c)}</b></td><td>${v.students}</td><td>${v.events}</td><td>${v.points}</td></tr>`).join("")}</tbody></table></div></div><div class="card"><h3>Rekap wali kelas</h3><div class="kpi-list">${Object.entries(byTeacher).sort((a,b)=>b[1]-a[1]).map(([w,n])=>`<div class="kpi-line"><span>${esc(w)}</span><b>${n} siswa</b></div>`).join("")}</div></div></div><div class="card" style="margin-top:16px"><h3>Laporan bulanan</h3><p class="hint">Rekap di bawah dihitung langsung dari database dan mengikuti tanggal kejadian.</p><div class="table-wrap"><table class="data-table"><thead><tr><th>Bulan</th><th>Kejadian</th><th>Poin pelanggaran</th><th>Poin prestasi</th><th>Poin bersih</th></tr></thead><tbody>${monthlyRows(events)}</tbody></table></div></div>`
}
function monthlyRows(events){const m={};events.forEach(x=>{const k=String(x.event_date).slice(0,7);m[k]??={events:0,violation:0,achievement:0};m[k].events++;if(Number(x.points)>0)m[k].violation+=Number(x.points);else m[k].achievement+=Math.abs(Number(x.points))});return Object.entries(m).sort().reverse().map(([k,v])=>`<tr><td>${k}</td><td>${v.events}</td><td>${v.violation}</td><td>${v.achievement}</td><td>${v.violation-v.achievement}</td></tr>`).join("")||`<tr><td colspan="5" class="empty">Belum ada data.</td></tr>`}

async function pageAnalysis(){const {data:ev}=await sb.from("discipline_events").select("points,violation_type_id,violation_types(name,category)");const map={};(ev||[]).filter(x=>x.violation_type_id).forEach(x=>{const k=x.violation_types?.name||"Lainnya";map[k]??={category:x.violation_types?.category||"-",count:0,points:0};map[k].count++;map[k].points+=Number(x.points)});const rows=Object.entries(map).sort((a,b)=>b[1].count-a[1].count).slice(0,15);const mx=Math.max(1,...rows.map(x=>x[1].count));const cat={};rows.forEach(([k,v])=>cat[v.category]=(cat[v.category]||0)+v.count);return `<div class="grid two"><div class="card"><h3>Pelanggaran paling sering</h3><div class="chart-bars">${rows.length?rows.map(([k,v])=>`<div class="bar-row"><span title="${esc(k)}">${esc(k).slice(0,24)}</span><div class="bar"><i style="width:${v.count/mx*100}%"></i></div><b>${v.count}</b></div>`).join(""):`<div class="empty">Belum ada data.</div>`}</div></div><div class="card"><h3>Menurut kategori</h3><div class="kpi-list">${Object.entries(cat).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div class="kpi-line"><span>${esc(k)}</span><b>${v}</b></div>`).join("")||`<div class="empty">Belum ada data.</div>`}</div></div></div>`}

function pageSemester(){return `<div class="card"><h3>Arsip akhir semester</h3><p class="hint">Snapshot disimpan sebagai data historis agar semester berikutnya dapat dimulai tanpa menghapus riwayat lama.</p><div class="toolbar"><span class="badge neutral">Semester aktif: ${esc(state.school.current_semester||"-")}</span><button id="archiveBtn" class="primary">Buat arsip semester sekarang</button></div><div id="archiveTable"></div></div>`}
async function bindSemester(){const {data}=await sb.from("semester_archives").select("*").order("created_at",{ascending:false});$("#archiveTable").innerHTML=data?.length?`<div class="table-wrap"><table class="data-table"><thead><tr><th>Semester</th><th>Dibuat</th><th>Jumlah siswa</th><th>Total poin</th></tr></thead><tbody>${data.map(x=>`<tr><td>${esc(x.semester_name)}</td><td>${dateID(x.created_at)}</td><td>${x.student_count}</td><td>${x.total_points}</td></tr>`).join("")}</tbody></table></div>`:`<div class="empty">Belum ada arsip.</div>`;$("#archiveBtn").onclick=archiveSemester}
async function archiveSemester(){const {data:ev}=await sb.from("discipline_events").select("points");const points=(ev||[]).reduce((a,x)=>a+Number(x.points),0);const {error}=await sb.from("semester_archives").insert({school_id:state.school.id,semester_name:state.school.current_semester||"Semester aktif",student_count:state.students.length,total_points:points});if(error)toast(error.message);else{toast("Arsip semester dibuat");renderPage()}}

function pageStudentCard(){return `<div class="card"><div class="toolbar"><div><h3>Kartu kendali siswa</h3><span class="hint">Pilih siswa untuk melihat ringkasan yang siap dicetak.</span></div><select id="cardStudent" class="search" style="max-width:420px"><option value="">Pilih siswa...</option>${state.students.map(s=>`<option value="${s.id}">${esc(s.nis)} — ${esc(s.name)}</option>`).join("")}</select></div><div id="cardPreview" class="empty">Pilih siswa.</div></div>`}
async function bindStudentCard(){$("#cardStudent").onchange=async e=>{const s=state.students.find(x=>x.id===e.target.value);if(!s){$("#cardPreview").innerHTML="Pilih siswa.";return}const {data:ev}=await sb.from("discipline_events").select("points,event_date,description,violation_types(name),achievement_types(name)").eq("student_id",s.id).order("event_date",{ascending:false});const points=(ev||[]).reduce((a,x)=>a+Number(x.points),0);$("#cardPreview").innerHTML=`<div class="student-card"><div class="eyebrow">${esc(state.school.name)}</div><h2>KARTU KENDALI TATA TERTIB SISWA</h2><p><b>${esc(s.name)}</b> · ${esc(s.nis)} · ${esc(s.class_name)}</p><div class="score">${points}</div><p>Poin bersih</p><button class="primary" onclick="window.print()">Cetak</button><hr>${(ev||[]).map(x=>`<div class="kpi-line"><span>${dateID(x.event_date)} · ${esc(x.violation_types?.name||x.achievement_types?.name||x.description)}</span><b>${x.points>0?"+":""}${x.points}</b></div>`).join("")}</div>`}}

function pageLetters(){return `<div class="card"><h3>Surat pemberitahuan / panggilan</h3><p class="hint">Generator surat berbasis data siswa. Cetak dari browser atau simpan PDF.</p><div class="form-grid"><label>Siswa<select id="letterStudent">${state.students.map(s=>`<option value="${s.id}">${esc(s.nis)} — ${esc(s.name)}</option>`).join("")}</select></label><label>Jenis surat<select id="letterType"><option>Pemberitahuan</option><option>Panggilan Orang Tua</option><option>Pernyataan Pembinaan</option></select></label></div><div class="actions"><button class="primary" id="generateLetter">Buat surat</button></div><div id="letterPreview"></div></div>`}
async function bindLetters(){$("#generateLetter").onclick=async()=>{const s=state.students.find(x=>x.id===$("#letterStudent").value);const {data:ev}=await sb.from("discipline_events").select("points,description,event_date").eq("student_id",s.id).order("event_date",{ascending:false});const points=(ev||[]).reduce((a,x)=>a+Number(x.points),0);$("#letterPreview").innerHTML=`<div class="card" style="margin-top:20px;box-shadow:none"><div style="text-align:center"><b>${esc(state.school.name).toUpperCase()}</b><h2>${esc($("#letterType").value).toUpperCase()}</h2></div><p>Dengan hormat,</p><p>Sehubungan dengan catatan tata tertib siswa <b>${esc(s.name)}</b> (NIS ${esc(s.nis)}) kelas ${esc(s.class_name)}, bersama ini sekolah menyampaikan hasil pemantauan tata tertib dengan poin bersih <b>${points}</b>.</p><p>Mohon kerja sama orang tua/wali untuk mendampingi siswa agar proses pembinaan berjalan dengan baik.</p><p>Demikian surat ini dibuat untuk dipergunakan sebagaimana mestinya.</p><div class="actions"><button class="secondary" onclick="window.print()">Cetak / PDF</button></div></div>`}}

async function pageMasters(){return `<div class="grid three"><div class="card"><h3>Pelanggaran</h3><div class="kpi-list">${state.masters.violations.slice(0,20).map(x=>`<div class="kpi-line"><span>${esc(x.code)} · ${esc(x.name)}</span><b>+${x.points}</b></div>`).join("")}</div></div><div class="card"><h3>Prestasi</h3><div class="kpi-list">${state.masters.achievements.slice(0,20).map(x=>`<div class="kpi-line"><span>${esc(x.code)} · ${esc(x.name)}</span><b>-${x.points}</b></div>`).join("")}</div></div><div class="card"><h3>Sanksi</h3><div class="kpi-list">${state.masters.sanctions.map(x=>`<div class="kpi-line"><span>Tingkat ${x.level} · ${esc(x.action)}</span><b>${x.points_from}+</b></div>`).join("")}</div></div></div><div class="card" style="margin-top:16px"><h3>Master data</h3><p class="hint">Daftar master disimpan per sekolah sehingga aturan tiap sekolah dapat berbeda tanpa memengaruhi sekolah lain.</p></div>`}

function pageSettings(){return `<div class="card"><h3>Identitas sekolah</h3><form id="schoolForm" class="form-grid"><label>Nama sekolah<input name="name" value="${esc(state.school.name)}" required></label><label>NPSN<input name="npsn" value="${esc(state.school.npsn)}"></label><label>Alamat<input name="address" value="${esc(state.school.address)}"></label><label>Telepon<input name="phone" value="${esc(state.school.phone)}"></label><label>Tahun pelajaran<input name="academic_year" value="${esc(state.school.academic_year)}"></label><label>Semester<input name="current_semester" value="${esc(state.school.current_semester)}"></label><div class="actions full"><button class="primary">Simpan pengaturan</button></div></form></div>`}
async function bindSettings(){$("#schoolForm").onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));const {data,error}=await sb.from("schools").update(d).eq("id",state.school.id).select().single();if(error)toast(error.message);else{state.school=data;$("#sideSchool").textContent=data.name;toast("Pengaturan tersimpan");}}}

function excelImport(){openModal("Import Excel",`<div class="card" style="box-shadow:none"><p>Import digunakan untuk memindahkan data siswa lama dari spreadsheet. Format kolom minimal: <b>NIS, NAMA SISWA, KELAS, WALI KELAS, NAMA ORANG TUA / WALI, NO. HP ORANG TUA, STATUS</b>.</p><input id="xlsxFile" type="file" accept=".xlsx,.xls,.csv"><p class="hint">Untuk file besar, proses dilakukan bertahap agar browser tetap responsif.</p><div class="actions"><button id="startImport" class="primary">Mulai import</button></div><div id="importResult"></div></div>`);$("#startImport").onclick=async()=>{const file=$("#xlsxFile").files[0];if(!file)return toast("Pilih file terlebih dahulu.");$("#importResult").textContent="Memproses...";const script=document.createElement("script");script.src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";script.onload=async()=>{try{const buf=await file.arrayBuffer();const wb=XLSX.read(buf,{type:"array"});const ws=wb.Sheets[wb.SheetNames.includes("DATA_SISWA")?"DATA_SISWA":wb.SheetNames[0]];const rows=XLSX.utils.sheet_to_json(ws,{defval:""});const payload=rows.map(r=>({school_id:state.school.id,nis:String(r.NIS||r["NIS SISWA"]||"").trim(),name:String(r["NAMA SISWA"]||r.NAMA||"").trim(),class_name:String(r.KELAS||"").trim(),homeroom_teacher:String(r["WALI KELAS"]||"").trim(),parent_name:String(r["NAMA ORANG TUA / WALI"]||r["NAMA ORANG TUA"]||"").trim(),parent_phone:String(r["NO. HP ORANG TUA"]||r["NO HP ORANG TUA"]||"").trim(),status:String(r.STATUS||"Aktif").trim(),notes:String(r.KETERANGAN||"").trim()})).filter(x=>x.nis&&x.name);let inserted=0;for(let i=0;i<payload.length;i+=200){const {error}=await sb.from("students").upsert(payload.slice(i,i+200),{onConflict:"school_id,nis"});if(error)throw error;inserted+=payload.slice(i,i+200).length;$("#importResult").textContent=`${inserted}/${payload.length} diproses...`}await loadStudents();$("#importResult").textContent=`Selesai. ${inserted} siswa diproses.`;toast("Import selesai");}catch(e){$("#importResult").textContent="Gagal: "+e.message}};document.head.appendChild(script)}}

function openModal(title,html){closeModal();const d=document.createElement("div");d.id="modal";d.className="modal";d.innerHTML=`<div class="modal-box"><div class="modal-head"><h2>${esc(title)}</h2><button class="close" data-close>✕</button></div>${html}</div>`;document.body.appendChild(d);$$("[data-close]",d).forEach(x=>x.onclick=closeModal)}
function closeModal(){$("#modal")?.remove()}

function bindPage(){const f={students:bindStudents,events:bindEvents,coaching:bindCoaching,semester:bindSemester,"student-card":bindStudentCard,letters:bindLetters,settings:bindSettings};f[state.page]?.();$$("[data-page]",$("#page")).forEach(b=>b.onclick=()=>{state.page=b.dataset.page;renderNav();renderPage()})}

$$(".auth-tab").forEach(b=>b.onclick=()=>showAuth(b.dataset.authTab));
$("#loginForm").onsubmit=async e=>{e.preventDefault();const {error}=await sb.auth.signInWithPassword({email:$("#loginEmail").value,password:$("#loginPassword").value});if(error)toast(error.message);else loadContext()};
$("#registerForm").onsubmit=async e=>{e.preventDefault();const email=$("#regEmail").value,password=$("#regPassword").value,name=$("#regName").value,school=$("#regSchool").value,npsn=$("#regNpsn").value;const {data,error}=await sb.auth.signUp({email,password,options:{data:{full_name:name,school_name:school,npsn}}});if(error){toast(error.message);return}if(data.user){toast("Akun dibuat. Jika email verification aktif, cek email Anda lalu login.");}showAuth("login")};
$("#logoutBtn").onclick=async()=>{await sb.auth.signOut();state.user=null;showAuth()};
$("#settingsBtn").onclick=()=>{state.page="settings";renderNav();renderPage()};
$("#menuBtn").onclick=()=>$(".sidebar").classList.toggle("open");
sb.auth.onAuthStateChange(()=>loadContext());
loadContext();

document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.add('hidden'));
    
    tab.classList.add('active');
    const targetForm = tab.dataset.tab === 'register' ? 'registerForm' : 'loginForm';
    document.getElementById(targetForm).classList.remove('hidden');
  });
});
