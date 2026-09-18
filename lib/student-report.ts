import type { SupabaseClient } from "@supabase/supabase-js";
import { getAssessmentDefinition } from "@/lib/assessments/registry";

type UnknownRow = Record<string, unknown>;

export type ReportQuestion = {
  section: string;
  prompt: string;
  answer: string;
  sensitive: boolean;
};

export type ReportAssessment = {
  id: string;
  title: string;
  domain: string;
  status: string;
  submittedAt: string | null;
  questions: ReportQuestion[];
  review: UnknownRow | null;
  result: UnknownRow | null;
};

export type StudentReportBundle = {
  student: {
    id: string;
    full_name: string;
    nis: string | null;
    nisn: string | null;
    gender: string | null;
    email: string | null;
    class_name: string;
    grade: number | null;
  };
  profile: UnknownRow | null;
  lifeAspects: UnknownRow[];
  milestones: UnknownRow[];
  roadmap: UnknownRow[];
  assessments: ReportAssessment[];
  actionPlans: UnknownRow[];
  careerSelf: UnknownRow | null;
  careerChoices: UnknownRow[];
  careerPortfolio: UnknownRow[];
  counseling: UnknownRow[];
  followUps: UnknownRow[];
  outcomes: UnknownRow[];
  consultationRequests: UnknownRow[];
  needSignals: UnknownRow[];
};

function asText(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (Array.isArray(value)) return value.map(asText).join("; ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function answerDisplay(value: unknown, options?: Array<{ value: string; label: string }>) {
  if (Array.isArray(value)) return value.length ? value.map((v) => options?.find((o) => o.value === String(v))?.label ?? String(v)).join("; ") : "Belum dijawab";
  if (typeof value === "string") return value ? options?.find((o) => o.value === value)?.label ?? value : "Belum dijawab";
  if (value === null || value === undefined) return "Belum dijawab";
  if (typeof value === "boolean") return value ? "Ya" : "Tidak";
  return asText(value);
}

export async function loadStudentReportBundle(client: SupabaseClient, studentId: string): Promise<StudentReportBundle> {
  const studentRes = await client
    .from("students")
    .select("id,full_name,nis,nisn,gender,email,classes(name,grade)")
    .eq("id", studentId)
    .single();
  if (studentRes.error) throw studentRes.error;

  const [profileRes, lifeRes, milestoneRes, roadmapRes, attemptsRes, actionRes, careerSelfRes, choicesRes, portfolioRes, counselingRes, followRes, outcomeRes, consultRes, signalRes] = await Promise.all([
    client.from("student_profiles").select("*").eq("student_id", studentId).maybeSingle(),
    client.from("life_aspects").select("category,content,status,sort_order").eq("student_id", studentId).order("sort_order"),
    client.from("milestones").select("title,description,target_date,status,sort_order,completed_at").eq("student_id", studentId).order("sort_order"),
    client.from("roadmap_items").select("title,description,mentor,target_date,status,sort_order").eq("student_id", studentId).order("sort_order"),
    client.from("assessment_attempts").select("id,status,submitted_at,definition_id,assessment_definitions(slug,title,domain,version)").eq("student_id", studentId).order("started_at", { ascending: false }),
    client.from("assessment_action_plans").select("domain,goal,small_step,support,evidence,start_date,review_date,status,student_reflection,counselor_note").eq("student_id", studentId).order("created_at", { ascending: false }),
    client.from("career_self_profiles").select("*").eq("student_id", studentId).maybeSingle(),
    client.from("student_career_choices").select("position,custom_name,reason,review_date,status,career_profiles(name)").eq("student_id", studentId).order("position"),
    client.from("career_portfolio_items").select("title,category,evidence_url,reflection,occurred_at,status").eq("student_id", studentId).order("occurred_at", { ascending: false }),
    client.from("counseling_sessions").select("scheduled_at,session_type,status,topic,summary,recommendation,next_action").eq("student_id", studentId).order("scheduled_at", { ascending: false }),
    client.from("follow_ups").select("title,notes,due_at,priority,status,completed_at").eq("student_id", studentId).order("due_at", { ascending: false }),
    client.from("student_outcomes").select("outcome_type,institution,major_or_role,city,status,start_date,notes").eq("student_id", studentId).order("updated_at", { ascending: false }),
    client.from("consultation_requests").select("domain,urgency,status,requested_at,scheduled_at").eq("student_id", studentId).order("requested_at", { ascending: false }),
    client.from("need_signals").select("domain,kind,severity,status,created_at").eq("student_id", studentId).order("created_at", { ascending: false }),
  ]);

  const anyError = [profileRes, lifeRes, milestoneRes, roadmapRes, attemptsRes, actionRes, careerSelfRes, choicesRes, portfolioRes, counselingRes, followRes, outcomeRes, consultRes, signalRes].find((r) => r.error)?.error;
  if (anyError) throw anyError;

  const attempts = (attemptsRes.data ?? []) as Array<{
    id: string;
    status: string;
    submitted_at: string | null;
    assessment_definitions: { slug: string; title: string; domain: string; version: number } | null;
  }>;

  const attemptIds = attempts.map((a) => a.id);
  const [answersRes, reviewsRes, resultsRes] = attemptIds.length
    ? await Promise.all([
        client.from("assessment_answers").select("attempt_id,item_key,value,sensitive").in("attempt_id", attemptIds),
        client.from("assessment_reviews").select("*").in("attempt_id", attemptIds),
        client.from("assessment_results").select("*").in("attempt_id", attemptIds),
      ])
    : [{ data: [], error: null }, { data: [], error: null }, { data: [], error: null }];

  const nestedError = answersRes.error || reviewsRes.error || resultsRes.error;
  if (nestedError) throw nestedError;

  const answers = (answersRes.data ?? []) as Array<{ attempt_id: string; item_key: string; value: unknown; sensitive: boolean }>;
  const reviews = (reviewsRes.data ?? []) as UnknownRow[];
  const results = (resultsRes.data ?? []) as UnknownRow[];

  const assessments: ReportAssessment[] = attempts.map((attempt) => {
    const meta = attempt.assessment_definitions;
    const definition = meta ? getAssessmentDefinition(meta.slug, meta.version) : null;
    const byKey = new Map(answers.filter((a) => a.attempt_id === attempt.id).map((a) => [a.item_key, a]));
    const questions = definition
      ? definition.sections.flatMap((section) =>
          section.items.map((item) => {
            const answer = byKey.get(item.id);
            return {
              section: section.title,
              prompt: item.prompt,
              answer: answerDisplay(answer?.value, item.options),
              sensitive: Boolean(item.sensitive || answer?.sensitive),
            };
          }),
        )
      : answers
          .filter((a) => a.attempt_id === attempt.id)
          .map((answer) => ({ section: "Jawaban", prompt: answer.item_key, answer: answerDisplay(answer.value), sensitive: Boolean(answer.sensitive) }));

    return {
      id: attempt.id,
      title: meta?.title ?? "Asesmen",
      domain: meta?.domain ?? "unknown",
      status: attempt.status,
      submittedAt: attempt.submitted_at,
      questions,
      review: reviews.find((r) => r.attempt_id === attempt.id) ?? null,
      result: results.find((r) => r.attempt_id === attempt.id) ?? null,
    };
  });

  const s = studentRes.data as unknown as {
    id: string;
    full_name: string;
    nis: string | null;
    nisn: string | null;
    gender: string | null;
    email: string | null;
    classes: { name: string; grade: number } | null;
  };

  return {
    student: {
      id: s.id,
      full_name: s.full_name,
      nis: s.nis,
      nisn: s.nisn,
      gender: s.gender,
      email: s.email,
      class_name: s.classes?.name ?? "Kelas belum tersedia",
      grade: s.classes?.grade ?? null,
    },
    profile: (profileRes.data as UnknownRow | null) ?? null,
    lifeAspects: (lifeRes.data ?? []) as UnknownRow[],
    milestones: (milestoneRes.data ?? []) as UnknownRow[],
    roadmap: (roadmapRes.data ?? []) as UnknownRow[],
    assessments,
    actionPlans: (actionRes.data ?? []) as UnknownRow[],
    careerSelf: (careerSelfRes.data as UnknownRow | null) ?? null,
    careerChoices: (choicesRes.data ?? []) as UnknownRow[],
    careerPortfolio: (portfolioRes.data ?? []) as UnknownRow[],
    counseling: (counselingRes.data ?? []) as UnknownRow[],
    followUps: (followRes.data ?? []) as UnknownRow[],
    outcomes: (outcomeRes.data ?? []) as UnknownRow[],
    consultationRequests: (consultRes.data ?? []) as UnknownRow[],
    needSignals: (signalRes.data ?? []) as UnknownRow[],
  };
}

type PdfOptions = {
  reportTitle?: string;
  footer?: string;
  includeDetailedAnswers?: boolean;
};

function filenameSafe(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "laporan";
}

export async function downloadStudentReportPdf(bundle: StudentReportBundle, options: PdfOptions = {}) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = 210;
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = 18;

  const ensure = (height = 12) => {
    if (y + height > 280) {
      doc.addPage();
      y = 18;
    }
  };
  const line = (text: string, size = 10, bold = false, indent = 0, color: [number, number, number] = [16, 42, 58]) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text || "-", contentWidth - indent);
    ensure(lines.length * (size * 0.42) + 3);
    doc.text(lines, margin + indent, y);
    y += lines.length * (size * 0.42) + 2.5;
  };
  const heading = (text: string) => {
    ensure(14);
    y += 2;
    doc.setDrawColor(226, 233, 237);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
    line(text, 13, true, 0, [8, 62, 89]);
  };
  const kv = (label: string, value: unknown) => {
    line(label.toUpperCase(), 7.5, true, 0, [104, 124, 137]);
    line(asText(value), 10);
  };
  const bullets = (items: string[]) => {
    if (!items.length) return line("Belum ada data.", 9, false, 0, [104, 124, 137]);
    items.forEach((item) => line("• " + item, 9.5, false, 2));
  };

  doc.setFillColor(8, 62, 89);
  doc.rect(0, 0, pageWidth, 42, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(options.reportTitle ?? "Laporan Pendampingan Siswa", margin, 18);
  doc.setFontSize(11);
  doc.text(bundle.student.full_name, margin, 27);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`${bundle.student.class_name} | Bina Insan LifeMap`, margin, 34);
  y = 50;

  heading("Identitas Siswa");
  kv("Nama", bundle.student.full_name);
  kv("Kelas", bundle.student.class_name);
  kv("NIS", bundle.student.nis);
  kv("NISN", bundle.student.nisn);
  kv("Email", bundle.student.email);

  heading("Life & Career Profile");
  const profile = bundle.profile ?? {};
  [["Expertise", "expertise"], ["Arah karier", "career_direction"], ["Target pendidikan", "education_target"], ["Tahap perjalanan", "journey_stage"], ["Role model", "role_model"], ["Personal brand", "personal_brand"], ["Target jurusan", "major_target"], ["Target kampus", "campus_target"], ["Mentor", "mentor"], ["Catatan ringkas", "summary_notes"]].forEach(([label, key]) => kv(label, profile[key]));

  heading("Life Map");
  bullets(bundle.lifeAspects.filter((x) => x.content).map((x) => `${asText(x.category)}: ${asText(x.content)}`));

  heading("Milestone & Roadmap");
  bullets(bundle.milestones.map((x) => `Milestone - ${asText(x.title)} [${asText(x.status)}] ${x.target_date ? "- " + asText(x.target_date) : ""}`));
  bullets(bundle.roadmap.map((x) => `Roadmap - ${asText(x.title)} [${asText(x.status)}] ${x.mentor ? "- Mentor: " + asText(x.mentor) : ""}`));

  heading("Asesmen");
  if (!bundle.assessments.length) line("Belum ada asesmen.", 9.5, false, 0, [104, 124, 137]);
  bundle.assessments.forEach((assessment, index) => {
    line(`${index + 1}. ${assessment.title}`, 11, true);
    line(`Status: ${assessment.status}${assessment.submittedAt ? " | " + new Date(assessment.submittedAt).toLocaleDateString("id-ID") : ""}`, 8.5, false, 0, [104, 124, 137]);
    if (options.includeDetailedAnswers !== false) {
      assessment.questions.forEach((q, qIndex) => {
        line(`${qIndex + 1}. ${q.prompt}`, 9, true, 2);
        line(`Jawaban: ${q.answer}`, 9, false, 5);
      });
    }
    if (assessment.review) {
      line("Review Guru BK", 9.5, true, 2, [8, 62, 89]);
      [["Masalah prioritas", "priority_issue"], ["Tingkat kebutuhan", "need_level"], ["Bantuan disepakati", "agreed_support"], ["Status tindak lanjut", "status"], ["Catatan", "notes"]].forEach(([label, key]) => {
        const value = assessment.review?.[key];
        if (value) line(`${label}: ${asText(value)}`, 8.8, false, 5);
      });
    }
  });

  heading("Action Plan");
  bullets(bundle.actionPlans.map((x) => `${asText(x.domain)} - ${asText(x.goal)} | Langkah: ${asText(x.small_step)} | Status: ${asText(x.status)}`));

  heading("BK Karier");
  if (bundle.careerSelf) {
    [["Minat", "interests"], ["Kekuatan", "strengths"], ["Nilai kerja", "values_work"], ["Kemampuan", "abilities"], ["Area pengembangan", "development_areas"]].forEach(([label, key]) => {
      if (bundle.careerSelf?.[key]) kv(label, bundle.careerSelf[key]);
    });
  }
  bullets(bundle.careerChoices.map((x) => {
    const profileName = typeof x.career_profiles === "object" && x.career_profiles && "name" in x.career_profiles ? String((x.career_profiles as { name?: unknown }).name ?? "") : "";
    return `Plan ${asText(x.position)}: ${profileName || asText(x.custom_name)} - ${asText(x.reason)}`;
  }));
  bullets(bundle.careerPortfolio.map((x) => `${asText(x.title)} [${asText(x.category)}] - ${asText(x.reflection)}`));

  heading("Konseling & Follow-up");
  bullets(bundle.counseling.map((x) => `${asText(x.session_type)} | ${asText(x.topic)} | ${asText(x.status)} | ${asText(x.summary)} | Tindak lanjut: ${asText(x.next_action)}`));
  bullets(bundle.followUps.map((x) => `${asText(x.title)} | Prioritas ${asText(x.priority)} | Status ${asText(x.status)} | ${asText(x.notes)}`));

  heading("Outcome");
  bullets(bundle.outcomes.map((x) => `${asText(x.outcome_type)} - ${asText(x.institution)} - ${asText(x.major_or_role)} [${asText(x.status)}]`));

  heading("Permintaan Bantuan & Need Signals");
  bullets(bundle.consultationRequests.map((x) => `Permintaan BK: ${asText(x.domain)} | ${asText(x.urgency)} | ${asText(x.status)}`));
  bullets(bundle.needSignals.map((x) => `Signal: ${asText(x.domain)} | ${asText(x.kind)} | ${asText(x.severity)} | ${asText(x.status)}`));

  ensure(25);
  y += 4;
  line(options.footer ?? "Dokumen internal pendampingan BK. Gunakan sesuai kewenangan dan jaga kerahasiaan data siswa.", 7.5, false, 0, [104, 124, 137]);
  line(`Dibuat: ${new Date().toLocaleString("id-ID")}`, 7.5, false, 0, [104, 124, 137]);

  doc.save(`laporan-${filenameSafe(bundle.student.full_name)}.pdf`);
}

export async function downloadGroupReportPdf(
  bundles: StudentReportBundle[],
  title: string,
  options: PdfOptions = {},
) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 15;
  let y = 18;
  const ensure = (height = 12) => {
    if (y + height > 280) {
      doc.addPage();
      y = 18;
    }
  };
  const write = (text: string, size = 9.5, bold = false, indent = 0) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(16, 42, 58);
    const lines = doc.splitTextToSize(text || "-", 180 - indent);
    ensure(lines.length * 4.5 + 3);
    doc.text(lines, margin + indent, y);
    y += lines.length * 4.5 + 2;
  };

  doc.setFillColor(8, 62, 89);
  doc.rect(0, 0, 210, 38, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(title, margin, 18);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`${bundles.length} siswa | Bina Insan LifeMap`, margin, 28);
  y = 48;

  bundles.forEach((bundle, index) => {
    ensure(42);
    doc.setDrawColor(226, 233, 237);
    doc.line(margin, y, 195, y);
    y += 6;
    write(`${index + 1}. ${bundle.student.full_name}`, 12, true);
    write(`${bundle.student.class_name} | NIS ${bundle.student.nis ?? "-"} | NISN ${bundle.student.nisn ?? "-"}`, 8.5);
    const profile = bundle.profile ?? {};
    write(`Arah karier: ${asText(profile.career_direction)} | Target pendidikan: ${asText(profile.education_target)}`, 9);
    write(`Asesmen: ${bundle.assessments.length} | Action Plan: ${bundle.actionPlans.length} | Konseling: ${bundle.counseling.length} | Follow-up: ${bundle.followUps.filter((x) => x.status !== "done").length}`, 9);
    if (bundle.assessments.length) {
      write("Status asesmen:", 8.5, true, 2);
      bundle.assessments.forEach((a) => write(`- ${a.title}: ${a.status}`, 8.5, false, 4));
    }
    if (bundle.actionPlans.length) {
      write("Action Plan aktif:", 8.5, true, 2);
      bundle.actionPlans.slice(0, 3).forEach((x) => write(`- ${asText(x.goal)} [${asText(x.status)}]`, 8.5, false, 4));
    }
  });

  ensure(18);
  y += 4;
  write(options.footer ?? "Laporan kelompok merangkum data pendampingan. Jawaban asesmen detail tersedia pada laporan PDF individual siswa.", 7.5);
  doc.save(`${filenameSafe(title)}.pdf`);
}
