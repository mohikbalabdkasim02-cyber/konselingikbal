create or replace function public.claim_student_account()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_student_id uuid;
  v_count integer;
  v_existing uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  v_email := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  if v_email = '' then
    raise exception 'EMAIL_REQUIRED';
  end if;

  select l.student_id into v_existing
  from public.student_auth_links l
  where l.auth_user_id = auth.uid();

  if v_existing is not null then
    return v_existing;
  end if;

  select count(*), min(s.id)
  into v_count, v_student_id
  from public.students s
  where s.is_active = true
    and s.email is not null
    and lower(trim(s.email)) = v_email;

  if v_count = 0 then
    raise exception 'STUDENT_EMAIL_NOT_FOUND';
  end if;

  if v_count > 1 then
    raise exception 'STUDENT_EMAIL_NOT_UNIQUE';
  end if;

  if exists(select 1 from public.student_auth_links l where l.student_id = v_student_id and l.auth_user_id <> auth.uid()) then
    raise exception 'STUDENT_ALREADY_LINKED';
  end if;

  insert into public.student_auth_links(student_id, auth_user_id)
  values (v_student_id, auth.uid())
  on conflict (student_id) do update set auth_user_id = excluded.auth_user_id;

  return v_student_id;
end;
$$;

grant execute on function public.claim_student_account() to authenticated;
