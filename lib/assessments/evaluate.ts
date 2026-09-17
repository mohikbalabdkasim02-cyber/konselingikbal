import type { AssessmentAnswers, AssessmentDefinition, AssessmentEvaluation, AssessmentItemDefinition } from "./types";

function hasValue(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim().length > 0;
  return value !== null && value !== undefined && value !== "";
}

function evaluateSignals(item: AssessmentItemDefinition, value: unknown) {
  if (!item.options?.length) return [];
  const selected = Array.isArray(value) ? value.map(String) : hasValue(value) ? [String(value)] : [];
  return item.options
    .filter((option) => selected.includes(option.value) && option.signal)
    .map((option) => ({
      kind: option.signal!.kind,
      severity: option.signal!.severity,
      private: option.signal!.private !== false,
      sourceItemId: item.id,
    }));
}

export function evaluateAssessment(definition: AssessmentDefinition, answers: AssessmentAnswers): AssessmentEvaluation {
  let completedItems = 0;
  let totalItems = 0;
  const sectionProgress: AssessmentEvaluation["sectionProgress"] = {};
  const signals: AssessmentEvaluation["signals"] = [];

  for (const section of definition.sections) {
    let answered = 0;
    for (const item of section.items) {
      totalItems += 1;
      const value = answers[item.id];
      if (hasValue(value)) {
        answered += 1;
        completedItems += 1;
      }
      signals.push(...evaluateSignals(item, value));
    }
    sectionProgress[section.id] = { answered, total: section.items.length };
  }

  return { completedItems, totalItems, sectionProgress, signals };
}
