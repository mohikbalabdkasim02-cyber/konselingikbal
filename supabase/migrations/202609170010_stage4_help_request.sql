-- Stage 4: atomic/idempotent student help request after an assessment result.

create or replace function public.request_bk_help(p_attempt_id uuid)
returns table (
  consultation_request_id uuid,
  consultation_created boolean,
  signal_created boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
  v_domain text;
  v_consultation_id uuid;
  v_consultation_created boolean := false;
  v_signal_created boolean := false;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select a.student_id, d.domain
  into v_student_id, v_domain
  from public.assessment_attempts a
  join public.assessment_definitions d on d.id = a.definition_id
  join public.student_auth_links l on l.student_id = a.student_id
  where a.id = p_attempt_id
    and l.auth_user_id = auth.uid()
    and a.status in ('submitted','reviewed');

  if v_student_id is null then
    raise exception 'ATTEMPT_NOT_AVAILABLE';
  end if;

  select c.id
  into v_consultation_id
  from public.consultation_requests c
  where c.student_id = v_student_id
    and c.source_attempt_id = p_attempt_id
    and c.status in ('requested','scheduled')
  order by c.requested_at desc
  limit 1;

  if v_consultation_id is null then
    insert into public.consultation_requests (
      student_id,
      source_attempt_id,
      domain,
      urgency,
      note,
      status
    ) values (
      v_student_id,
      p_attempt_id,
      v_domain,
      'soon',
      'Siswa meminta berbicara dengan Guru BK dari halaman hasil asesmen.',
      'requested'
    )
    returning id into v_consultation_id;
    v_consultation_created := true;
  end if;

  if not exists (
    select 1
    from public.need_signals n
    where n.student_id = v_student_id
      and n.source_attempt_id = p_attempt_id
      and n.kind = 'requested_help'
      and n.status = 'open'
  ) then
    insert into public.need_signals (
      student_id,
      source_attempt_id,
      domain,
      kind,
      severity,
      private,
      status
    ) values (
      v_student_id,
      p_attempt_id,
      v_domain,
      'requested_help',
      'attention',
      true,
      'open'
    );
    v_signal_created := true;
  end if;

  return query
  select v_consultation_id, v_consultation_created, v_signal_created;
end;
$$;

revoke all on function public.request_bk_help(uuid) from public;
revoke all on function public.request_bk_help(uuid) from anon;
grant execute on function public.request_bk_help(uuid) to authenticated;

comment on function public.request_bk_help(uuid) is
  'Student-only atomic/idempotent help request for an owned submitted assessment attempt. Creates a consultation request and a private requested_help signal.';
