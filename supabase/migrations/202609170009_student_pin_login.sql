-- Stage 2: name + PIN login for Student Portal.
-- Pre-login roster exposes only student id, name, and class.
-- PIN verification remains server-side and never returns a PIN hash.

create or replace function public.student_login_roster()
returns table (
  student_id uuid,
  full_name text,
  class_name text,
  class_order integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id as student_id,
    s.full_name,
    c.name as class_name,
    case c.name
      when 'X Abu Bakar' then 1
      when 'X Umar Bin Khattab' then 2
      when 'XI Utsmaniyyah' then 3
      when 'XII Abbasiyah' then 4
      else 99
    end as class_order
  from public.students s
  join public.classes c on c.id = s.class_id
  where s.is_active = true
    and c.name in ('X Abu Bakar', 'X Umar Bin Khattab', 'XI Utsmaniyyah', 'XII Abbasiyah')
  order by class_order, lower(s.full_name);
$$;

revoke all on function public.student_login_roster() from public;
grant execute on function public.student_login_roster() to anon;
grant execute on function public.student_login_roster() to authenticated;

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
begin
  if p_student_id is null or p_pin is null or p_pin !~ '^[0-9]{6}$' then
    return query select false, 'INVALID'::text, p_student_id;
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
      locked_until = case
        when v_next_attempt >= 5 then now() + interval '15 minutes'
        else null
      end,
      updated_at = now()
    where student_access_credentials.student_id = p_student_id;

    if v_next_attempt >= 5 then
      return query select false, 'LOCKED'::text, p_student_id;
    else
      return query select false, 'INVALID'::text, p_student_id;
    end if;
    return;
  end if;

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
revoke all on function public.verify_student_pin_login(uuid, text) from authenticated;
grant execute on function public.verify_student_pin_login(uuid, text) to service_role;
