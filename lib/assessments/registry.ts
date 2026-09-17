import type { AssessmentDefinition } from "./types";
import { personalAssessmentV1 } from "./personal";
import { learningAssessmentV1 } from "./learning";
import { socialAssessmentV1 } from "./social";

const definitions: AssessmentDefinition[] = [
  personalAssessmentV1,
  learningAssessmentV1,
  socialAssessmentV1,
];

export function getAssessmentDefinition(slug: string, version?: number) {
  const candidates = definitions.filter((item) => item.slug === slug);
  if (!candidates.length) return null;
  if (version) return candidates.find((item) => item.version === version) ?? null;
  return [...candidates].sort((a, b) => b.version - a.version)[0] ?? null;
}

export function listAssessmentDefinitions() {
  const latestBySlug = new Map<string, AssessmentDefinition>();
  for (const item of definitions) {
    const current = latestBySlug.get(item.slug);
    if (!current || item.version > current.version) latestBySlug.set(item.slug, item);
  }
  return [...latestBySlug.values()];
}
