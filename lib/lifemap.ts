export type LifeAspectInput = {
  id?: string;
  category: string;
  content?: string | null;
  status?: string | null;
  sort_order?: number | null;
};

export type NormalizedLifeAspect = {
  id?: string;
  category: string;
  content: string;
  status: string;
  sort_order: number;
};

export const CANONICAL_LIFE_CATEGORIES = [
  ["spiritual", "Spiritual & Tazkiyatunnafs"],
  ["islamic_studies", "Islamic Studies"],
  ["ibadah", "Ibadah"],
  ["leadership", "Leadership & Citizenship"],
  ["health", "Health"],
  ["knowledge", "Knowledge & Science"],
  ["social", "Social & Environment"],
  ["entrepreneurship", "Entrepreneurship"],
  ["career", "Career / Work"],
  ["education", "Education"],
  ["finance", "Finance"],
  ["transport", "Transport"],
  ["family", "Family & Friends"],
  ["leisure", "Leisure / Care / Respite"],
] as const;

const LEGACY_LABELS: Record<string, string> = { personal: "Personal Life" };

export function normalizeLifeAspectRows(rows: LifeAspectInput[]): NormalizedLifeAspect[] {
  const byCategory = new Map(rows.map((row) => [row.category, row]));
  const canonical: NormalizedLifeAspect[] = CANONICAL_LIFE_CATEGORIES.map(([category], index) => {
    const row = byCategory.get(category);
    return {
      ...(row?.id ? { id: row.id } : {}),
      category,
      content: typeof row?.content === "string" ? row.content : "",
      status: row?.status || (row?.content ? "filled" : "empty"),
      sort_order: index,
    };
  });
  const legacyPersonal = byCategory.get("personal");
  if (legacyPersonal) {
    canonical.push({
      ...(legacyPersonal.id ? { id: legacyPersonal.id } : {}),
      category: "personal",
      content: typeof legacyPersonal.content === "string" ? legacyPersonal.content : "",
      status: legacyPersonal.status || (legacyPersonal.content ? "filled" : "empty"),
      sort_order: CANONICAL_LIFE_CATEGORIES.length,
    });
  }
  return canonical;
}

export function lifeCategoryLabel(category: string): string {
  return CANONICAL_LIFE_CATEGORIES.find(([key]) => key === category)?.[1] ?? LEGACY_LABELS[category] ?? category;
}
