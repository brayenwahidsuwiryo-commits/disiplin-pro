-- DISIPLIN PRO WEB -- Schema Database Lengkap (Fixed)
create extension if not exists pgcrypto;

-- 1. TABEL UTAMA
create table if not exists schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  npsn text,
  address text,
  phone text,
  academic_year text default '2026/2027',
  current_semester text default 'Ganjil',
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  school_id uuid not null references schools(id) on delete cascade,
  full_name text not null,
  role text not null default 'owner' check (role in ('owner','admin','staff')),
  created_at timestamptz not null default now()
);

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  nis text not null,
  name text not null,
  class_name text,
  homeroom_teacher text,
  parent_name text,
  parent_phone text,
  status text not null default 'Aktif',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(school_id, nis)
);

create table if not exists violation_types (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  code text not null,
  name text not null,
  category text,
  points numeric not null default 0,
  description text,
  active boolean not null default true,
  unique(school_id, code)
);

create table if not exists achievement_types (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  code text not null,
  name text not null,
  level text,
  points numeric not null default 0,
  description text,
  active boolean not null default true,
  unique(school_id, code)
);

create table if not exists sanction_levels (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  level int not null,
  points_from numeric not null default 0,
  points_to numeric,
  action text not null,
  executor text,
  notes text,
  active boolean not null default true,
  unique(school_id, level)
);

create table if not exists discipline_events (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  violation_type_id uuid references violation_types(id) on delete restrict,
  achievement_type_id uuid references achievement_types(id) on delete restrict,
  event_date date not null default current_date,
  points numeric not null,
  description text,
  recorded_by_name text,
  follow_up text,
  created_at timestamptz not null default now(),
  check ((violation_type_id is not null and achievement_type_id is null) or (violation_type_id is null and achievement_type_id is not null))
);

create table if not exists coaching_records (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  coaching_date date not null default current_date,
  coach_name text,
  problem text not null,
  action text not null,
  result text not null default 'Perlu Lanjut',
  next_review date,
  created_at timestamptz not null default now()
);

create table if not exists semester_archives (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  semester_name text not null,
  student_count int not null default 0,
  total_points numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists students_school_idx on students(school_id);
create index if not exists students_class_idx on students(school_id,class_name);
create index if not exists events_school_date_idx on discipline_events(school_id,event_date desc);
create index if not exists events_student_idx on discipline_events(student_id);
create index if not exists coaching_school_date_idx on coaching_records(school_id,coaching_date desc);

-- 2. TRIGGER DUKUNGAN PENDAFTARAN (FUNGSI UTAMA)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public
as $$
declare new_school uuid;
begin
  insert into schools(name,npsn) values (
    coalesce(new.raw_user_meta_data->>'school_name','Sekolah Baru'),
    nullif(new.raw_user_meta_data->>'npsn','')
  ) returning id into new_school;

  insert into profiles(id,school_id,full_name,role)
  values(new.id,new_school,coalesce(new.raw_user_meta_data->>'full_name','Pengelola'),'owner');

  insert into violation_types(school_id,code,name,category,points,description) values
    (new_school,'P-101','Terlambat masuk sekolah','Kerajinan & Kehadiran',2,'Lewat bel masuk'),
    (new_school,'P-102','Tidak masuk tanpa keterangan (alpa)','Kerajinan & Kehadiran',5,'Per hari'),
    (new_school,'P-103','Membolos saat jam pelajaran','Kerajinan & Kehadiran',10,'Meninggalkan kelas tanpa izin'),
    (new_school,'P-201','Tidak memakai atribut lengkap','Kerapian & Seragam',3,'Atribut tidak lengkap'),
    (new_school,'P-407','Membuang sampah sembarangan','Kebersihan',3,'Tidak menjaga kebersihan');

  insert into achievement_types(school_id,code,name,level,points,description) values
    (new_school,'R-01','Juara 1 lomba tingkat sekolah','Sekolah',10,'Pengurang poin'),
    (new_school,'R-02','Juara 2-3 lomba tingkat sekolah','Sekolah',7,'Pengurang poin'),
    (new_school,'R-03','Juara lomba tingkat kecamatan','Kecamatan',15,'Pengurang poin');

  insert into sanction_levels(school_id,level,points_from,points_to,action,executor) values
    (new_school,1,0,9,'Pembinaan lisan','Wali Kelas'),
    (new_school,2,10,24,'Teguran tertulis + panggilan siswa','Wali Kelas'),
    (new_school,3,25,49,'Surat pemberitahuan ke orang tua','Guru BK'),
    (new_school,4,50,74,'Panggilan orang tua ke sekolah','Guru BK + Wali Kelas'),
    (new_school,5,75,null,'Penanganan lanjutan sesuai tata tertib sekolah','Tim Kesiswaan');

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

-- 3. RLS POLICIES & SECURITY
create or replace function public.my_school_id()
returns uuid language sql stable security definer set search_path=public
as $$ select school_id from public.profiles where id=auth.uid() $$;

alter table schools enable row level security;
alter table profiles enable row level security;
alter table students enable row level security;
alter table violation_types enable row level security;
alter table achievement_types enable row level security;
alter table sanction_levels enable row level security;
alter table discipline_events enable row level security;
alter table coaching_records enable row level security;
alter table semester_archives enable row level security;

drop policy if exists "school own" on schools;
drop policy if exists "school update" on schools;
drop policy if exists "profile own" on profiles;
drop policy if exists "students tenant" on students;
drop policy if exists "violations tenant" on violation_types;
drop policy if exists "achievements tenant" on achievement_types;
drop policy if exists "sanctions tenant" on sanction_levels;
drop policy if exists "events tenant" on discipline_events;
drop policy if exists "coaching tenant" on coaching_records;
drop policy if exists "archives tenant" on semester_archives;

create policy "school own" on schools for select using (id=public.my_school_id());
create policy "school update" on schools for update using (id=public.my_school_id());
create policy "profile own" on profiles for select using (id=auth.uid());

create policy "students tenant" on students for all using (school_id=public.my_school_id()) with check (school_id=public.my_school_id());
create policy "violations tenant" on violation_types for all using (school_id=public.my_school_id()) with check (school_id=public.my_school_id());
create policy "achievements tenant" on achievement_types for all using (school_id=public.my_school_id()) with check (school_id=public.my_school_id());
create policy "sanctions tenant" on sanction_levels for all using (school_id=public.my_school_id()) with check (school_id=public.my_school_id());
create policy "events tenant" on discipline_events for all using (school_id=public.my_school_id()) with check (school_id=public.my_school_id());
create policy "coaching tenant" on coaching_records for all using (school_id=public.my_school_id()) with check (school_id=public.my_school_id());
create policy "archives tenant" on semester_archives for all using (school_id=public.my_school_id()) with check (school_id=public.my_school_id());

-- 4. VIEW SUMMARY (DENGAN SECURITY INVOKER UNTUK MENCEGAH CRASH)
create or replace view student_point_summary 
with (security_invoker = true) as
select
  s.id,s.school_id,s.nis,s.name,s.class_name,s.homeroom_teacher,s.status,
  coalesce(sum(case when e.points > 0 then e.points else 0 end),0) as violation_points,
  coalesce(sum(case when e.points < 0 then abs(e.points) else 0 end),0) as achievement_points,
  greatest(coalesce(sum(e.points),0),0) as net_points,
  count(e.id) as event_count
from students s
left join discipline_events e on e.student_id=s.id
group by s.id;
