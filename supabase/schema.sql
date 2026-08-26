-- DISIPLIN PRO WEB -- Schema Database Lengkap

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

-- 2. TRIGGER DUKUNGAN PENDAFTARAN (PENTING)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path=public
as $$
declare
  new_school uuid;
begin
  insert into schools(name, npsn)
  values (
    coalesce(new.raw_user_meta_data->>'school_name', 'Sekolah Baru'),
    nullif(new.raw_user_meta_data->>'npsn', '')
  )
  returning id into new_school;

  insert into profiles(id, school_id, full_name, role)
  values(
    new.id,
    new_school,
    coalesce(new.raw_user_meta_data->>'full_name', 'Pengelola'),
    'owner'
  );

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. RLS POLICIES & SECURITY
create or replace function public.my_school_id()
returns uuid
language sql stable security definer set search_path=public
as $$
  select school_id from public.profiles where id = auth.uid()
$$;

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

create policy "school own" on schools for select using (id = public.my_school_id());
create policy "school update" on schools for update using (id = public.my_school_id());
create policy "profile own" on profiles for select using (id = auth.uid());
create policy "students tenant" on students for all using (school_id = public.my_school_id()) with check (school_id = public.my_school_id());
create policy "violations tenant" on violation_types for all using (school_id = public.my_school_id()) with check (school_id = public.my_school_id());
create policy "achievements tenant" on achievement_types for all using (school_id = public.my_school_id()) with check (school_id = public.my_school_id());
create policy "sanctions tenant" on sanction_levels for all using (school_id = public.my_school_id()) with check (school_id = public.my_school_id());
create policy "events tenant" on discipline_events for all using (school_id = public.my_school_id()) with check (school_id = public.my_school_id());
create policy "coaching tenant" on coaching_records for all using (school_id = public.my_school_id()) with check (school_id = public.my_school_id());
create policy "archives tenant" on semester_archives for all using (school_id = public.my_school_id()) with check (school_id = public.my_school_id());
