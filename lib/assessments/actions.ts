import type { AssessmentAnswers, AssessmentDefinition, AssessmentSignal } from "./types";

export type DerivedActionPlan = {
  domain: AssessmentDefinition["domain"];
  goal: string;
  small_step: string | null;
  support: string | null;
  evidence: string | null;
  review_date: string | null;
  status: "active";
  student_reflection: string | null;
};

function text(answers: AssessmentAnswers, key: string) {
  const value = answers[key];
  return typeof value === "string" ? value.trim() : "";
}

function dateOrNull(value: string) {
  if (!value) return null;
  const iso = value.match(/^\d{4}-\d{2}-\d{2}$/)?.[0];
  return iso ?? null;
}

export function deriveActionPlan(definition: AssessmentDefinition, answers: AssessmentAnswers): DerivedActionPlan | null {
  if (definition.domain === "personal") {
    const goal = text(answers, "plan_target");
    if (!goal) return null;
    return {
      domain: "personal",
      goal,
      small_step: text(answers, "plan_step") || null,
      support: text(answers, "plan_support") || null,
      evidence: text(answers, "plan_commitment") || null,
      review_date: dateOrNull(text(answers, "plan_review")),
      status: "active",
      student_reflection: null,
    };
  }

  if (definition.domain === "learning") {
    const goal = text(answers, "learning_plan_target");
    if (!goal) return null;
    return {
      domain: "learning",
      goal,
      small_step: text(answers, "learning_plan_step") || null,
      support: text(answers, "learning_plan_support") || null,
      evidence: [text(answers, "learning_plan_evidence"), text(answers, "learning_plan_commitment")].filter(Boolean).join(" · ") || null,
      review_date: dateOrNull(text(answers, "learning_plan_when")),
      status: "active",
      student_reflection: text(answers, "learning_plan_reset") || null,
    };
  }

  if (definition.domain === "social") {
    const goal = text(answers, "social_plan_goal") || text(answers, "social_plan_problem");
    if (!goal) return null;
    return {
      domain: "social",
      goal,
      small_step: text(answers, "social_plan_first_step") || null,
      support: text(answers, "social_plan_support_person") || null,
      evidence: [text(answers, "social_plan_sentence"), text(answers, "social_plan_boundary")].filter(Boolean).join(" · ") || null,
      review_date: dateOrNull(text(answers, "social_plan_review_date")),
      status: "active",
      student_reflection: null,
    };
  }

  return null;
}

export function deriveConsultation(signals: AssessmentSignal[]) {
  const requested = signals.filter((signal) => /request|help_now|talk_bk/i.test(signal.kind));
  if (!requested.length) return null;
  return {
    urgency: requested.some((signal) => signal.severity === "urgent") ? "urgent" as const : "soon" as const,
    note: "Permintaan bantuan dibuat dari jawaban asesmen siswa. Buka hasil asesmen sesuai kewenangan untuk konteks lebih lanjut.",
  };
}
