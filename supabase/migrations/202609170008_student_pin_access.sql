-- Stage 1: secure student PIN credential foundation.
-- IMPORTANT: Initial student names/PINs are intentionally NOT stored in this public repository.
-- The 116 initial PIN assignments are sent directly to Supabase as a staff-only JSON payload.

create extension if not exists pgcrypto;

create table if not exists public.student_access_credentials (
  student_id uuid primary key references public.students(id) on delete cascade,
  pin_hash text not null,
  is_active boolean not null default true,
  must_change_pin boolean not null default true,
  failed_attempts integer not null default 0 check (failed_attempts >= 0),
  locked_until timestamptz,
  last_login_at timestamptz,
  pin_changed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.student_access_credentials enable row level security;

revoke all on table public.student_access_credentials from anon;
revoke all on table public.student_access_credentials from authenticated;
grant select, insert, update, delete on table public.student_access_credentials to authenticated;

drop policy if exists "staff manage student access credentials" on public.student_access_credentials;
create policy "staff manage student access credentials"
on public.student_access_credentials
for all
to authenticated
using (public.assessment_is_staff())
with check (public.assessment_is_staff());

create or replace function public.set_student_pin(
  p_student_id uuid,
  p_pin text
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if auth.uid() is null or not public.assessment_is_staff() then
    raise exception 'STAFF_REQUIRED';
  end if;

  if p_pin is null or p_pin !~ '^[0-9]{6}$' then
    raise exception 'PIN_FORMAT_INVALID';
  end if;

  if not exists (
    select 1
    from public.students s
    where s.id = p_student_id
      and s.is_active = true
  ) then
    raise exception 'ACTIVE_STUDENT_NOT_FOUND';
  end if;

  insert into public.student_access_credentials (
    student_id,
    pin_hash,
    is_active,
    must_change_pin,
    failed_attempts,
    locked_until,
    pin_changed_at,
    updated_at
  ) values (
    p_student_id,
    crypt(p_pin, gen_salt('bf', 10)),
    true,
    true,
    0,
    null,
    now(),
    now()
  )
  on conflict (student_id) do update set
    pin_hash = crypt(p_pin, gen_salt('bf', 10)),
    is_active = true,
    must_change_pin = true,
    failed_attempts = 0,
    locked_until = null,
    pin_changed_at = now(),
    updated_at = now();
end;
$$;

revoke all on function public.set_student_pin(uuid, text) from public;
grant execute on function public.set_student_pin(uuid, text) to authenticated;

create or replace function public.seed_initial_student_pins(
  p_assignments jsonb
)
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_resolved_count integer;
begin
  if auth.uid() is null or not public.assessment_is_staff() then
    raise exception 'STAFF_REQUIRED';
  end if;

  if p_assignments is null
     or jsonb_typeof(p_assignments) <> 'array'
     or jsonb_array_length(p_assignments) <> 116 then
    raise exception 'PIN_ASSIGNMENT_COUNT_INVALID';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_assignments)
      as x(class_name text, student_name text, pin text)
    where x.pin is null or x.pin !~ '^[0-9]{6}$'
  ) then
    raise exception 'PIN_FORMAT_INVALID';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_assignments)
      as x(class_name text, student_name text, pin text)
    group by x.pin
    having count(*) > 1
  ) then
    raise exception 'PIN_DUPLICATE';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_assignments)
      as x(class_name text, student_name text, pin text)
    group by lower(regexp_replace(trim(x.class_name), '\s+', ' ', 'g')),
             lower(regexp_replace(trim(x.student_name), '\s+', ' ', 'g'))
    having count(*) > 1
  ) then
    raise exception 'STUDENT_MAPPING_DUPLICATE';
  end if;

  with payload as (
    select
      lower(regexp_replace(trim(x.class_name), '\s+', ' ', 'g')) as class_key,
      lower(regexp_replace(trim(x.student_name), '\s+', ' ', 'g')) as student_key,
      x.pin
    from jsonb_to_recordset(p_assignments)
      as x(class_name text, student_name text, pin text)
  ), resolved as (
    select s.id as student_id, p.pin
    from payload p
    join public.classes c
      on lower(regexp_replace(trim(c.name), '\s+', ' ', 'g')) = p.class_key
    join public.students s
      on s.class_id = c.id
     and s.is_active = true
     and lower(regexp_replace(trim(s.full_name), '\s+', ' ', 'g')) = p.student_key
  )
  select count(distinct student_id)
  into v_resolved_count
  from resolved;

  if v_resolved_count <> 116 then
    raise exception 'STUDENT_MAPPING_NOT_FOUND';
  end if;

  with payload as (
    select
      lower(regexp_replace(trim(x.class_name), '\s+', ' ', 'g')) as class_key,
      lower(regexp_replace(trim(x.student_name), '\s+', ' ', 'g')) as student_key,
      x.pin
    from jsonb_to_recordset(p_assignments)
      as x(class_name text, student_name text, pin text)
  ), resolved as (
    select s.id as student_id, p.pin
    from payload p
    join public.classes c
      on lower(regexp_replace(trim(c.name), '\s+', ' ', 'g')) = p.class_key
    join public.students s
      on s.class_id = c.id
     and s.is_active = true
     and lower(regexp_replace(trim(s.full_name), '\s+', ' ', 'g')) = p.student_key
  )
  insert into public.student_access_credentials (
    student_id,
    pin_hash,
    is_active,
    must_change_pin,
    failed_attempts,
    locked_until,
    pin_changed_at,
    updated_at
  )
  select
    r.student_id,
    crypt(r.pin, gen_salt('bf', 10)),
    true,
    true,
    0,
    null,
    now(),
    now()
  from resolved r
  on conflict (student_id) do update set
    pin_hash = excluded.pin_hash,
    is_active = true,
    must_change_pin = true,
    failed_attempts = 0,
    locked_until = null,
    pin_changed_at = now(),
    updated_at = now();

  return v_resolved_count;
end;
$$;

revoke all on function public.seed_initial_student_pins(jsonb) from public;
grant execute on function public.seed_initial_student_pins(jsonb) to authenticated;

comment on table public.student_access_credentials is
  'Private hashed PIN credentials for Student Portal access. Never expose pin_hash to student-facing queries.';
comment on function public.set_student_pin(uuid, text) is
  'Staff-only PIN set/reset function. Accepts a 6-digit PIN and stores only a bcrypt hash.';
comment on function public.seed_initial_student_pins(jsonb) is
  'Staff-only one-batch seeding function. Requires exactly 116 unique class/name/PIN assignments and stores only bcrypt hashes.';
