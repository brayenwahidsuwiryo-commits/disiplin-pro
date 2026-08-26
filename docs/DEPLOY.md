# Deploy

## Supabase
1. Buat project.
2. SQL Editor → jalankan `supabase/schema.sql`.
3. Authentication → Providers → Email aktif.
4. Jika ingin login langsung tanpa verifikasi email saat development, nonaktifkan Confirm email. Untuk produksi sebaiknya aktifkan.
5. Ambil Project URL dan Publishable/Anon Key.

## Vercel
- Import folder project ke GitHub.
- Deploy sebagai static site.
- Tidak membutuhkan build command.
- `config.js` harus berisi Supabase URL dan anon key.

## Cloudflare Pages
- Upload folder atau hubungkan Git.
- Framework preset: None.
- Build command: kosong.
- Output directory: `.`
- `config.js` sama.

## Keamanan
- Hanya gunakan anon/publishable key di browser.
- RLS adalah lapisan isolasi tenant yang wajib.
- Jangan menonaktifkan RLS.
- Untuk aplikasi komersial, tambahkan verifikasi email, MFA bila diperlukan, audit log, rate limiting, dan backup.
