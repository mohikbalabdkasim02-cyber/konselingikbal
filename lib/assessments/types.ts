export type AssessmentDomain = "personal" | "learning" | "social" | "career";
export type AssessmentItemType = "likert" | "yes_no" | "single" | "multi" | "text" | "textarea" | "number" | "structured";
export type AssessmentAttemptStatus = "draft" | "submitted" | "reviewed" | "archived";

export type AssessmentOption = {
  value: string;
  label: string;
  score?: number;
  signal?: { kind: string; severity: "info" | "attention" | "urgent"; private?: boolean };
};

export type AssessmentItemDefinition = {
  id: string;
  prompt: string;
  type: AssessmentItemType;
  required?: boolean;
  helpText?: string;
  min?: number;
  max?: number;
  options?: AssessmentOption[];
  sensitive?: boolean;
  aggregateKey?: string;
};

export type AssessmentSectionDefinition = {
  id: string;
  title: string;
  description?: string;
  items: AssessmentItemDefinition[];
};

export type AssessmentDefinition = {
  slug: string;
  version: number;
  domain: AssessmentDomain;
  title: string;
  subtitle?: string;
  intro?: string;
  sections: AssessmentSectionDefinition[];
};

export type AssessmentAnswers = Record<string, unknown>;

export type AssessmentSignal = {
  kind: string;
  severity: "info" | "attention" | "urgent";
  private: boolean;
  sourceItemId: string;
};

export type AssessmentEvaluation = {
  completedItems: number;
  totalItems: number;
  sectionProgress: Record<string, { answered: number; total: number }>;
  signals: AssessmentSignal[];
};
