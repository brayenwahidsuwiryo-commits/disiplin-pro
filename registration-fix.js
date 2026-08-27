// Registration/login recovery layer.
// Handles the common case where Auth user creation succeeded but school/profile setup did not.
(() => {
  const cfg = window.APP_CONFIG || {};
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey || !window.supabase) return;
  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);

  const $ = (s) => document.querySelector(s);
  const toast = (msg) => {
    const el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(window.__dpToast);
    window.__dpToast = setTimeout(() => el.classList.remove('show'), 3200);
  };

  async function finishSchoolSetup(user, schoolName, npsn, fullName) {
    const { data: profile, error: profileError } = await sb
      .from('profiles').select('id,school_id,full_name,role').eq('id', user.id).maybeSingle();
    if (profileError) throw profileError;
    if (profile?.school_id) return { existing: true, profile };

    const { error } = await sb.rpc('create_school_for_current_user', {
      p_school_name: schoolName,
      p_npsn: npsn || null,
      p_full_name: fullName || user.user_metadata?.full_name || 'Pengelola Sekolah'
    });
    if (error) throw error;
    return { existing: false };
  }

  function setBusy(form, busy) {
    form.querySelectorAll('button,input').forEach(el => el.disabled = busy);
    const button = form.querySelector('button[type="submit"]');
    if (button) button.textContent = busy ? 'Memproses...' : 'Buat Akun Sekolah';
  }

  document.addEventListener('submit', async (event) => {
    const form = event.target;
    if (!form || form.id !== 'registerForm') return;
    event.preventDefault();
    event.stopImmediatePropagation();

    const schoolName = $('#regSchool')?.value.trim();
    const npsn = $('#regNpsn')?.value.trim();
    const fullName = $('#regName')?.value.trim();
    const email = $('#regEmail')?.value.trim();
    const password = $('#regPassword')?.value || '';
    if (!schoolName || !fullName || !email || password.length < 8) {
      toast('Lengkapi data sekolah, nama pengelola, email, dan password minimal 8 karakter.');
      return;
    }

    setBusy(form, true);
    try {
      let user = null;
      let session = null;
      const signup = await sb.auth.signUp({
        email,
        password,
        options: { data: { school_name: schoolName, npsn: npsn || null, full_name: fullName } }
      });

      if (!signup.error) {
        user = signup.data.user;
        session = signup.data.session;
      } else if (/already registered|already exists|user already/i.test(signup.error.message || '')) {
        // Previous attempt may have created Auth but not the school. Recover it
        // by signing in with the credentials just entered, then complete setup.
        const login = await sb.auth.signInWithPassword({ email, password });
        if (login.error) throw new Error('Email sudah terdaftar. Gunakan Login dengan password akun tersebut.');
        user = login.data.user;
        session = login.data.session;
      } else {
        throw signup.error;
      }

      if (!user || !session) {
        toast('Akun berhasil dibuat. Jika email confirmation aktif, konfirmasi email dulu, lalu login untuk menyelesaikan pembuatan sekolah.');
        return;
      }

      const result = await finishSchoolSetup(user, schoolName, npsn, fullName);
      if (result.existing) {
        toast('Akun ini sudah terhubung ke sekolah. Membuka sekolah tersebut...');
      } else {
        toast('Sekolah berhasil dibuat. Membuka Disiplin Pro...');
      }
      setTimeout(() => window.location.reload(), 450);
    } catch (error) {
      console.error('[Disiplin Pro registration]', error);
      toast(error?.message || 'Pendaftaran gagal. Silakan coba lagi.');
    } finally {
      setBusy(form, false);
    }
  }, true);
})();
