"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, CheckCircle2, MessageCircle, ShieldCheck, Target, UserRoundCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getAssessmentDefinition } from "@/lib/assessments/registry";
import { evaluateAssessment } from "@/lib/assessments/evaluate";
import { deriveActionPlan, deriveConsultation } from "@/lib/assessments/actions";
import type { AssessmentAnswers } from "@/lib/assessments/types";
import { buildSafeAssessmentSummary } from "@/lib/student-results-stage4";
import { AssessmentWizard } from "@/components/assessments/AssessmentWizard";
import { ErrorCard } from "@/components/common/ErrorCard";
import { toUserMessage } from "@/lib/errors";

export default function StudentAssessmentPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const definition = useMemo(() => getAssessmentDefinition(slug), [slug]);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [definitionId, setDefinitionId] = useState<string | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<AssessmentAnswers>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [helpStatus, setHelpStatus] = useState<"idle" | "sending" | "sent">("idle");

  useEffect(() => { void bootstrap(); }, [slug]);

  async function bootstrap() {
    setLoading(true); setError("");
    try {
      if (!definition) throw new Error("Asesmen tidak ditemukan.");
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) { router.replace("/student/login"); return; }
      const userId = sessionData.session.user.id;
      const { data: link, error: linkError } = await supabase.from("student_auth_links").select("student_id").eq("auth_user_id", userId).maybeSingle();
      if (linkError) throw linkError;
      if (!link?.student_id) throw new Error("Akun siswa belum terhubung ke data siswa. Hubungi Guru BK.");
      setStudentId(link.student_id);

      const { data: catalog, error: catalogError } = await supabase.from("assessment_definitions").select("id").eq("slug", definition.slug).eq("version", definition.version).single();
      if (catalogError) throw catalogError;
      setDefinitionId(catalog.id);

      const { data: attempt, error: attemptError } = await supabase.from("assessment_attempts").select("id,status").eq("student_id", link.student_id).eq("definition_id", catalog.id).in("status", ["draft","submitted","reviewed"]).order("started_at", { ascending: false }).limit(1).maybeSingle();
      if (attemptError) throw attemptError;
      if (attempt?.id) {
        setAttemptId(attempt.id);
        setSubmitted(attempt.status === "submitted" || attempt.status === "reviewed");
        const { data: rows, error: answerError } = await supabase.from("assessment_answers").select("item_key,value").eq("attempt_id", attempt.id);
        if (answerError) throw answerError;
        setAnswers(Object.fromEntries((rows ?? []).map((row) => [row.item_key, row.value])));

        if (attempt.status === "submitted" || attempt.status === "reviewed") {
          const { data: existingRequest, error: requestError } = await supabase.from("consultation_requests").select("id").eq("student_id", link.student_id).eq("source_attempt_id", attempt.id).in("status", ["requested","scheduled"]).limit(1).maybeSingle();
          if (requestError) throw requestError;
          if (existingRequest?.id) setHelpStatus("sent");
        }
      }
    } catch (err) { setError(toUserMessage(err)); }
    finally { setLoading(false); }
  }

  async function ensureAttempt() {
    if (attemptId) return attemptId;
    if (!studentId || !definitionId) throw new Error("Data asesmen belum siap.");
    const { data, error: createError } = await supabase.from("assessment_attempts").insert({ student_id: studentId, definition_id: definitionId, status: "draft" }).select("id").single();
    if (createError) throw createError;
    setAttemptId(data.id); return data.id as string;
  }

  async function persistAnswers(nextAnswers: AssessmentAnswers) {
    const id = await ensureAttempt();
    const itemMap = new Map(definition?.sections.flatMap((section) => section.items).map((item) => [item.id, item]) ?? []);
    const rows = Object.entries(nextAnswers).map(([itemKey, value]) => ({ attempt_id:id, item_key:itemKey, value, sensitive:itemMap.get(itemKey)?.sensitive ?? false, updated_at:new Date().toISOString() }));
    if (rows.length) { const { error: answerError } = await supabase.from("assessment_answers").upsert(rows, { onConflict:"attempt_id,item_key" }); if (answerError) throw answerError; }
    const { error: touchError } = await supabase.from("assessment_attempts").update({ updated_at:new Date().toISOString() }).eq("id", id); if (touchError) throw touchError;
    setAnswers(nextAnswers);
  }

  async function saveDraft(nextAnswers: AssessmentAnswers) {
    setSaving(true); setError("");
    try { await persistAnswers(nextAnswers); }
    catch (err) { setError(toUserMessage(err)); throw err; }
    finally { setSaving(false); }
  }

  async function submit(nextAnswers: AssessmentAnswers) {
    if (!definition || !studentId) return;
    setSaving(true); setError("");
    try {
      await persistAnswers(nextAnswers);
      const id = await ensureAttempt();
      const evaluation = evaluateAssessment(definition, nextAnswers);
      const safeSummary = buildSafeAssessmentSummary(definition.domain, nextAnswers);
      const { error: resultError } = await supabase.from("assessment_results").upsert({ attempt_id:id, domain:definition.domain, summary:{ completedItems:evaluation.completedItems, totalItems:evaluation.totalItems, safeSummary }, progress:evaluation.sectionProgress, calculated_at:new Date().toISOString() }, { onConflict:"attempt_id" });
      if (resultError) throw resultError;

      if (evaluation.signals.length) {
        const { error: signalError } = await supabase.from("need_signals").insert(evaluation.signals.map((signal) => ({ student_id:studentId, source_attempt_id:id, domain:definition.domain, kind:signal.kind, severity:signal.severity, private:true, status:"open" })));
        if (signalError) throw signalError;
      }

      const plan = deriveActionPlan(definition, nextAnswers);
      if (plan) {
        const { error: planError } = await supabase.from("assessment_action_plans").insert({ student_id:studentId, source_attempt_id:id, ...plan });
        if (planError) throw planError;
      }

      const consultation = deriveConsultation(evaluation.signals);
      if (consultation) {
        const { error: requestError } = await supabase.from("consultation_requests").insert({ student_id:studentId, source_attempt_id:id, domain:definition.domain, urgency:consultation.urgency, note:consultation.note, status:"requested" });
        if (requestError) throw requestError;
        setHelpStatus("sent");
      }

      const { error: attemptError } = await supabase.from("assessment_attempts").update({ status:"submitted", submitted_at:new Date().toISOString(), updated_at:new Date().toISOString() }).eq("id", id);
      if (attemptError) throw attemptError;
      setAnswers(nextAnswers);
      setSubmitted(true);
    } catch (err) { setError(toUserMessage(err)); }
    finally { setSaving(false); }
  }

  async function requestBkHelp() {
    if (!attemptId || helpStatus === "sending" || helpStatus === "sent") return;
    setHelpStatus("sending"); setError("");
    try {
      const { error: requestError } = await supabase.rpc("request_bk_help", { p_attempt_id: attemptId });
      if (requestError) throw requestError;
      setHelpStatus("sent");
    } catch (err) {
      setHelpStatus("idle");
      setError(toUserMessage(err));
    }
  }

  const resultSummary = useMemo(() => definition ? buildSafeAssessmentSummary(definition.domain, answers) : null, [definition, answers]);

  if (loading) return <main className="center-screen"><div className="loader"/></main>;
  if (!definition) return <main className="assessment-page"><ErrorCard message="Asesmen tidak ditemukan."/></main>;
  if (error && !studentId) return <main className="assessment-page"><div className="assessment-shell"><ErrorCard message={error} onRetry={bootstrap}/></div></main>;
  if (submitted && resultSummary) return <main className="assessment-page"><section className="assessment-shell">
    <Link href="/student" className="back-link"><ArrowLeft size={17}/> Beranda siswa</Link>
    <div className="assessment-section-card" style={{marginTop:18}}>
      <div className="assessment-section-head"><span><ShieldCheck size={18}/></span><div><h2>{resultSummary.title}</h2><p>Ini ringkasan untuk membantu Anda menentukan langkah berikutnya. Hasil bukan label, diagnosis, atau penilaian baik-buruk terhadap diri Anda.</p></div></div>
      {error && <div style={{marginTop:12}}><ErrorCard message={error}/></div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:12,marginTop:18}}>
        <SummaryItem icon={<Target size={18}/>} label="Fokus yang dipilih" value={resultSummary.focusAreas.length ? resultSummary.focusAreas.join(" • ") : "Belum ditentukan"}/>
        <SummaryItem icon={<CheckCircle2 size={18}/>} label="Target" value={resultSummary.goal ?? "Belum ditentukan"}/>
        <SummaryItem icon={<Target size={18}/>} label="Langkah kecil" value={resultSummary.smallStep ?? "Belum ditentukan"}/>
        <SummaryItem icon={<UserRoundCheck size={18}/>} label="Dukungan" value={resultSummary.support ?? "Belum ditentukan"}/>
        <SummaryItem icon={<CalendarDays size={18}/>} label="Evaluasi" value={resultSummary.reviewDate ?? "Belum ditentukan"}/>
      </div>
      <div style={{marginTop:18,padding:16,border:"1px solid #dce9e6",borderRadius:16,background:"#f7fbfa"}}><strong>Privasi hasil</strong><p style={{margin:"6px 0 0",lineHeight:1.6}}>Narasi sensitif tidak ditampilkan di ringkasan umum ini. Guru BK dapat melihat detail hanya di ruang review individual sesuai kewenangan.</p></div>
      <div className="assessment-actions" style={{marginTop:18,display:"flex",gap:10,flexWrap:"wrap"}}>
        <Link href="/student/action-plan" className="assessment-primary" style={{textDecoration:"none",padding:"11px 14px",borderRadius:13,display:"inline-flex",alignItems:"center",gap:7}}><Target size={16}/> Lihat Action Plan</Link>
        <button type="button" className="wide-secondary" onClick={requestBkHelp} disabled={helpStatus!=="idle"} style={{display:"inline-flex",alignItems:"center",gap:7}}><MessageCircle size={16}/>{helpStatus==="sending"?"Mengirim...":helpStatus==="sent"?"Permintaan sudah dikirim":"Saya ingin bicara dengan Guru BK"}</button>
        <Link href="/student" className="wide-secondary" style={{textDecoration:"none",padding:"11px 14px",borderRadius:13,display:"inline-flex",alignItems:"center",gap:7}}><ArrowLeft size={16}/> Kembali ke Beranda</Link>
      </div>
    </div>
  </section></main>;

  return <main className="assessment-page"><div className="assessment-shell" style={{marginBottom:12}}><Link href="/student" className="back-link"><ArrowLeft size={17}/> Beranda siswa</Link>{error && <div style={{marginTop:12}}><ErrorCard message={error}/></div>}</div><AssessmentWizard definition={definition} initialAnswers={answers} saving={saving} onSave={saveDraft} onSubmit={submit}/></main>;
}

function SummaryItem({icon,label,value}:{icon:React.ReactNode;label:string;value:string}){
  return <div style={{padding:15,border:"1px solid #e0e9e7",borderRadius:16,background:"#fff"}}><div style={{display:"flex",alignItems:"center",gap:8,color:"#0B5D55",marginBottom:7}}>{icon}<strong>{label}</strong></div><p style={{margin:0,lineHeight:1.55}}>{value}</p></div>;
}
