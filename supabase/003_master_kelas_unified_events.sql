-- DISIPLIN PRO — master kelas + unified pelanggaran/prestasi/sanksi + semester close
-- Jalankan sekali di Supabase SQL Editor setelah schema.sql.

alter table public.schools
  add column if not exists settings jsonb not null default '{}'::jsonb;

alter table public.discipline_events
  add column if not exists event_type text,
  add column if not exists sanction_level_id uuid references public.sanction_levels(id) on delete set null;

update public.discipline_events
set event_type = case when achievement_type_id is not null then 'prestasi' else 'pelanggaran' end
where event_type is null;

-- Hapus constraint lama yang memaksa hanya pelanggaran/prestasi.
do $$
declare r record;
begin
  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.discipline_events'::regclass
      and pg_get_constraintdef(oid) like '%violation_type_id%'
      and pg_get_constraintdef(oid) like '%achievement_type_id%'
  loop
    execute format('alter table public.discipline_events drop constraint if exists %I', r.conname);
  end loop;
end $$;

alter table public.discipline_events drop constraint if exists discipline_events_event_type_check;
alter table public.discipline_events
  add constraint discipline_events_event_type_check
  check (event_type in ('pelanggaran','prestasi','sanksi'));

alter table public.discipline_events drop constraint if exists discipline_events_master_type_check;
alter table public.discipline_events
  add constraint discipline_events_master_type_check
  check (
    (event_type='pelanggaran' and violation_type_id is not null and achievement_type_id is null and sanction_level_id is null)
    or (event_type='prestasi' and violation_type_id is null and achievement_type_id is not null and sanction_level_id is null)
    or (event_type='sanksi' and violation_type_id is null and achievement_type_id is null and sanction_level_id is not null)
  );

alter table public.semester_archives
  add column if not exists snapshot jsonb not null default '{}'::jsonb,
  add column if not exists closed_at timestamptz;

create index if not exists events_type_idx
  on public.discipline_events(school_id,event_type,event_date desc);
