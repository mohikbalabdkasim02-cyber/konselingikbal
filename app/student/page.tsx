"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpenCheck, BriefcaseBusiness, ChevronRight, LogOut, ShieldCheck, Sparkles, Target, UsersRound } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { supabase } from "@/lib/supabase";
import { toUserMessage } from "@/lib/errors";
import { ErrorCard } from "@/components/common/ErrorCard";
import { getAssessmentDefinition } from "@/lib/assessments/registry";
import { deriveAssessmentStatus, deriveCareerStatus, type PortalProgress } from "@/lib/student-assessment-status";

type Student = { id:string; full_name:string; classes:{name:string}|null };
type AssessmentSlug = "pribadi" | "belajar" | "sosial";
type DefinitionRow = { id:string; slug:string; version:number };
type AttemptRow = { id:string; definition_id:string; status:string; started_at:string|null };
type AnswerRow = { attempt_id:string; item_key:string };
type CareerProfile = { interests:string|null; strengths:string|null; values_work:string|null; abilities:string|null; work_environment_preferences:string|null; interaction_style:string|null; development_areas:string|null };

const ASSESSMENT_SLUGS: AssessmentSlug[] = ["pribadi", "belajar", "sosial"];

function totalItems(slug: AssessmentSlug) {
  const definition = getAssessmentDefinition(slug);
  return definition?.sections.flatMap((section) => section.items).length ?? 1;
}

function initialAssessmentStates(): Record<AssessmentSlug, PortalProgress> {
  return {
    pribadi: deriveAssessmentStatus({ totalItems: totalItems("pribadi") }),
    belajar: deriveAssessmentStatus({ totalItems: totalItems("belajar") }),
    sosial: deriveAssessmentStatus({ totalItems: totalItems("sosial") }),
  };
}

export default function StudentHomePage() {
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [assessmentStates, setAssessmentStates] = useState<Record<AssessmentSlug, PortalProgress>>(initialAssessmentStates);
  const [careerState, setCareerState] = useState<PortalProgress>(() => deriveCareerStatus({}));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) { router.replace("/student/login"); return; }

      const { data: link, error: linkError } = await supabase
        .from("student_auth_links")
        .select("student_id")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (linkError) throw linkError;
      const id = link?.student_id as string | undefined;
      if (!id) throw new Error("Session siswa belum terhubung ke data siswa. Silakan keluar lalu masuk kembali dengan nama dan PIN.");

      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("id,full_name,classes(name)")
        .eq("id", id)
        .single();
      if (studentError) throw studentError;
      setStudent(studentData as unknown as Student);

      const { data: definitionRows, error: definitionError } = await supabase
        .from("assessment_definitions")
        .select("id,slug,version")
        .in("slug", ASSESSMENT_SLUGS)
        .eq("is_active", true)
        .order("version", { ascending:false });
      if (definitionError) throw definitionError;

      const definitions = (definitionRows ?? []) as DefinitionRow[];
      const latestBySlug = new Map<AssessmentSlug, DefinitionRow>();
      for (const row of definitions) {
        if (!ASSESSMENT_SLUGS.includes(row.slug as AssessmentSlug)) continue;
        const slug = row.slug as AssessmentSlug;
        const local = getAssessmentDefinition(slug);
        if (local && row.version === local.version && !latestBySlug.has(slug)) latestBySlug.set(slug, row);
      }

      const definitionIds = [...latestBySlug.values()].map((row) => row.id);
      let attempts: AttemptRow[] = [];
      if (definitionIds.length) {
        const { data: attemptRows, error: attemptError } = await supabase
          .from("assessment_attempts")
          .select("id,definition_id,status,started_at")
          .eq("student_id", id)
          .in("definition_id", definitionIds)
          .in("status", ["draft", "submitted"])
          .order("started_at", { ascending:false });
        if (attemptError) throw attemptError;
        attempts = (attemptRows ?? []) as AttemptRow[];
      }

      const latestAttemptByDefinition = new Map<string, AttemptRow>();
      for (const attempt of attempts) if (!latestAttemptByDefinition.has(attempt.definition_id)) latestAttemptByDefinition.set(attempt.definition_id, attempt);

      const attemptIds = [...latestAttemptByDefinition.values()].map((row) => row.id);
      const answerCounts = new Map<string, number>();
      if (attemptIds.length) {
        const { data: answerRows, error: answerError } = await supabase
          .from("assessment_answers")
          .select("attempt_id,item_key")
          .in("attempt_id", attemptIds);
        if (answerError) throw answerError;
        for (const row of (answerRows ?? []) as AnswerRow[]) answerCounts.set(row.attempt_id, (answerCounts.get(row.attempt_id) ?? 0) + 1);
      }

      const nextStates = initialAssessmentStates();
      for (const slug of ASSESSMENT_SLUGS) {
        const definitionRow = latestBySlug.get(slug);
        const attempt = definitionRow ? latestAttemptByDefinition.get(definitionRow.id) : undefined;
        nextStates[slug] = deriveAssessmentStatus({
          attemptStatus: attempt?.status,
          answeredCount: attempt ? (answerCounts.get(attempt.id) ?? 0) : 0,
          totalItems: totalItems(slug),
        });
      }
      setAssessmentStates(nextStates);

      const [profileRes, choiceRes, portfolioRes] = await Promise.all([
        supabase.from("career_self_profiles").select("interests,strengths,values_work,abilities,work_environment_preferences,interaction_style,development_areas").eq("student_id", id).maybeSingle(),
        supabase.from("student_career_choices").select("position,custom_name,reason").eq("student_id", id).in("position", ["A", "B", "C"]),
        supabase.from("career_portfolio_items").select("id").eq("student_id", id).eq("status", "active"),
      ]);
      if (profileRes.error || choiceRes.error || portfolioRes.error) throw profileRes.error || choiceRes.error || portfolioRes.error;

      const profile = profileRes.data as CareerProfile | null;
      const profileFilledCount = profile ? Object.values(profile).filter((value) => typeof value === "string" && value.trim().length > 0).length : 0;
      const choiceCount = (choiceRes.data ?? []).filter((row) => Boolean(row.custom_name?.trim() || row.reason?.trim())).length;
      setCareerState(deriveCareerStatus({ profileFilledCount, choiceCount, portfolioCount:(portfolioRes.data ?? []).length }));
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const assessmentList = ASSESSMENT_SLUGS.map((slug) => assessmentStates[slug]);
  const completedCount = assessmentList.filter((state) => state.status === "completed").length;
  const activeCount = assessmentList.filter((state) => state.status === "in_progress").length;
  const overallProgress = Math.round(assessmentList.reduce((sum, state) => sum + (state.progress ?? 0), 0) / assessmentList.length);
  const nextMessage = activeCount > 0
    ? "Lanjutkan asesmen yang sudah dimulai. Jawabanmu tersimpan otomatis."
    : completedCount === assessmentList.length
      ? "Asesmen utamamu sudah lengkap. Sekarang fokus pada Action Plan dan langkah berikutnya."
      : "Mulai dari satu asesmen yang paling relevan dengan kondisimu hari ini.";

  if (loading) return <main className="center-screen"><div className="loader"/></main>;
  if (!student) return <main className="assessment-page"><div className="assessment-shell"><ErrorCard message={error || "Akun siswa belum tersedia."} onRetry={load}/></div></main>;

  return <main className="assessment-page student-portal-stage61"><section className="assessment-shell student-portal-stage61-shell">
    <div className="student-portal-brandbar">
      <div className="student-portal-brandbar-identity"><BrandLogo compact/><div><strong>Bina Insan LifeMap</strong><span>Portal Siswa</span></div></div>
      <button className="student-portal-logout" onClick={async()=>{await supabase.auth.signOut();router.replace('/student/login')}} title="Keluar dari Portal Siswa"><LogOut size={18}/><span>Keluar</span></button>
    </div>

    <div className="student-portal-head stage61-student-hero">
      <div className="stage61-student-hero-copy">
        <p className="eyebrow">BINA INSAN • STUDENT PORTAL</p>
        <h1>Assalamu’alaikum, {student.full_name.split(" ")[0]}</h1>
        <p>{student.full_name} · {student.classes?.name ?? "Kelas belum tersedia"}</p>
        <div className="stage62-student-next">
          <span>ARAH HARI INI</span>
          <strong>{nextMessage}</strong>
        </div>
      </div>
      <div className="stage62-student-pulse" aria-label="Ringkasan progres siswa">
        <div className="stage62-pulse-top"><span>Perjalananmu</span><strong>{overallProgress}%</strong></div>
        <div className="stage62-pulse-track"><i style={{width:`${overallProgress}%`}}/></div>
        <div className="stage62-pulse-grid">
          <div><strong>{completedCount}/3</strong><span>Asesmen selesai</span></div>
          <div><strong>{activeCount}</strong><span>Sedang dilanjutkan</span></div>
          <div><strong>{careerState.status === "not_started" ? "Mulai" : "Aktif"}</strong><span>BK Karier</span></div>
        </div>
      </div>
    </div>
    <div className="student-portal-notice"><ShieldCheck size={19}/><div><strong>Ruang refleksi pribadi</strong><span>Jawaban asesmen digunakan untuk pendampingan BK sesuai kewenangan, bukan untuk memberi label.</span></div></div>
    {error && <div style={{marginBottom:14}}><ErrorCard message={error} onRetry={load}/></div>}

    <div className="student-portal-grid">
      <PortalCard href="/student/assessments/pribadi" icon={<Sparkles size={21}/>} eyebrow="ASESMEN PRIBADI" title="Bimbingan Pribadi" description="Kenali diri, emosi, kebiasaan, kebutuhan dukungan, dan susun Personal Action Plan 14 hari." state={assessmentStates.pribadi}/>
      <PortalCard href="/student/assessments/belajar" icon={<BookOpenCheck size={21}/>} eyebrow="ASESMEN BELAJAR" title="Bimbingan Belajar" description="Masalah belajar, penyebab, dampak, kebiasaan belajar, tekanan akademik, dan Learning Action Plan 14 hari." state={assessmentStates.belajar}/>
      <PortalCard href="/student/assessments/sosial" icon={<UsersRound size={21}/>} eyebrow="ASESMEN SOSIAL" title="Bimbingan Sosial" description="Sekolah, kelas, guru, teman, batas sehat, triase keselamatan, dan Social Action Plan 7–14 hari." state={assessmentStates.sosial}/>
      <PortalCard href="/student/career" icon={<BriefcaseBusiness size={21}/>} eyebrow="BK KARIER" title="Karier & LifeMap" description="Kenali diri, Career 360°, bandingkan pilihan, Plan A/B/C, portofolio, roadmap, dan tindak lanjut." state={careerState}/>
      <Link href="/student/action-plan" className="student-portal-card"><div className="student-portal-icon"><Target size={21}/></div><div><span>RENCANA SAYA</span><h2>Action Plan & Progres</h2><p>Lihat langkah yang sudah disepakati, catat refleksi perkembangan, dan tandai target yang sudah selesai.</p></div><ChevronRight size={19}/></Link>
    </div>
  </section></main>;
}

function PortalCard({href,icon,eyebrow,title,description,state}:{href:string;icon:ReactNode;eyebrow:string;title:string;description:string;state:PortalProgress}) {
  return <Link href={href} className="student-portal-card">
    <div className="student-portal-icon">{icon}</div>
    <div>
      <span>{eyebrow}</span>
      <h2>{title}</h2>
      <p>{description}</p>
      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginTop:12}}>
        <strong style={{fontSize:13}}>{state.label}</strong>
        {state.progress !== null && <span style={{fontSize:12}}>{state.progress}%</span>}
        <span style={{fontSize:12,opacity:.72}}>{state.detail}</span>
      </div>
      <div style={{marginTop:10,fontSize:13,fontWeight:800}}>{state.actionLabel}</div>
    </div>
    <ChevronRight size={19}/>
  </Link>;
}
