-- Multi-Website Authentication & Authorization Helper Functions
-- Allows any ecosystem website to check access and safely enroll cross-site users

-- 1. Check whether a user has an active role for a specific website
create or replace function public.has_website_access(
  p_website_id uuid,
  p_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists (
    select 1
    from public.user_roles ur
    join public.user_profiles up on up.id = ur.user_profile_id
    join public.website_roles wr on wr.id = ur.website_role_id
    where up.user_id = p_user_id
      and wr.website_id = p_website_id
  );
end;
$$;

grant execute on function public.has_website_access(uuid, uuid) to authenticated, anon, service_role;

-- 2. Explicitly enroll a user into a website with a specific role
create or replace function public.enroll_user_in_website(
  p_website_id uuid,
  p_user_id uuid,
  p_role_name text default 'user',
  p_full_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_role_id uuid;
  v_user_role_id uuid;
  v_email text;
begin
  -- Retrieve user email from auth.users
  select email into v_email from auth.users where id = p_user_id;
  if v_email is null then
    raise exception 'User not found in auth.users';
  end if;

  -- Ensure profile exists
  select id into v_profile_id from public.user_profiles where user_id = p_user_id limit 1;
  if v_profile_id is null then
    insert into public.user_profiles (user_id, email, full_name)
    values (p_user_id, v_email, p_full_name)
    returning id into v_profile_id;
  end if;

  -- Resolve website role ID
  select id into v_role_id from public.website_roles 
  where website_id = p_website_id and role = p_role_name limit 1;
  
  if v_role_id is null then
    raise exception 'Role "%" not found for website %', p_role_name, p_website_id;
  end if;

  -- Link user profile to website role (safe conflict handling)
  insert into public.user_roles (user_profile_id, website_role_id)
  values (v_profile_id, v_role_id)
  on conflict (user_profile_id, website_role_id) do update 
    set website_role_id = excluded.website_role_id
  returning id into v_user_role_id;

  return v_user_role_id;
end;
$$;

grant execute on function public.enroll_user_in_website(uuid, uuid, text, text) to authenticated, service_role;
