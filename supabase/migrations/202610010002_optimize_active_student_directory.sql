create index if not exists idx_students_active_full_name
on public.students (full_name)
where is_active = true;
