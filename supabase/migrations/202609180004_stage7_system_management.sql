-- Stage 7: System Management, bulk roster import, secure PIN reset, and reporting settings.
-- Additive migration; existing Student 360, Student Portal, assessment, career and counseling data remain canonical.

alter table public.classes
  add column if not exists is_active boolean not null default true;

create table if not exists public.system_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);

create table if not exists public.student_import_jobs (
  id uuid primary key default gen_random_uuid(),
  file_name text,
  file_type text,
  status text not null default 'completed' check (status in ('processing','completed','completed_with_warnings','failed')),
  row_count integer not null default 0,
  created_count integer not null default 0,
  updated_count integer not null default 0,
  skipped_count integer not null default 0,
  errors jsonb not null default '[]'::jsonb,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.system_settings enable row level security;
alter table public.student_import_jobs enable row level security;

grant select, insert, update, delete on public.system_settings to authenticated;
grant select, insert on public.student_import_jobs to authenticated;

drop policy if exists "staff manage system settings" on public.system_settings;
create policy "staff manage system settings"
on public.system_settings
for all to authenticated
using (private.is_staff())
with check (private.is_staff());

drop policy if exists "staff read import jobs" on public.student_import_jobs;
create policy "staff read import jobs"
on public.student_import_jobs
for select to authenticated
using (private.is_staff());

drop policy if exists "staff create import jobs" on public.student_import_jobs;
create policy "staff create import jobs"
on public.student_import_jobs
for insert to authenticated
with check (private.is_staff());

drop policy if exists "staff manage academic years" on public.academic_years;
create policy "staff manage academic years"
on public.academic_years
for all to authenticated
using (private.is_staff())
with check (private.is_staff());

insert into public.system_settings(key,value)
values
(
  'school_profile',
  jsonb_build_object(
    'school_name','Bina Insan Palu High School',
    'platform_name','Bina Insan LifeMap',
    'report_title','Laporan Pendampingan Siswa',
    'report_footer','Dokumen internal pendampingan BK. Gunakan sesuai kewenangan dan jaga kerahasiaan data siswa.'
  )
)
on conflict (key) do nothing;

create or replace function public.admin_generate_student_pin(p_student_id uuid)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_pin text;
  v_attempt integer := 0;
begin
  if not private.is_staff() then
    raise exception 'STAFF_REQUIRED';
  end if;

  if not exists(select 1 from public.students s where s.id=p_student_id and s.is_active=true) then
    raise exception 'STUDENT_NOT_ACTIVE';
  end if;

  loop
    v_attempt := v_attempt + 1;
    v_pin := lpad((floor(random()*900000)+100000)::int::text,6,'0');

    exit when not exists(
      select 1
      from public.student_access_credentials c
      where crypt(v_pin,c.pin_hash)=c.pin_hash
    );

    if v_attempt >= 30 then
      raise exception 'PIN_GENERATION_FAILED';
    end if;
  end loop;

  insert into public.student_access_credentials(
    student_id,pin_hash,is_active,failed_attempts,locked_until,last_login_at,updated_at
  )
  values(
    p_student_id,crypt(v_pin,gen_salt('bf',10)),true,0,null,null,now()
  )
  on conflict(student_id) do update
  set pin_hash=excluded.pin_hash,
      is_active=true,
      failed_attempts=0,
      locked_until=null,
      last_login_at=null,
      updated_at=now();

  delete from public.student_auth_links where student_id=p_student_id;

  return v_pin;
end;
$$;

revoke all on function public.admin_generate_student_pin(uuid) from public;
revoke all on function public.admin_generate_student_pin(uuid) from anon;
grant execute on function public.admin_generate_student_pin(uuid) to authenticated;

create or replace function public.admin_import_students(
  p_rows jsonb,
  p_file_name text default null,
  p_file_type text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year_id uuid;
  v_row jsonb;
  v_name text;
  v_class_name text;
  v_nis text;
  v_nisn text;
  v_email text;
  v_gender text;
  v_class_id uuid;
  v_student_id uuid;
  v_grade integer;
  v_slug text;
  v_created integer := 0;
  v_updated integer := 0;
  v_skipped integer := 0;
  v_errors jsonb := '[]'::jsonb;
  v_index integer := 0;
  v_job_id uuid;
  v_pin text;
  v_generated_access jsonb := '[]'::jsonb;
begin
  if not private.is_staff() then
    raise exception 'STAFF_REQUIRED';
  end if;

  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'IMPORT_ROWS_MUST_BE_ARRAY';
  end if;

  select id into v_year_id
  from public.academic_years
  where is_active=true
  order by starts_on desc nulls last, created_at desc
  limit 1;

  if v_year_id is null then
    raise exception 'ACTIVE_ACADEMIC_YEAR_REQUIRED';
  end if;

  insert into public.student_import_jobs(file_name,file_type,status,row_count)
  values(p_file_name,p_file_type,'processing',jsonb_array_length(p_rows))
  returning id into v_job_id;

  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    v_index := v_index + 1;
    v_name := nullif(trim(coalesce(v_row->>'full_name',v_row->>'nama_siswa',v_row->>'nama','')),'');
    v_class_name := nullif(trim(coalesce(v_row->>'class_name',v_row->>'kelas','')),'');
    v_nis := nullif(trim(coalesce(v_row->>'nis','')),'');
    v_nisn := nullif(trim(coalesce(v_row->>'nisn','')),'');
    v_email := nullif(lower(trim(coalesce(v_row->>'email',''))),'');
    v_gender := upper(nullif(trim(coalesce(v_row->>'gender',v_row->>'jk','')),''));

    if v_gender in ('LAKI-LAKI','LAKI LAKI','L','MALE') then v_gender := 'L'; end if;
    if v_gender in ('PEREMPUAN','P','FEMALE') then v_gender := 'P'; end if;
    if v_gender not in ('L','P') then v_gender := null; end if;

    if v_name is null or v_class_name is null then
      v_skipped := v_skipped + 1;
      v_errors := v_errors || jsonb_build_array(jsonb_build_object(
        'row',v_index,'message','Nama siswa dan kelas wajib diisi.'
      ));
      continue;
    end if;

    select c.id into v_class_id
    from public.classes c
    where c.academic_year_id=v_year_id
      and lower(trim(c.name))=lower(v_class_name)
    limit 1;

    if v_class_id is null then
      begin
        v_grade := nullif(v_row->>'grade','')::integer;
      exception when others then
        v_grade := null;
      end;

      if v_grade is null then
        v_grade := case
          when upper(v_class_name) ~ '^XII([^I]|$)' then 12
          when upper(v_class_name) ~ '^XI([^I]|$)' then 11
          when upper(v_class_name) ~ '^X([^I]|$)' then 10
          else null
        end;
      end if;

      if v_grade not in (10,11,12) then
        v_skipped := v_skipped + 1;
        v_errors := v_errors || jsonb_build_array(jsonb_build_object(
          'row',v_index,'message','Kelas baru tidak dapat dibuat karena tingkat kelas tidak terbaca. Isi kolom grade 10/11/12.'
        ));
        continue;
      end if;

      v_slug := lower(regexp_replace(trim(v_class_name),'[^a-zA-Z0-9]+','-','g'));
      v_slug := trim(both '-' from v_slug);
      if v_slug='' then v_slug := 'kelas-'||substr(md5(v_class_name),1,8); end if;

      insert into public.classes(academic_year_id,name,grade,slug,is_active)
      values(v_year_id,v_class_name,v_grade,v_slug,true)
      on conflict(academic_year_id,slug) do update
      set name=excluded.name,grade=excluded.grade,is_active=true,updated_at=now()
      returning id into v_class_id;
    end if;

    v_student_id := null;

    if v_nisn is not null then
      select s.id into v_student_id from public.students s where s.nisn=v_nisn limit 1;
    end if;
    if v_student_id is null and v_nis is not null then
      select s.id into v_student_id from public.students s where s.nis=v_nis limit 1;
    end if;
    if v_student_id is null then
      select s.id into v_student_id
      from public.students s
      where lower(trim(s.full_name))=lower(v_name)
        and s.class_id=v_class_id
      limit 1;
    end if;

    if v_student_id is null then
      insert into public.students(class_id,nis,nisn,full_name,gender,email,is_active,source_ref,updated_at)
      values(
        v_class_id,v_nis,v_nisn,v_name,v_gender,v_email,true,
        'import:'||v_year_id::text||':'||substr(md5(lower(v_class_name)||'|'||lower(v_name)||'|'||coalesce(v_nisn,v_nis,'')),1,24),
        now()
      )
      returning id into v_student_id;
      v_created := v_created + 1;

      v_pin := lpad((floor(random()*900000)+100000)::int::text,6,'0');
      insert into public.student_access_credentials(student_id,pin_hash,is_active,failed_attempts,locked_until,last_login_at,updated_at)
      values(v_student_id,crypt(v_pin,gen_salt('bf',10)),true,0,null,null,now())
      on conflict(student_id) do nothing;
      v_generated_access := v_generated_access || jsonb_build_array(jsonb_build_object(
        'student_id',v_student_id,'full_name',v_name,'class_name',v_class_name,'pin',v_pin
      ));
    else
      update public.students
      set class_id=v_class_id,
          nis=coalesce(v_nis,nis),
          nisn=coalesce(v_nisn,nisn),
          full_name=v_name,
          gender=coalesce(v_gender,gender),
          email=coalesce(v_email,email),
          is_active=true,
          updated_at=now()
      where id=v_student_id;
      v_updated := v_updated + 1;

      if not exists(select 1 from public.student_access_credentials c where c.student_id=v_student_id) then
        v_pin := lpad((floor(random()*900000)+100000)::int::text,6,'0');
        insert into public.student_access_credentials(student_id,pin_hash,is_active,failed_attempts,locked_until,last_login_at,updated_at)
        values(v_student_id,crypt(v_pin,gen_salt('bf',10)),true,0,null,null,now());
        v_generated_access := v_generated_access || jsonb_build_array(jsonb_build_object(
          'student_id',v_student_id,'full_name',v_name,'class_name',v_class_name,'pin',v_pin
        ));
      end if;
    end if;

    update public.student_enrollments
    set is_current=false,ended_at=coalesce(ended_at,current_date),updated_at=now()
    where student_id=v_student_id and academic_year_id<>v_year_id and is_current=true;

    insert into public.student_enrollments(student_id,academic_year_id,class_id,is_current,started_at,updated_at)
    values(v_student_id,v_year_id,v_class_id,true,current_date,now())
    on conflict(student_id,academic_year_id) do update
    set class_id=excluded.class_id,is_current=true,ended_at=null,updated_at=now();
  end loop;

  update public.student_import_jobs
  set status=case when v_skipped>0 then 'completed_with_warnings' else 'completed' end,
      created_count=v_created,
      updated_count=v_updated,
      skipped_count=v_skipped,
      errors=v_errors
  where id=v_job_id;

  return jsonb_build_object(
    'job_id',v_job_id,
    'row_count',jsonb_array_length(p_rows),
    'created',v_created,
    'updated',v_updated,
    'skipped',v_skipped,
    'errors',v_errors,
    'generated_access',v_generated_access
  );
exception when others then
  if v_job_id is not null then
    update public.student_import_jobs
    set status='failed',
        errors=jsonb_build_array(jsonb_build_object('message',sqlerrm))
    where id=v_job_id;
  end if;
  raise;
end;
$$;

revoke all on function public.admin_import_students(jsonb,text,text) from public;
revoke all on function public.admin_import_students(jsonb,text,text) from anon;
grant execute on function public.admin_import_students(jsonb,text,text) to authenticated;

notify pgrst, 'reload schema';
