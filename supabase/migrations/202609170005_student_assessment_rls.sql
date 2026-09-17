-- BK Digital V2: student self-service policies.
-- Additive only; students can access only their own mapped record.

alter table public.students enable row level security;
alter table public.classes enable row level security;

DROP POLICY IF EXISTS "assessment student read own student" ON public.students;
CREATE POLICY "assessment student read own student"
ON public.students FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.student_auth_links l
    WHERE l.student_id = students.id
      AND l.auth_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "assessment authenticated read classes" ON public.classes;
CREATE POLICY "assessment authenticated read classes"
ON public.classes FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "student write own results" ON public.assessment_results;
CREATE POLICY "student write own results"
ON public.assessment_results FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.assessment_attempts a
    JOIN public.student_auth_links l ON l.student_id = a.student_id
    WHERE a.id = assessment_results.attempt_id
      AND l.auth_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "student update own results" ON public.assessment_results;
CREATE POLICY "student update own results"
ON public.assessment_results FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.assessment_attempts a
    JOIN public.student_auth_links l ON l.student_id = a.student_id
    WHERE a.id = assessment_results.attempt_id
      AND l.auth_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.assessment_attempts a
    JOIN public.student_auth_links l ON l.student_id = a.student_id
    WHERE a.id = assessment_results.attempt_id
      AND l.auth_user_id = auth.uid()
  )
);

-- Need signals created from the student's own assessment are always private.
-- Staff remain the only role allowed to read/manage the signal queue.
DROP POLICY IF EXISTS "student create own private signals" ON public.need_signals;
CREATE POLICY "student create own private signals"
ON public.need_signals FOR INSERT TO authenticated
WITH CHECK (
  private = true
  AND status = 'open'
  AND EXISTS (
    SELECT 1
    FROM public.assessment_attempts a
    JOIN public.student_auth_links l ON l.student_id = a.student_id
    WHERE a.id = need_signals.source_attempt_id
      AND a.student_id = need_signals.student_id
      AND l.auth_user_id = auth.uid()
  )
);
