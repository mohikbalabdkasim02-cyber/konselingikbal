export type CareerPlanPosition = "A" | "B" | "C";

export type CareerPlanChoice = {
  id?: string;
  position: CareerPlanPosition;
  custom_name: string;
  reason: string;
  review_date: string;
  status: string;
};

type CareerPlanRow = {
  id?: string;
  position: string;
  custom_name?: string | null;
  reason?: string | null;
  review_date?: string | null;
  status?: string | null;
};

export type CareerPortfolioDraft = {
  title: string;
  category: string;
  evidence_url?: string | null;
  reflection?: string | null;
  occurred_at?: string | null;
};

const POSITIONS: CareerPlanPosition[] = ["A", "B", "C"];

export function blankCareerPlan(position: CareerPlanPosition): CareerPlanChoice {
  return { position, custom_name: "", reason: "", review_date: "", status: "active" };
}

export function normalizePlanChoices(rows: CareerPlanRow[]): CareerPlanChoice[] {
  const byPosition = new Map(rows.map((row) => [row.position, row]));
  return POSITIONS.map((position) => {
    const row = byPosition.get(position);
    if (!row) return blankCareerPlan(position);
    return {
      id: row.id,
      position,
      custom_name: row.custom_name ?? "",
      reason: row.reason ?? "",
      review_date: row.review_date ?? "",
      status: row.status ?? "active",
    };
  });
}

export function toCareerChoicePayloads(studentId: string, choices: CareerPlanChoice[]) {
  return choices
    .filter((choice) => choice.custom_name.trim().length > 0)
    .map((choice) => ({
      student_id: studentId,
      position: choice.position,
      custom_name: choice.custom_name.trim(),
      reason: choice.reason.trim() || null,
      review_date: choice.review_date || null,
      status: "active",
    }));
}

export function toggleComparisonSelection(selected: string[], careerId: string, max = 4): string[] {
  if (selected.includes(careerId)) return selected.filter((id) => id !== careerId);
  if (selected.length >= max) return selected;
  return [...selected, careerId];
}

export function comparisonIsReady(selected: string[]): boolean {
  return selected.length >= 2 && selected.length <= 4 && new Set(selected).size === selected.length;
}

export function portfolioItemIsMeaningful(item: { title: string; category?: string }) {
  return item.title.trim().length > 0;
}

export function toPortfolioPayload(studentId: string, item: CareerPortfolioDraft) {
  return {
    student_id: studentId,
    title: item.title.trim(),
    category: item.category || "other",
    evidence_url: item.evidence_url?.trim() || null,
    reflection: item.reflection?.trim() || null,
    occurred_at: item.occurred_at || null,
    status: "active",
  };
}
