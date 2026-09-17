-- Stage 1: secure student PIN credential foundation.
-- Initial student names/PINs are intentionally NOT stored in this public repository.
-- PINs are generated deterministically from the verified class/name ordering and stored only as bcrypt hashes.

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
using (public.is_staff())
with check (public.is_staff());

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
  if auth.uid() is null or not public.is_staff() then
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

create or replace function public.initialize_student_pins()
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_student_count integer;
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'STAFF_REQUIRED';
  end if;

  select count(*)
  into v_student_count
  from public.students s
  join public.classes c on c.id = s.class_id
  where s.is_active = true
    and c.name in ('X Abu Bakar', 'X Umar Bin Khattab', 'XI Utsmaniyyah', 'XII Abbasiyah');

  if v_student_count <> 116 then
    raise exception 'STUDENT_COUNT_INVALID:%', v_student_count;
  end if;

  with ranked as (
    select
      s.id,
      row_number() over (
        order by
          case c.name
            when 'X Abu Bakar' then 1
            when 'X Umar Bin Khattab' then 2
            when 'XI Utsmaniyyah' then 3
            when 'XII Abbasiyah' then 4
            else 99
          end,
          lower(s.full_name)
      ) as seq
    from public.students s
    join public.classes c on c.id = s.class_id
    where s.is_active = true
      and c.name in ('X Abu Bakar', 'X Umar Bin Khattab', 'XI Utsmaniyyah', 'XII Abbasiyah')
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
    r.id,
    crypt(lpad((260000 + r.seq)::text, 6, '0'), gen_salt('bf', 10)),
    true,
    true,
    0,
    null,
    now(),
    now()
  from ranked r
  on conflict (student_id) do update set
    pin_hash = excluded.pin_hash,
    is_active = true,
    must_change_pin = true,
    failed_attempts = 0,
    locked_until = null,
    pin_changed_at = now(),
    updated_at = now();

  return 116;
end;
$$;

revoke all on function public.initialize_student_pins() from public;
grant execute on function public.initialize_student_pins() to authenticated;

comment on table public.student_access_credentials is
  'Private hashed PIN credentials for Student Portal access. Never expose pin_hash to student-facing queries.';
comment on function public.set_student_pin(uuid, text) is
  'Staff-only PIN set/reset function. Accepts a 6-digit PIN and stores only a bcrypt hash.';
comment on function public.initialize_student_pins() is
  'Staff-only one-click initializer for the verified active-student roster. Generates the agreed six-digit sequence server-side and stores only bcrypt hashes.';
