-- Restore missing Student Portal assessment/career schema and student-scoped RLS.
-- Idempotent repair for production drift. Existing core Student 360 tables remain unchanged.

create extension if not exists pgcrypto;

create or replace function public.assessment_is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_staff();
$$;

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
  review_data jsonb not null default '{}'::jsonb,
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

create index if not exists assessment_attempts_student_idx on public.assessment_attempts(student_id, status, updated_at desc);
create index if not exists assessment_answers_attempt_idx on public.assessment_answers(attempt_id);
create index if not exists assessment_action_plans_student_idx on public.assessment_action_plans(student_id, domain, status, review_date);
create unique index if not exists assessment_reviews_attempt_unique on public.assessment_reviews(attempt_id);
create index if not exists need_signals_queue_idx on public.need_signals(status, severity, created_at desc);
create index if not exists need_signals_student_idx on public.need_signals(student_id, domain);
create index if not exists consultation_requests_queue_idx on public.consultation_requests(status, urgency, requested_at desc);
create index if not exists career_profiles_published_idx on public.career_profiles(is_published, category, name);
create index if not exists student_career_choices_student_idx on public.student_career_choices(student_id, status, position);
create index if not exists career_comparisons_student_idx on public.career_comparisons(student_id, created_at desc);
create index if not exists career_portfolio_student_idx on public.career_portfolio_items(student_id, occurred_at desc);

insert into public.assessment_definitions (slug, domain, version, title, subtitle, intro, is_active)
values
('pribadi','personal',1,'Asesmen Kebutuhan Bimbingan Pribadi','Kenali Diri • Kelola Emosi • Bangun Kebiasaan • Tumbuh dengan Nilai','Asesmen ini membantu siswa mengenali kebutuhan pribadi yang sedang mengganggu kenyamanan, perkembangan, ibadah, relasi, atau proses belajar. Hasil asesmen bukan label kepribadian dan bukan diagnosis klinis.',true),
('belajar','learning',1,'Asesmen Bimbingan Belajar','Masalah Belajar • Penyebab • Dampak • Kebutuhan & Aksi','Asesmen ini membantu siswa dan Guru BK memahami kondisi belajar secara lebih mendalam. Hasilnya bukan label rajin atau malas, melainkan bahan refleksi untuk menentukan dukungan yang paling dibutuhkan.',true),
('sosial','social',1,'Asesmen Sosial','Sekolah • Kelas • Guru • Teman','Asesmen ini membantu siswa mengenali masalah sosial yang dialami di lingkungan sekolah, memahami dampaknya, memilih respons yang lebih sehat, dan menentukan kapan perlu meminta bantuan. Hasil digunakan sebagai bahan percakapan antara siswa dan Guru BK, bukan sebagai alat menghukum atau memberi label.',true)
on conflict (slug, version) do update set
  title=excluded.title, subtitle=excluded.subtitle, intro=excluded.intro, is_active=true;

alter table public.students enable row level security;
alter table public.classes enable row level security;
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
alter table public.career_profiles enable row level security;
alter table public.career_self_profiles enable row level security;
alter table public.student_career_choices enable row level security;
alter table public.career_comparisons enable row level security;
alter table public.career_comparison_items enable row level security;
alter table public.career_portfolio_items enable row level security;

grant select,insert,update,delete on public.student_auth_links to authenticated;
grant select,insert,update,delete on public.assessment_definitions to authenticated;
grant select,insert,update,delete on public.assessment_sections to authenticated;
grant select,insert,update,delete on public.assessment_items to authenticated;
grant select,insert,update,delete on public.assessment_options to authenticated;
grant select,insert,update,delete on public.assessment_attempts to authenticated;
grant select,insert,update,delete on public.assessment_answers to authenticated;
grant select,insert,update,delete on public.assessment_results to authenticated;
grant select,insert,update,delete on public.assessment_action_plans to authenticated;
grant select,insert,update,delete on public.assessment_reviews to authenticated;
grant select,insert,update,delete on public.need_signals to authenticated;
grant select,insert,update,delete on public.consultation_requests to authenticated;
grant select,insert,update,delete on public.career_profiles to authenticated;
grant select,insert,update,delete on public.career_self_profiles to authenticated;
grant select,insert,update,delete on public.student_career_choices to authenticated;
grant select,insert,update,delete on public.career_comparisons to authenticated;
grant select,insert,update,delete on public.career_comparison_items to authenticated;
grant select,insert,update,delete on public.career_portfolio_items to authenticated;

drop policy if exists "assessment student read own student" on public.students;
create policy "assessment student read own student" on public.students
for select to authenticated
using (exists(select 1 from public.student_auth_links l where l.student_id=students.id and l.auth_user_id=auth.uid()));

drop policy if exists "assessment authenticated read classes" on public.classes;
create policy "assessment authenticated read classes" on public.classes
for select to authenticated using (true);

drop policy if exists "staff manage student auth links" on public.student_auth_links;
create policy "staff manage student auth links" on public.student_auth_links
for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "student read own auth link" on public.student_auth_links;
create policy "student read own auth link" on public.student_auth_links
for select to authenticated using (auth_user_id=auth.uid());

drop policy if exists "assessment catalog authenticated read" on public.assessment_definitions;
create policy "assessment catalog authenticated read" on public.assessment_definitions
for select to authenticated using (is_active or public.is_staff());

drop policy if exists "staff manage assessment definitions" on public.assessment_definitions;
create policy "staff manage assessment definitions" on public.assessment_definitions
for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "assessment sections authenticated read" on public.assessment_sections;
create policy "assessment sections authenticated read" on public.assessment_sections
for select to authenticated using (true);

drop policy if exists "assessment items authenticated read" on public.assessment_items;
create policy "assessment items authenticated read" on public.assessment_items
for select to authenticated using (true);

drop policy if exists "assessment options authenticated read" on public.assessment_options;
create policy "assessment options authenticated read" on public.assessment_options
for select to authenticated using (true);

drop policy if exists "staff manage attempts" on public.assessment_attempts;
create policy "staff manage attempts" on public.assessment_attempts
for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "student manage own attempts" on public.assessment_attempts;
create policy "student manage own attempts" on public.assessment_attempts
for all to authenticated
using (exists(select 1 from public.student_auth_links l where l.student_id=assessment_attempts.student_id and l.auth_user_id=auth.uid()))
with check (exists(select 1 from public.student_auth_links l where l.student_id=assessment_attempts.student_id and l.auth_user_id=auth.uid()));

drop policy if exists "staff manage answers" on public.assessment_answers;
create policy "staff manage answers" on public.assessment_answers
for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "student manage own answers" on public.assessment_answers;
create policy "student manage own answers" on public.assessment_answers
for all to authenticated
using (exists(select 1 from public.assessment_attempts a join public.student_auth_links l on l.student_id=a.student_id where a.id=assessment_answers.attempt_id and l.auth_user_id=auth.uid()))
with check (exists(select 1 from public.assessment_attempts a join public.student_auth_links l on l.student_id=a.student_id where a.id=assessment_answers.attempt_id and l.auth_user_id=auth.uid()));

drop policy if exists "staff manage results" on public.assessment_results;
create policy "staff manage results" on public.assessment_results
for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "student read own results" on public.assessment_results;
create policy "student read own results" on public.assessment_results
for select to authenticated
using (exists(select 1 from public.assessment_attempts a join public.student_auth_links l on l.student_id=a.student_id where a.id=assessment_results.attempt_id and l.auth_user_id=auth.uid()));

drop policy if exists "student write own results" on public.assessment_results;
create policy "student write own results" on public.assessment_results
for insert to authenticated
with check (exists(select 1 from public.assessment_attempts a join public.student_auth_links l on l.student_id=a.student_id where a.id=assessment_results.attempt_id and l.auth_user_id=auth.uid()));

drop policy if exists "student update own results" on public.assessment_results;
create policy "student update own results" on public.assessment_results
for update to authenticated
using (exists(select 1 from public.assessment_attempts a join public.student_auth_links l on l.student_id=a.student_id where a.id=assessment_results.attempt_id and l.auth_user_id=auth.uid()))
with check (exists(select 1 from public.assessment_attempts a join public.student_auth_links l on l.student_id=a.student_id where a.id=assessment_results.attempt_id and l.auth_user_id=auth.uid()));

drop policy if exists "staff manage action plans" on public.assessment_action_plans;
create policy "staff manage action plans" on public.assessment_action_plans
for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "student manage own action plans" on public.assessment_action_plans;
create policy "student manage own action plans" on public.assessment_action_plans
for all to authenticated
using (exists(select 1 from public.student_auth_links l where l.student_id=assessment_action_plans.student_id and l.auth_user_id=auth.uid()))
with check (exists(select 1 from public.student_auth_links l where l.student_id=assessment_action_plans.student_id and l.auth_user_id=auth.uid()));

drop policy if exists "staff only reviews" on public.assessment_reviews;
create policy "staff only reviews" on public.assessment_reviews
for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "staff only need signals" on public.need_signals;
create policy "staff only need signals" on public.need_signals
for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "student create own private signals" on public.need_signals;
create policy "student create own private signals" on public.need_signals
for insert to authenticated
with check (
  private=true and status='open'
  and exists(select 1 from public.assessment_attempts a join public.student_auth_links l on l.student_id=a.student_id
             where a.id=need_signals.source_attempt_id and a.student_id=need_signals.student_id and l.auth_user_id=auth.uid())
);

drop policy if exists "staff manage consultation requests" on public.consultation_requests;
create policy "staff manage consultation requests" on public.consultation_requests
for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "student own consultation requests" on public.consultation_requests;
create policy "student own consultation requests" on public.consultation_requests
for insert to authenticated
with check (exists(select 1 from public.student_auth_links l where l.student_id=consultation_requests.student_id and l.auth_user_id=auth.uid()));

drop policy if exists "student read own consultation requests" on public.consultation_requests;
create policy "student read own consultation requests" on public.consultation_requests
for select to authenticated
using (exists(select 1 from public.student_auth_links l where l.student_id=consultation_requests.student_id and l.auth_user_id=auth.uid()));

drop policy if exists "staff manage career profiles" on public.career_profiles;
create policy "staff manage career profiles" on public.career_profiles
for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "student read published career profiles" on public.career_profiles;
create policy "student read published career profiles" on public.career_profiles
for select to authenticated using (is_published=true or public.is_staff());

drop policy if exists "staff manage career self profiles" on public.career_self_profiles;
create policy "staff manage career self profiles" on public.career_self_profiles
for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "student manage own career self profile" on public.career_self_profiles;
create policy "student manage own career self profile" on public.career_self_profiles
for all to authenticated
using (exists(select 1 from public.student_auth_links l where l.student_id=career_self_profiles.student_id and l.auth_user_id=auth.uid()))
with check (exists(select 1 from public.student_auth_links l where l.student_id=career_self_profiles.student_id and l.auth_user_id=auth.uid()));

drop policy if exists "staff manage career choices" on public.student_career_choices;
create policy "staff manage career choices" on public.student_career_choices
for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "student manage own career choices" on public.student_career_choices;
create policy "student manage own career choices" on public.student_career_choices
for all to authenticated
using (exists(select 1 from public.student_auth_links l where l.student_id=student_career_choices.student_id and l.auth_user_id=auth.uid()))
with check (exists(select 1 from public.student_auth_links l where l.student_id=student_career_choices.student_id and l.auth_user_id=auth.uid()));

drop policy if exists "staff manage career comparisons" on public.career_comparisons;
create policy "staff manage career comparisons" on public.career_comparisons
for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "student manage own career comparisons" on public.career_comparisons;
create policy "student manage own career comparisons" on public.career_comparisons
for all to authenticated
using (exists(select 1 from public.student_auth_links l where l.student_id=career_comparisons.student_id and l.auth_user_id=auth.uid()))
with check (exists(select 1 from public.student_auth_links l where l.student_id=career_comparisons.student_id and l.auth_user_id=auth.uid()));

drop policy if exists "staff manage career comparison items" on public.career_comparison_items;
create policy "staff manage career comparison items" on public.career_comparison_items
for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "student manage own career comparison items" on public.career_comparison_items;
create policy "student manage own career comparison items" on public.career_comparison_items
for all to authenticated
using (exists(select 1 from public.career_comparisons c join public.student_auth_links l on l.student_id=c.student_id where c.id=career_comparison_items.comparison_id and l.auth_user_id=auth.uid()))
with check (exists(select 1 from public.career_comparisons c join public.student_auth_links l on l.student_id=c.student_id where c.id=career_comparison_items.comparison_id and l.auth_user_id=auth.uid()));

drop policy if exists "staff manage career portfolio" on public.career_portfolio_items;
create policy "staff manage career portfolio" on public.career_portfolio_items
for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "student manage own career portfolio" on public.career_portfolio_items;
create policy "student manage own career portfolio" on public.career_portfolio_items
for all to authenticated
using (exists(select 1 from public.student_auth_links l where l.student_id=career_portfolio_items.student_id and l.auth_user_id=auth.uid()))
with check (exists(select 1 from public.student_auth_links l where l.student_id=career_portfolio_items.student_id and l.auth_user_id=auth.uid()));

create or replace function public.claim_student_account()
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_email text;
  v_student_id uuid;
  v_count integer;
  v_existing uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  v_email:=lower(trim(coalesce(auth.jwt()->>'email','')));
  if v_email='' then raise exception 'EMAIL_REQUIRED'; end if;
  select l.student_id into v_existing from public.student_auth_links l where l.auth_user_id=auth.uid();
  if v_existing is not null then return v_existing; end if;
  select count(*),min(s.id) into v_count,v_student_id from public.students s
   where s.is_active=true and s.email is not null and lower(trim(s.email))=v_email;
  if v_count=0 then raise exception 'STUDENT_EMAIL_NOT_FOUND'; end if;
  if v_count>1 then raise exception 'STUDENT_EMAIL_NOT_UNIQUE'; end if;
  if exists(select 1 from public.student_auth_links l where l.student_id=v_student_id and l.auth_user_id<>auth.uid())
    then raise exception 'STUDENT_ALREADY_LINKED'; end if;
  insert into public.student_auth_links(student_id,auth_user_id)
  values(v_student_id,auth.uid())
  on conflict on constraint student_auth_links_pkey do update set auth_user_id=excluded.auth_user_id;
  return v_student_id;
end;
$$;

grant execute on function public.claim_student_account() to authenticated;

create or replace function public.request_bk_help(p_attempt_id uuid)
returns table (
  consultation_request_id uuid,
  consultation_created boolean,
  signal_created boolean
)
language plpgsql
security invoker
set search_path=public
as $$
declare
  v_student_id uuid;
  v_domain text;
  v_consultation_id uuid;
  v_consultation_created boolean:=false;
  v_signal_created boolean:=false;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  select a.student_id,d.domain into v_student_id,v_domain
  from public.assessment_attempts a
  join public.assessment_definitions d on d.id=a.definition_id
  join public.student_auth_links l on l.student_id=a.student_id
  where a.id=p_attempt_id and l.auth_user_id=auth.uid() and a.status in ('submitted','reviewed');

  if v_student_id is null then raise exception 'ATTEMPT_NOT_AVAILABLE'; end if;

  select c.id into v_consultation_id
  from public.consultation_requests c
  where c.student_id=v_student_id and c.source_attempt_id=p_attempt_id and c.status in ('requested','scheduled')
  order by c.requested_at desc limit 1;

  if v_consultation_id is null then
    insert into public.consultation_requests(student_id,source_attempt_id,domain,urgency,note,status)
    values(v_student_id,p_attempt_id,v_domain,'soon','Siswa meminta berbicara dengan Guru BK dari halaman hasil asesmen.','requested')
    returning id into v_consultation_id;
    v_consultation_created:=true;
  end if;

  if not exists(
    select 1 from public.need_signals n
    where n.student_id=v_student_id and n.source_attempt_id=p_attempt_id and n.kind='requested_help' and n.status='open'
  ) then
    insert into public.need_signals(student_id,source_attempt_id,domain,kind,severity,private,status)
    values(v_student_id,p_attempt_id,v_domain,'requested_help','attention',true,'open');
    v_signal_created:=true;
  end if;

  return query select v_consultation_id,v_consultation_created,v_signal_created;
end;
$$;

revoke all on function public.request_bk_help(uuid) from public;
revoke all on function public.request_bk_help(uuid) from anon;
grant execute on function public.request_bk_help(uuid) to authenticated;

notify pgrst, 'reload schema';
