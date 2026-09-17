-- Stage 5 hardening: keep student help requests under caller RLS.

alter function public.request_bk_help(uuid) security invoker;

revoke all on function public.request_bk_help(uuid) from public;
revoke all on function public.request_bk_help(uuid) from anon;
grant execute on function public.request_bk_help(uuid) to authenticated;

comment on function public.request_bk_help(uuid) is
  'Student-only atomic/idempotent help request for an owned submitted assessment attempt. SECURITY INVOKER keeps consultation and need-signal writes subject to caller RLS.';
