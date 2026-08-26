# DISIPLIN PRO WEB

Web app multi-sekolah untuk menggantikan spreadsheet tata tertib siswa.

## Arsitektur
- Frontend: HTML + CSS + Vanilla JavaScript
- Database + Auth: Supabase PostgreSQL
- Hosting frontend: Vercel atau Cloudflare Pages
- Isolasi sekolah: `school_id` + PostgreSQL Row Level Security (RLS)
- Kapasitas desain: ribuan siswa dan puluhan ribu catatan per sekolah

## Modul
- Login / daftar sekolah
- Dashboard
- Data siswa
- Catatan pelanggaran & prestasi
- Poin otomatis
- Pembinaan
- Sanksi otomatis
- Kartu siswa
- Surat pemberitahuan/panggilan
- Rekap kelas
- Rekap wali kelas
- Laporan bulanan
- Analisis pola
- Arsip semester
- Master pelanggaran, prestasi, sanksi
- Import Excel
- Pengaturan sekolah

## Setup singkat
1. Buat project Supabase.
2. Buka SQL Editor dan jalankan `supabase/schema.sql`.
3. Aktifkan Email/Password pada Authentication.
4. Salin Project URL dan anon key.
5. Edit `config.js` dan isi URL + anon key.
6. Buka `index.html` untuk pengujian lokal melalui static server.
7. Deploy folder ini ke Vercel/Cloudflare Pages.

> Jangan pernah memasukkan `service_role` key ke frontend.

## Registrasi sekolah
Pendaftaran membuat akun Supabase Auth + sekolah baru + profil owner. Semua data bisnis memiliki `school_id`. RLS memastikan akun sekolah A tidak dapat membaca data sekolah B.

## Catatan penting
Versi ini adalah fondasi produksi yang sudah memindahkan logika spreadsheet ke database. Sebelum dipakai komersial, aktifkan email verification, custom SMTP, backup database, audit log, dan domain produksi.
