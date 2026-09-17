export type AssessmentDomain = "personal" | "learning" | "social" | "career";

type AnswerMap = Record<string, unknown>;

export type SafeAssessmentSummary = {
  title: string;
  focusAreas: string[];
  goal: string | null;
  smallStep: string | null;
  support: string | null;
  reviewDate: string | null;
};

function text(answers: AnswerMap, key: string) {
  const value = answers[key];
  return typeof value === "string" ? value.trim() : "";
}

function compact(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean);
}

export function buildSafeAssessmentSummary(domain: AssessmentDomain, answers: AnswerMap): SafeAssessmentSummary {
  if (domain === "personal") {
    return {
      title: "Ringkasan Pribadimu",
      focusAreas: compact([text(answers, "priority_1"), text(answers, "priority_2"), text(answers, "priority_3")]),
      goal: text(answers, "plan_target") || null,
      smallStep: text(answers, "plan_step") || null,
      support: text(answers, "plan_support") || null,
      reviewDate: text(answers, "plan_review") || null,
    };
  }

  if (domain === "learning") {
    return {
      title: "Ringkasan Belajarmu",
      focusAreas: compact([text(answers, "top_problem_1"), text(answers, "top_problem_2"), text(answers, "top_problem_3")]),
      goal: text(answers, "learning_plan_target") || null,
      smallStep: text(answers, "learning_plan_step") || null,
      support: text(answers, "learning_plan_support") || null,
      reviewDate: text(answers, "learning_plan_when") || null,
    };
  }

  if (domain === "social") {
    return {
      title: "Ringkasan Sosialmu",
      focusAreas: compact([text(answers, "social_plan_problem")]),
      goal: text(answers, "social_plan_goal") || text(answers, "social_plan_problem") || null,
      smallStep: text(answers, "social_plan_first_step") || null,
      support: text(answers, "social_plan_support_person") || null,
      reviewDate: text(answers, "social_plan_review_date") || null,
    };
  }

  return {
    title: "Ringkasan Perkembangan Kariermu",
    focusAreas: [],
    goal: null,
    smallStep: null,
    support: null,
    reviewDate: null,
  };
}

export function buildHelpRequestPayload({ studentId, attemptId, domain }: { studentId: string; attemptId: string; domain: AssessmentDomain }) {
  return {
    consultation: {
      student_id: studentId,
      source_attempt_id: attemptId,
      domain,
      urgency: "soon" as const,
      status: "requested" as const,
      note: "Siswa meminta berbicara dengan Guru BK dari halaman hasil asesmen.",
    },
    signal: {
      student_id: studentId,
      source_attempt_id: attemptId,
      domain,
      kind: "requested_help",
      severity: "attention" as const,
      private: true,
      status: "open" as const,
    },
  };
}

export function rankBkQueueItem(item: { kind: string; due: boolean; highNeed: boolean; stalled: boolean }) {
  if (/safety/i.test(item.kind)) return 1;
  if (item.kind === "requested_help") return 2;
  if (item.due || item.kind === "follow_up") return 3;
  if (item.highNeed) return 4;
  if (item.stalled) return 5;
  return 6;
}
