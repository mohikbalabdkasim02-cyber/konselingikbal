-- BK Digital V2 reusable assessment engine.
-- Additive migration: existing BK Karier tables/data are not modified or removed.

create extension if not exists pgcrypto;

create or replace function public.assessment_is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'mohikbalabdkasim.02@gmail.com';
$$;

create table if not exists public.student_auth_links (
  student_id uuid primary key references public.students(id) on delete cascade,
  auth_user_id uuid unique not null,
  created_at timestamptz not null default now()
);

create table if not exists public.assessment_definitions (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  domain text not null check (domain in ('personal','learning','social','career')),
  version integer not null check (version > 0),
  title text not null,
  subtitle text,
  intro text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(slug, version)
);

create table if not exists public.assessment_sections (
  id uuid primary key default gen_random_uuid(),
  definition_id uuid not null references public.assessment_definitions(id) on delete cascade,
  section_key text not null,
  title text not null,
  description text,
  sort_order integer not null default 0,
  unique(definition_id, section_key)
);

create table if not exists public.assessment_items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.assessment_sections(id) on delete cascade,
  item_key text not null,
  prompt text not null,
  item_type text not null check (item_type in ('likert','yes_no','single','multi','text','textarea','number','structured')),
  required boolean not null default false,
  sensitive boolean not null default false,
  help_text text,
  config jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  unique(section_id, item_key)
);

create table if not exists public.assessment_options (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.assessment_items(id) on delete cascade,
  option_value text not null,
  label text not null,
  score numeric,
  signal jsonb,
  sort_order integer not null default 0,
  unique(item_id, option_value)
);

create table if not exists public.assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  definition_id uuid not null references public.assessment_definitions(id),
  status text not null default 'draft' check (status in ('draft','submitted','reviewed','archived')),
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_by uuid default auth.uid()
);

create table if not exists public.assessment_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.assessment_attempts(id) on delete cascade,
  item_key text not null,
  value jsonb not null default 'null'::jsonb,
  sensitive boolean not null default false,
  updated_at timestamptz not null default now(),
  unique(attempt_id, item_key)
);

create table if not exists public.assessment_results (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid unique not null references public.assessment_attempts(id) on delete cascade,
  domain text not null check (domain in ('personal','learning','social','career')),
  summary jsonb not null default '{}'::jsonb,
  progress jsonb not null default '{}'::jsonb,
  calculated_at timestamptz not null default now()
);

create table if not exists public.assessment_action_plans (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  source_attempt_id uuid references public.assessment_attempts(id) on delete set null,
  domain text not null check (domain in ('personal','learning','social','career')),
  goal text not null,
  small_step text,
  support text,
  evidence text,
  start_date date not null default current_date,
  review_date date,
  status text not null default 'draft' check (status in ('draft','active','needs_review','completed','paused')),
  student_reflection text,
  counselor_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assessment_reviews (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.assessment_attempts(id) on delete cascade,
  counselor_id uuid default auth.uid(),
  need_level text check (need_level in ('light','medium','high','urgent')),
  priority_issue text,
  triggers text,
  protective_factors text,
  agreed_support text,
  involved_parties text,
  follow_up_date date,
  status text check (status in ('done','monitoring','continued_counseling','referral')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.need_signals (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  source_attempt_id uuid references public.assessment_attempts(id) on delete cascade,
  domain text not null check (domain in ('personal','learning','social','career')),
  kind text not null,
  severity text not null check (severity in ('info','attention','urgent')),
  private boolean not null default true,
  status text not null default 'open' check (status in ('open','reviewed','resolved')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  resolved_at timestamptz
);

create table if not exists public.consultation_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  source_attempt_id uuid references public.assessment_attempts(id) on delete set null,
  domain text not null check (domain in ('personal','learning','social','career')),
  urgency text not null default 'normal' check (urgency in ('normal','soon','urgent')),
  note text,
  status text not null default 'requested' check (status in ('requested','scheduled','completed','cancelled')),
  requested_at timestamptz not null default now(),
  scheduled_at timestamptz
);

create index if not exists assessment_attempts_student_idx on public.assessment_attempts(student_id, status, updated_at desc);
create index if not exists assessment_answers_attempt_idx on public.assessment_answers(attempt_id);
create index if not exists assessment_action_plans_student_idx on public.assessment_action_plans(student_id, domain, status, review_date);
create index if not exists need_signals_queue_idx on public.need_signals(status, severity, created_at desc);
create index if not exists need_signals_student_idx on public.need_signals(student_id, domain);
create index if not exists consultation_requests_queue_idx on public.consultation_requests(status, urgency, requested_at desc);

alter table public.student_auth_links enable row level security;
alter table public.assessment_definitions enable row level security;
alter table public.assessment_sections enable row level security;
alter table public.assessment_items enable row level security;
alter table public.assessment_options enable row level security;
alter table public.assessment_attempts enable row level security;
alter table public.assessment_answers enable row level security;
alter table public.assessment_results enable row level security;
alter table public.assessment_action_plans enable row level security;
alter table public.assessment_reviews enable row level security;
alter table public.need_signals enable row level security;
alter table public.consultation_requests enable row level security;

create policy "assessment catalog authenticated read" on public.assessment_definitions for select to authenticated using (is_active or public.assessment_is_staff());
create policy "assessment sections authenticated read" on public.assessment_sections for select to authenticated using (true);
create policy "assessment items authenticated read" on public.assessment_items for select to authenticated using (true);
create policy "assessment options authenticated read" on public.assessment_options for select to authenticated using (true);

create policy "staff manage student auth links" on public.student_auth_links for all to authenticated using (public.assessment_is_staff()) with check (public.assessment_is_staff());
create policy "student read own auth link" on public.student_auth_links for select to authenticated using (auth_user_id = auth.uid());

create policy "staff manage attempts" on public.assessment_attempts for all to authenticated using (public.assessment_is_staff()) with check (public.assessment_is_staff());
create policy "student manage own attempts" on public.assessment_attempts for all to authenticated
using (exists(select 1 from public.student_auth_links l where l.student_id = assessment_attempts.student_id and l.auth_user_id = auth.uid()))
with check (exists(select 1 from public.student_auth_links l where l.student_id = assessment_attempts.student_id and l.auth_user_id = auth.uid()));

create policy "staff manage answers" on public.assessment_answers for all to authenticated using (public.assessment_is_staff()) with check (public.assessment_is_staff());
create policy "student manage own answers" on public.assessment_answers for all to authenticated
using (exists(select 1 from public.assessment_attempts a join public.student_auth_links l on l.student_id = a.student_id where a.id = assessment_answers.attempt_id and l.auth_user_id = auth.uid()))
with check (exists(select 1 from public.assessment_attempts a join public.student_auth_links l on l.student_id = a.student_id where a.id = assessment_answers.attempt_id and l.auth_user_id = auth.uid()));

create policy "staff manage results" on public.assessment_results for all to authenticated using (public.assessment_is_staff()) with check (public.assessment_is_staff());
create policy "student read own results" on public.assessment_results for select to authenticated
using (exists(select 1 from public.assessment_attempts a join public.student_auth_links l on l.student_id = a.student_id where a.id = assessment_results.attempt_id and l.auth_user_id = auth.uid()));

create policy "staff manage action plans" on public.assessment_action_plans for all to authenticated using (public.assessment_is_staff()) with check (public.assessment_is_staff());
create policy "student manage own action plans" on public.assessment_action_plans for all to authenticated
using (exists(select 1 from public.student_auth_links l where l.student_id = assessment_action_plans.student_id and l.auth_user_id = auth.uid()))
with check (exists(select 1 from public.student_auth_links l where l.student_id = assessment_action_plans.student_id and l.auth_user_id = auth.uid()));

create policy "staff only reviews" on public.assessment_reviews for all to authenticated using (public.assessment_is_staff()) with check (public.assessment_is_staff());
create policy "staff only need signals" on public.need_signals for all to authenticated using (public.assessment_is_staff()) with check (public.assessment_is_staff());
create policy "staff manage consultation requests" on public.consultation_requests for all to authenticated using (public.assessment_is_staff()) with check (public.assessment_is_staff());
create policy "student own consultation requests" on public.consultation_requests for insert to authenticated
with check (exists(select 1 from public.student_auth_links l where l.student_id = consultation_requests.student_id and l.auth_user_id = auth.uid()));
create policy "student read own consultation requests" on public.consultation_requests for select to authenticated
using (exists(select 1 from public.student_auth_links l where l.student_id = consultation_requests.student_id and l.auth_user_id = auth.uid()));
