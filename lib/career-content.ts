export type CareerProfileDraft = {
  name: string;
  slug?: string;
  category?: string;
  aliasesText?: string;
  summary?: string;
  activities?: string;
  contribution?: string;
  good_values?: string;
  supporting_profile?: string;
  competencies?: string;
  education_path?: string;
  challenges?: string;
  difficulty_factors?: string;
  risk_mitigation?: string;
  prospects?: string;
  alternatives?: string;
  start_now?: string;
  reflectionQuestionsText?: string;
  sourcesText?: string;
  content_owner?: string;
};

const compact = (value?: string | null) => value?.trim() || null;
const lines = (value?: string | null) => (value ?? "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean);

export function slugifyCareerName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

export function careerProfilePublicationReady(profile: {
  name?: string | null;
  summary?: string | null;
  activities?: string | null;
  competencies?: string | null;
  education_path?: string | null;
  challenges?: string | null;
  start_now?: string | null;
}) {
  return [profile.name, profile.summary, profile.activities, profile.competencies, profile.education_path, profile.challenges, profile.start_now]
    .every((value) => Boolean(value?.trim()));
}

export function buildCareerProfilePayload(draft: CareerProfileDraft) {
  const name = draft.name.trim();
  return {
    name,
    slug: slugifyCareerName(draft.slug?.trim() || name),
    category: compact(draft.category),
    aliases: lines(draft.aliasesText),
    summary: compact(draft.summary),
    activities: compact(draft.activities),
    contribution: compact(draft.contribution),
    good_values: compact(draft.good_values),
    supporting_profile: compact(draft.supporting_profile),
    competencies: compact(draft.competencies),
    education_path: compact(draft.education_path),
    challenges: compact(draft.challenges),
    difficulty_factors: compact(draft.difficulty_factors),
    risk_mitigation: compact(draft.risk_mitigation),
    prospects: compact(draft.prospects),
    alternatives: compact(draft.alternatives),
    start_now: compact(draft.start_now),
    reflection_questions: lines(draft.reflectionQuestionsText),
    sources: lines(draft.sourcesText),
    content_owner: compact(draft.content_owner),
  };
}
