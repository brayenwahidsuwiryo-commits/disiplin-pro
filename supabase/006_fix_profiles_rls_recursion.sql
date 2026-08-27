-- Production fix for: infinite recursion detected in policy for relation profiles
-- Applied to Supabase production as migration fix_profiles_rls_recursion.
-- Role/tenant lookups are performed by SECURITY DEFINER helpers with row_security=off.
-- profiles policies no longer query profiles directly.

create or replace function public.my_school_id()
returns uuid language sql stable security definer set search_path=public set row_security=off
as $$ select school_id from public.profiles where id=auth.uid() limit 1 $$;

create or replace function public.current_user_role()
returns text language sql stable security definer set search_path=public set row_security=off
as $$ select role from public.profiles where id=auth.uid() limit 1 $$;

grant execute on function public.my_school_id() to authenticated;
grant execute on function public.current_user_role() to authenticated;

-- Rebuild profiles policies without self-referencing subqueries.
drop policy if exists "profile own" on public.profiles;
drop policy if exists "profile owner read school" on public.profiles;
drop policy if exists "profile owner update" on public.profiles;
drop policy if exists "profile owner insert" on public.profiles;
drop policy if exists "profile owner delete" on public.profiles;

create policy "profile own" on public.profiles for select to authenticated using (id=auth.uid());
create policy "profile owner read school" on public.profiles for select to authenticated using (school_id=public.my_school_id() and public.current_user_role()='owner');
create policy "profile owner update" on public.profiles for update to authenticated using (school_id=public.my_school_id() and public.current_user_role()='owner') with check (school_id=public.my_school_id() and public.current_user_role()='owner');
create policy "profile owner insert" on public.profiles for insert to authenticated with check (school_id=public.my_school_id() and public.current_user_role()='owner');
create policy "profile owner delete" on public.profiles for delete to authenticated using (school_id=public.my_school_id() and public.current_user_role()='owner' and id<>auth.uid());

-- The protection trigger also uses the non-recursive helper.
create or replace function public.protect_profile_security_fields()
returns trigger language plpgsql security definer set search_path=public set row_security=off
as $$ begin
  if auth.uid() is not null and public.current_user_role()<>'owner' then
    new.id:=old.id; new.school_id:=old.school_id; new.role:=old.role;
  end if;
  return new;
end $$;
