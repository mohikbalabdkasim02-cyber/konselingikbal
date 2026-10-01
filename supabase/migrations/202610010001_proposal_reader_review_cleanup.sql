-- Clean data that was written automatically by the old proposal reader.
-- Manual values that differ from an extraction result are preserved.

update public.student_profiles sp
set
  expertise = case when exists (
    select 1 from public.student_documents sd join public.document_versions dv on dv.document_id=sd.id
    where sd.student_id=sp.student_id and sd.document_type='proposal_hidup'
      and nullif(sp.expertise,'')=nullif(dv.extracted_data->'profile'->>'expertise','')
  ) then null else sp.expertise end,
  career_direction = case when exists (
    select 1 from public.student_documents sd join public.document_versions dv on dv.document_id=sd.id
    where sd.student_id=sp.student_id and sd.document_type='proposal_hidup'
      and nullif(sp.career_direction,'')=nullif(dv.extracted_data->'profile'->>'career_direction','')
  ) then null else sp.career_direction end,
  education_target = case when exists (
    select 1 from public.student_documents sd join public.document_versions dv on dv.document_id=sd.id
    where sd.student_id=sp.student_id and sd.document_type='proposal_hidup'
      and nullif(sp.education_target,'')=nullif(dv.extracted_data->'profile'->>'education_target','')
  ) then null else sp.education_target end,
  role_model = case when exists (
    select 1 from public.student_documents sd join public.document_versions dv on dv.document_id=sd.id
    where sd.student_id=sp.student_id and sd.document_type='proposal_hidup'
      and nullif(sp.role_model,'')=nullif(dv.extracted_data->'profile'->>'role_model','')
  ) then null else sp.role_model end,
  personal_brand = case when exists (
    select 1 from public.student_documents sd join public.document_versions dv on dv.document_id=sd.id
    where sd.student_id=sp.student_id and sd.document_type='proposal_hidup'
      and nullif(sp.personal_brand,'')=nullif(dv.extracted_data->'profile'->>'personal_brand','')
  ) then null else sp.personal_brand end,
  major_target = case when exists (
    select 1 from public.student_documents sd join public.document_versions dv on dv.document_id=sd.id
    where sd.student_id=sp.student_id and sd.document_type='proposal_hidup'
      and nullif(sp.major_target,'')=nullif(dv.extracted_data->'profile'->>'major_target','')
  ) then null else sp.major_target end,
  campus_target = case when exists (
    select 1 from public.student_documents sd join public.document_versions dv on dv.document_id=sd.id
    where sd.student_id=sp.student_id and sd.document_type='proposal_hidup'
      and nullif(sp.campus_target,'')=nullif(dv.extracted_data->'profile'->>'campus_target','')
  ) then null else sp.campus_target end,
  mentor = case when exists (
    select 1 from public.student_documents sd join public.document_versions dv on dv.document_id=sd.id
    where sd.student_id=sp.student_id and sd.document_type='proposal_hidup'
      and nullif(sp.mentor,'')=nullif(dv.extracted_data->'profile'->>'mentor','')
  ) then null else sp.mentor end,
  summary_notes = case when coalesce(sp.summary_notes,'') like 'Smart Proposal Reader membaca %'
    then null else sp.summary_notes end;

update public.student_profiles
set journey_stage='belum_dipetakan'
where journey_stage='eksplorasi'
  and nullif(expertise,'') is null
  and nullif(career_direction,'') is null
  and nullif(education_target,'') is null
  and nullif(major_target,'') is null
  and nullif(campus_target,'') is null
  and nullif(role_model,'') is null
  and nullif(personal_brand,'') is null
  and nullif(mentor,'') is null;

update public.life_aspects la
set content=null, status='empty'
where exists (
  select 1
  from public.student_documents sd
  join public.document_versions dv on dv.document_id=sd.id
  cross join lateral jsonb_array_elements(coalesce(dv.extracted_data->'lifeAspects','[]'::jsonb)) x
  where sd.student_id=la.student_id
    and sd.document_type='proposal_hidup'
    and x->>'category'=la.category
    and nullif(x->>'content','')=nullif(la.content,'')
);

delete from public.milestones m
where exists (
  select 1
  from public.student_documents sd
  join public.document_versions dv on dv.document_id=sd.id
  cross join lateral jsonb_array_elements_text(coalesce(dv.extracted_data->'milestones','[]'::jsonb)) x(title)
  where sd.student_id=m.student_id
    and sd.document_type='proposal_hidup'
    and x.title=m.title
);

delete from public.roadmap_items r
where exists (
  select 1
  from public.student_documents sd
  join public.document_versions dv on dv.document_id=sd.id
  cross join lateral jsonb_array_elements_text(coalesce(dv.extracted_data->'roadmap','[]'::jsonb)) x(title)
  where sd.student_id=r.student_id
    and sd.document_type='proposal_hidup'
    and x.title=r.title
);

update public.document_versions
set extraction_status = case
      when mime_type in (
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      ) then 'pending'
      else 'unsupported'
    end,
    extracted_at=null,
    extracted_data=null,
    extraction_notes=null
where document_id in (
  select id from public.student_documents where document_type='proposal_hidup'
);

notify pgrst, 'reload schema';
