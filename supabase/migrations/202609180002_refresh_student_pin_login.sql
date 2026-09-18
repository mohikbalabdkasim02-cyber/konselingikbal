-- Refresh Student Portal PIN login RPC after restoring student_auth_links.
-- Keeps existing PIN/auth behavior; also refreshes PostgREST schema cache.

create or replace function public.verify_student_pin_login(
  p_student_id uuid,
  p_pin text
)
returns table (
  ok boolean,
  code text,
  student_id uuid
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_pin_hash text;
  v_failed_attempts integer;
  v_locked_until timestamptz;
  v_is_active boolean;
  v_next_attempt integer;
  v_existing_student_id uuid;
begin
  if auth.uid() is null then
    return query select false, 'AUTH_REQUIRED'::text, p_student_id;
    return;
  end if;

  if p_student_id is null or p_pin is null or p_pin !~ '^[0-9]{6}$' then
    return query select false, 'INVALID'::text, p_student_id;
    return;
  end if;

  select l.student_id
  into v_existing_student_id
  from public.student_auth_links l
  where l.auth_user_id = auth.uid();

  if v_existing_student_id is not null and v_existing_student_id <> p_student_id then
    return query select false, 'SESSION_ALREADY_LINKED'::text, p_student_id;
    return;
  end if;

  select
    c.pin_hash,
    c.failed_attempts,
    c.locked_until,
    c.is_active
  into
    v_pin_hash,
    v_failed_attempts,
    v_locked_until,
    v_is_active
  from public.student_access_credentials c
  join public.students s on s.id = c.student_id
  where c.student_id = p_student_id
    and s.is_active = true
  for update of c;

  if v_pin_hash is null or coalesce(v_is_active, false) = false then
    return query select false, 'INVALID'::text, p_student_id;
    return;
  end if;

  if v_locked_until is not null and v_locked_until > now() then
    return query select false, 'LOCKED'::text, p_student_id;
    return;
  end if;

  if crypt(p_pin, v_pin_hash) <> v_pin_hash then
    v_next_attempt := coalesce(v_failed_attempts, 0) + 1;

    update public.student_access_credentials
    set
      failed_attempts = v_next_attempt,
      locked_until = case when v_next_attempt >= 5 then now() + interval '15 minutes' else null end,
      updated_at = now()
    where student_access_credentials.student_id = p_student_id;

    if v_next_attempt >= 5 then
      return query select false, 'LOCKED'::text, p_student_id;
    else
      return query select false, 'INVALID'::text, p_student_id;
    end if;
    return;
  end if;

  insert into public.student_auth_links(student_id, auth_user_id)
  values (p_student_id, auth.uid())
  on conflict on constraint student_auth_links_pkey do update
  set
    auth_user_id = excluded.auth_user_id,
    created_at = now();

  update public.student_access_credentials
  set
    failed_attempts = 0,
    locked_until = null,
    last_login_at = now(),
    updated_at = now()
  where student_access_credentials.student_id = p_student_id;

  return query select true, 'OK'::text, p_student_id;
end;
$$;

revoke all on function public.verify_student_pin_login(uuid, text) from public;
revoke all on function public.verify_student_pin_login(uuid, text) from anon;
grant execute on function public.verify_student_pin_login(uuid, text) to authenticated;

notify pgrst, 'reload schema';
