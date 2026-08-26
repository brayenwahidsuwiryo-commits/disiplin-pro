-- Hapus policy lama jika sudah ada agar tidak error bentrok
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

-- Jalankan ulang pembuatan policy
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
