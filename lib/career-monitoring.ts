export type CareerMonitoringInput = {
  hasSelfProfile: boolean;
  planCount: number;
  comparisonCount: number;
  portfolioCount: number;
  reviewDates: Array<string | null | undefined>;
};

export type CareerMonitoringStage = "belum_mulai" | "eksplorasi" | "punya_rencana" | "perlu_review";

export type CareerMonitoringSummary = {
  stage: CareerMonitoringStage;
  needsAttention: boolean;
  activityScore: number;
  overdueReviewCount: number;
  nextReviewDate: string | null;
};

function normalizeDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return value;
}

export function summarizeCareerStudent(input: CareerMonitoringInput, now = new Date()): CareerMonitoringSummary {
  const today = now.toISOString().slice(0, 10);
  const reviewDates = input.reviewDates.map(normalizeDate).filter((value): value is string => Boolean(value)).sort();
  const overdueReviewCount = reviewDates.filter((value) => value < today).length;
  const nextReviewDate = reviewDates.find((value) => value >= today) ?? null;
  const activityScore = (input.hasSelfProfile ? 1 : 0) + Math.max(0, input.planCount) + Math.max(0, input.comparisonCount) + Math.max(0, input.portfolioCount);

  if (overdueReviewCount > 0) {
    return { stage: "perlu_review", needsAttention: true, activityScore, overdueReviewCount, nextReviewDate };
  }
  if (activityScore === 0) {
    return { stage: "belum_mulai", needsAttention: true, activityScore, overdueReviewCount, nextReviewDate };
  }
  if (input.hasSelfProfile && input.planCount > 0) {
    return { stage: "punya_rencana", needsAttention: false, activityScore, overdueReviewCount, nextReviewDate };
  }
  return { stage: "eksplorasi", needsAttention: false, activityScore, overdueReviewCount, nextReviewDate };
}

export function careerStageLabel(stage: CareerMonitoringStage): string {
  return ({
    belum_mulai: "Belum mulai",
    eksplorasi: "Eksplorasi",
    punya_rencana: "Punya rencana",
    perlu_review: "Perlu review",
  } satisfies Record<CareerMonitoringStage, string>)[stage];
}
