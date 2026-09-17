-- Repair missing student_auth_links table required by Student Portal login and student-scoped RLS.
-- Additive only. PIN credentials remain hashed and untouched.

create table if not exists public.student_auth_links (
  student_id uuid primary key references public.students(id) on delete cascade,
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.student_auth_links enable row level security;

revoke all on table public.student_auth_links from anon;
revoke all on table public.student_auth_links from authenticated;
grant select on table public.student_auth_links to authenticated;

drop policy if exists "student read own auth link" on public.student_auth_links;
create policy "student read own auth link"
on public.student_auth_links
for select
to authenticated
using (auth_user_id = auth.uid());

comment on table public.student_auth_links is
  'Maps one authenticated Supabase user session to one student record. Student clients may read only their own link; writes occur through trusted server-side/RPC flows.';
