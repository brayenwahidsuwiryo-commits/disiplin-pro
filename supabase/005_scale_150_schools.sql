-- Scale target: 150 schools with many concurrent devices.
-- No application/device login cap is introduced.
-- Production migration already applied to Supabase.
create index if not exists idx_profiles_school_id on public.profiles(school_id);
create index if not exists idx_students_school_id on public.students(school_id);
create index if not exists idx_violation_types_school_id on public.violation_types(school_id);
create index if not exists idx_achievement_types_school_id on public.achievement_types(school_id);
create index if not exists idx_sanction_levels_school_id on public.sanction_levels(school_id);
create index if not exists idx_discipline_events_school_id_created on public.discipline_events(school_id, created_at desc);
create index if not exists idx_coaching_records_school_id_created on public.coaching_records(school_id, created_at desc);
create index if not exists idx_semester_archives_school_id_created on public.semester_archives(school_id, created_at desc);
create index if not exists idx_audit_logs_school_id_created on public.audit_logs(school_id, created_at desc);
create index if not exists idx_audit_logs_school_actor_created on public.audit_logs(school_id, actor_id, created_at desc);
