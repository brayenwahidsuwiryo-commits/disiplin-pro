-- Disiplin Pro: concurrent editing protection.
-- Production migration: optimistic-lock version columns + atomic RPC.
-- A save must provide the version read by that device; stale writes fail instead of silently overwriting newer data.

alter table public.students add column if not exists version bigint not null default 1;
alter table public.students add column if not exists updated_at timestamptz not null default now();
alter table public.discipline_events add column if not exists version bigint not null default 1;
alter table public.discipline_events add column if not exists updated_at timestamptz not null default now();
alter table public.coaching_records add column if not exists version bigint not null default 1;
alter table public.coaching_records add column if not exists updated_at timestamptz not null default now();
alter table public.semester_archives add column if not exists version bigint not null default 1;
alter table public.semester_archives add column if not exists updated_at timestamptz not null default now();

-- Atomic RPC is installed in production by migration optimistic_lock_rpc_multi_school.
-- It validates tenant (school_id), table allow-list, expected version, and increments version atomically.
