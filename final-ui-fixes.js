(() => {
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];

  // Rekap Wali Kelas sudah digabung ke tampilan rekap/dashboard.
  // Hapus item navigasinya setiap kali app merender ulang sidebar.
  function removeHomeroomNav() {
    $$('[data-page="homerooms"]').forEach(el => el.remove());
    if ($('#pageTitle')?.textContent?.trim() === 'Rekap Wali Kelas') {
      const reportBtn = $('[data-page="reports"]');
      if (reportBtn) reportBtn.click();
    }
  }

  const navObserver = new MutationObserver(removeHomeroomNav);
  const nav = $('#nav');
  if (nav) navObserver.observe(nav, { childList: true, subtree: true });
  removeHomeroomNav();

  // Tombol WhatsApp untuk halaman Surat / Panggilan Orang Tua.
  const cleanPhone = raw => {
    let p = String(raw || '').replace(/[^0-9]/g, '');
    if (p.startsWith('0')) p = '62' + p.slice(1);
    else if (p.startsWith('8')) p = '62' + p;
    return p;
  };

  const makeMessage = (student, type) => {
    const name = student?.name || 'siswa';
    const cls = student?.class_name ? ` kelas ${student.class_name}` : '';
    if (type === 'panggilan') {
      return `Assalamu'alaikum Bapak/Ibu orang tua/wali dari ${name}${cls}. Kami dari sekolah ingin menyampaikan pemberitahuan dan mengundang Bapak/Ibu untuk berkomunikasi terkait perkembangan siswa. Mohon kesediaannya untuk membalas pesan ini agar informasi dapat kami sampaikan dengan baik. Terima kasih.`;
    }
    return `Assalamu'alaikum Bapak/Ibu orang tua/wali dari ${name}${cls}. Kami dari sekolah ingin menyampaikan pemberitahuan terkait siswa. Mohon kesediaannya untuk berkomunikasi dengan pihak sekolah melalui WhatsApp ini. Terima kasih.`;
  };

  function addWaButton() {
    if (($('#pageTitle')?.textContent || '').trim() !== 'Surat') return;
    const generate = $('#generateLetter');
    if (!generate || $('#waParentLetter')) return;

    const btn = document.createElement('a');
    btn.id = 'waParentLetter';
    btn.className = 'secondary';
    btn.target = '_blank';
    btn.rel = 'noopener';
    btn.textContent = 'WhatsApp Orang Tua';
    btn.style.marginLeft = '8px';
    btn.style.display = 'inline-flex';
    btn.style.textDecoration = 'none';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';

    const update = () => {
      const select = $('#letterStudent');
      const studentId = select?.value;
      const stateStudents = window.__DISIPLIN_PRO_STUDENTS__ || [];
      let student = stateStudents.find(s => String(s.id) === String(studentId));

      // Fallback membaca option jika state internal tidak tersedia.
      if (!student && select?.selectedOptions?.[0]) {
        const text = select.selectedOptions[0].textContent || '';
        student = { name: text.replace(/^.*?—\s*/, '').replace(/\s*\([^)]*\)\s*$/, '').trim() };
      }

      const phone = cleanPhone(student?.parent_phone);
      const type = ($('#letterType')?.value || '').toLowerCase().includes('panggilan') ? 'panggilan' : 'pemberitahuan';
      if (!phone) {
        btn.removeAttribute('href');
        btn.setAttribute('aria-disabled', 'true');
        btn.title = 'Nomor WhatsApp orang tua belum diisi';
        btn.style.opacity = '.55';
        btn.style.pointerEvents = 'auto';
      } else {
        btn.href = `https://wa.me/${phone}?text=${encodeURIComponent(makeMessage(student, type))}`;
        btn.removeAttribute('aria-disabled');
        btn.title = 'Kirim pemberitahuan melalui WhatsApp';
        btn.style.opacity = '';
      }
    };

    generate.insertAdjacentElement('afterend', btn);
    $('#letterStudent')?.addEventListener('change', update);
    $('#letterType')?.addEventListener('change', update);
    update();
  }

  // Ambil data siswa dari Supabase tanpa bergantung pada variabel module app.js.
  async function exposeStudents() {
    try {
      const cfg = window.APP_CONFIG || {};
      if (!window.supabase || !cfg.supabaseUrl || !cfg.supabaseAnonKey) return;
      const db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
      const { data: { user } } = await db.auth.getUser();
      if (!user) return;
      const { data: profile } = await db.from('profiles').select('school_id').eq('id', user.id).single();
      if (!profile?.school_id) return;
      const { data } = await db.from('students').select('id,name,class_name,parent_phone').eq('school_id', profile.school_id).limit(5000);
      window.__DISIPLIN_PRO_STUDENTS__ = data || [];
      addWaButton();
    } catch (_) {}
  }

  const pageObserver = new MutationObserver(() => {
    removeHomeroomNav();
    addWaButton();
  });
  const page = $('#page');
  if (page) pageObserver.observe(page, { childList: true, subtree: true });
  exposeStudents();
})();
