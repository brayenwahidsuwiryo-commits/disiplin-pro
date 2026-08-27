-- Disiplin Pro security hardening applied to production on 2026-08-27.
-- Adds audit_logs, immutable-by-client audit writes, and explicit RBAC policies.
-- See Supabase migration history for the executed migration.

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('INSERT','UPDATE','DELETE')),
  table_name text not null,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_school_created_idx on public.audit_logs(school_id, created_at desc);
create index if not exists audit_logs_actor_created_idx on public.audit_logs(actor_id, created_at desc);

alter table public.audit_logs enable row level security;
drop policy if exists "audit owner admin read" on public.audit_logs;
create policy "audit owner admin read" on public.audit_logs for select using (
  school_id = public.my_school_id() and exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role in ('owner','admin')
  )
);

create or replace function public.write_audit_log()
returns trigger language plpgsql security definer set search_path=public as $$
declare sid uuid; rid uuid;
begin
  sid := coalesce((to_jsonb(new)->>'school_id')::uuid, (to_jsonb(old)->>'school_id')::uuid);
  rid := coalesce((to_jsonb(new)->>'id')::uuid, (to_jsonb(old)->>'id')::uuid);
  insert into public.audit_logs(school_id,actor_id,action,table_name,record_id,old_data,new_data)
  values(sid,auth.uid(),tg_op,tg_table_name,rid,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end);
  return coalesce(new,old);
end $$;
revoke all on function public.write_audit_log() from public,anon,authenticated;

-- Triggers: schools, profiles, students, masters, events, coaching, archives.
-- Role policy definitions are maintained in the production migration:
-- owner: full control; admin: operational create/update; staff: read/create only.
