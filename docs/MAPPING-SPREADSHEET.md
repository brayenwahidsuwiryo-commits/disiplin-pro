# Mapping Spreadsheet → Web

| Sheet Excel | Modul Web | Database |
|---|---|---|
| SETUP | Pengaturan | schools |
| DATA_SISWA | Data Siswa | students |
| MASTER_PELANGGARAN | Master Pelanggaran | violation_types |
| MASTER_PRESTASI | Master Prestasi | achievement_types |
| MASTER_SANKSI | Master Sanksi | sanction_levels |
| CATATAN | Catatan Kejadian | discipline_events |
| PEMBINAAN | Pembinaan | coaching_records |
| POIN_SISWA | Detail poin siswa | view/perhitungan dari discipline_events |
| KARTU_SISWA | Kartu Siswa | students + discipline_events |
| SURAT | Surat | students + discipline_events |
| REKAP_KELAS | Rekap Kelas | agregasi students/events |
| REKAP_WALIKELAS | Rekap Wali Kelas | agregasi students/events |
| LAP_BULANAN | Laporan Bulanan | agregasi discipline_events |
| ANALISIS | Analisis Pola | agregasi discipline_events |
| TUTUP_SEMESTER | Arsip Semester | semester_archives |
| REF | Data referensi | master tables |

## Perbedaan penting dari Excel
Excel membatasi baris secara praktis sekitar 500 siswa dan 3.000 kejadian pada template. Web tidak memakai batas tersebut. Index database sudah disiapkan untuk pencarian berdasarkan sekolah, kelas, siswa, dan tanggal.

## Multi-school
Setiap tabel bisnis memiliki `school_id`. RLS memaksa query hanya mengakses `school_id` milik user yang sedang login. Jadi sekolah A tidak dapat membaca/mengubah data sekolah B walaupun mereka memakai aplikasi yang sama.

## Pengembangan berikutnya
- role admin/staff lebih granular
- audit log
- export XLSX/PDF
- QR code siswa
- import seluruh sheet Excel
- notifikasi WhatsApp/email
- dashboard kepala sekolah
- pagination server-side
- backup & restore
- subscription/billing SaaS
