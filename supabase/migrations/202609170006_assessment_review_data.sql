alter table public.assessment_reviews
  add column if not exists review_data jsonb not null default '{}'::jsonb;

create unique index if not exists assessment_reviews_attempt_unique
  on public.assessment_reviews(attempt_id);
