-- BK Digital V2 Career upgrade. Additive only: existing Proposal/LifeMap/Milestone/Roadmap tables remain canonical.

create table if not exists public.career_profiles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  category text,
  aliases text[] not null default '{}',
  summary text,
  activities text,
  contribution text,
  good_values text,
  supporting_profile text,
  competencies text,
  education_path text,
  challenges text,
  difficulty_factors text,
  risk_mitigation text,
  prospects text,
  alternatives text,
  start_now text,
  reflection_questions jsonb not null default '[]'::jsonb,
  sources jsonb not null default '[]'::jsonb,
  last_reviewed_at timestamptz,
  content_owner text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.career_self_profiles (
  student_id uuid primary key references public.students(id) on delete cascade,
  interests text,
  strengths text,
  values_work text,
  abilities text,
  work_environment_preferences text,
  interaction_style text,
  development_areas text,
  updated_at timestamptz not null default now()
);

create table if not exists public.student_career_choices (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  career_profile_id uuid references public.career_profiles(id) on delete set null,
  custom_name text,
  position text not null check (position in ('A','B','C','exploring')),
  reason text,
  review_date date,
  status text not null default 'active' check (status in ('active','paused','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(student_id, position)
);

create table if not exists public.career_comparisons (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  title text not null default 'Perbandingan Karier',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.career_comparison_items (
  id uuid primary key default gen_random_uuid(),
  comparison_id uuid not null references public.career_comparisons(id) on delete cascade,
  career_profile_id uuid references public.career_profiles(id) on delete cascade,
  custom_name text,
  student_reflection jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0
);

create table if not exists public.career_portfolio_items (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  title text not null,
  category text not null default 'other' check (category in ('project','achievement','organization','volunteering','course','competition','shadowing','certificate','other')),
  evidence_url text,
  reflection text,
  occurred_at date,
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists career_profiles_published_idx on public.career_profiles(is_published, category, name);
create index if not exists student_career_choices_student_idx on public.student_career_choices(student_id, status, position);
create index if not exists career_comparisons_student_idx on public.career_comparisons(student_id, created_at desc);
create index if not exists career_portfolio_student_idx on public.career_portfolio_items(student_id, occurred_at desc);

alter table public.career_profiles enable row level security;
alter table public.career_self_profiles enable row level security;
alter table public.student_career_choices enable row level security;
alter table public.career_comparisons enable row level security;
alter table public.career_comparison_items enable row level security;
alter table public.career_portfolio_items enable row level security;

create policy "staff manage career profiles" on public.career_profiles for all to authenticated using (public.assessment_is_staff()) with check (public.assessment_is_staff());
create policy "student read published career profiles" on public.career_profiles for select to authenticated using (is_published = true or public.assessment_is_staff());

create policy "staff manage career self profiles" on public.career_self_profiles for all to authenticated using (public.assessment_is_staff()) with check (public.assessment_is_staff());
create policy "student manage own career self profile" on public.career_self_profiles for all to authenticated
using (exists(select 1 from public.student_auth_links l where l.student_id = career_self_profiles.student_id and l.auth_user_id = auth.uid()))
with check (exists(select 1 from public.student_auth_links l where l.student_id = career_self_profiles.student_id and l.auth_user_id = auth.uid()));

create policy "staff manage career choices" on public.student_career_choices for all to authenticated using (public.assessment_is_staff()) with check (public.assessment_is_staff());
create policy "student manage own career choices" on public.student_career_choices for all to authenticated
using (exists(select 1 from public.student_auth_links l where l.student_id = student_career_choices.student_id and l.auth_user_id = auth.uid()))
with check (exists(select 1 from public.student_auth_links l where l.student_id = student_career_choices.student_id and l.auth_user_id = auth.uid()));

create policy "staff manage career comparisons" on public.career_comparisons for all to authenticated using (public.assessment_is_staff()) with check (public.assessment_is_staff());
create policy "student manage own career comparisons" on public.career_comparisons for all to authenticated
using (exists(select 1 from public.student_auth_links l where l.student_id = career_comparisons.student_id and l.auth_user_id = auth.uid()))
with check (exists(select 1 from public.student_auth_links l where l.student_id = career_comparisons.student_id and l.auth_user_id = auth.uid()));

create policy "staff manage career comparison items" on public.career_comparison_items for all to authenticated using (public.assessment_is_staff()) with check (public.assessment_is_staff());
create policy "student manage own career comparison items" on public.career_comparison_items for all to authenticated
using (exists(select 1 from public.career_comparisons c join public.student_auth_links l on l.student_id=c.student_id where c.id=career_comparison_items.comparison_id and l.auth_user_id=auth.uid()))
with check (exists(select 1 from public.career_comparisons c join public.student_auth_links l on l.student_id=c.student_id where c.id=career_comparison_items.comparison_id and l.auth_user_id=auth.uid()));

create policy "staff manage career portfolio" on public.career_portfolio_items for all to authenticated using (public.assessment_is_staff()) with check (public.assessment_is_staff());
create policy "student manage own career portfolio" on public.career_portfolio_items for all to authenticated
using (exists(select 1 from public.student_auth_links l where l.student_id = career_portfolio_items.student_id and l.auth_user_id = auth.uid()))
with check (exists(select 1 from public.student_auth_links l where l.student_id = career_portfolio_items.student_id and l.auth_user_id = auth.uid()));
