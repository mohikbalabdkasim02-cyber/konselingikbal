"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getAssessmentDefinition } from "@/lib/assessments/registry";
import { evaluateAssessment } from "@/lib/assessments/evaluate";
import type { AssessmentAnswers } from "@/lib/assessments/types";
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

  useEffect(() => { void bootstrap(); }, [slug]);

  async function bootstrap() {
    setLoading(true);
    setError("");
    try {
      if (!definition) throw new Error("Asesmen tidak ditemukan.");
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) { router.replace("/"); return; }

      const userId = sessionData.session.user.id;
      const { data: link, error: linkError } = await supabase.from("student_auth_links").select("student_id").eq("auth_user_id", userId).maybeSingle();
      if (linkError) throw linkError;
      if (!link?.student_id) throw new Error("Akun siswa belum terhubung ke data siswa. Hubungi Guru BK.");
      setStudentId(link.student_id);

      const { data: catalog, error: catalogError } = await supabase.from("assessment_definitions").select("id").eq("slug", definition.slug).eq("version", definition.version).single();
      if (catalogError) throw catalogError;
      setDefinitionId(catalog.id);

      const { data: attempt, error: attemptError } = await supabase.from("assessment_attempts").select("id,status").eq("student_id", link.student_id).eq("definition_id", catalog.id).in("status", ["draft","submitted"]).order("started_at", { ascending: false }).limit(1).maybeSingle();
      if (attemptError) throw attemptError;

      if (attempt?.id) {
        setAttemptId(attempt.id);
        setSubmitted(attempt.status === "submitted");
        const { data: rows, error: answerError } = await supabase.from("assessment_answers").select("item_key,value").eq("attempt_id", attempt.id);
        if (answerError) throw answerError;
        setAnswers(Object.fromEntries((rows ?? []).map((row) => [row.item_key, row.value])));
      }
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function ensureAttempt() {
    if (attemptId) return attemptId;
    if (!studentId || !definitionId) throw new Error("Data asesmen belum siap.");
    const { data, error: createError } = await supabase.from("assessment_attempts").insert({ student_id: studentId, definition_id: definitionId, status: "draft" }).select("id").single();
    if (createError) throw createError;
    setAttemptId(data.id);
    return data.id as string;
  }

  async function persistAnswers(nextAnswers: AssessmentAnswers) {
    const id = await ensureAttempt();
    const itemMap = new Map(definition?.sections.flatMap((section) => section.items).map((item) => [item.id, item]) ?? []);
    const rows = Object.entries(nextAnswers).map(([itemKey, value]) => ({
      attempt_id: id,
      item_key: itemKey,
      value,
      sensitive: itemMap.get(itemKey)?.sensitive ?? false,
      updated_at: new Date().toISOString(),
    }));
    if (rows.length) {
      const { error: answerError } = await supabase.from("assessment_answers").upsert(rows, { onConflict: "attempt_id,item_key" });
      if (answerError) throw answerError;
    }
    await supabase.from("assessment_attempts").update({ updated_at: new Date().toISOString() }).eq("id", id);
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
      const { error: resultError } = await supabase.from("assessment_results").upsert({
        attempt_id: id,
        domain: definition.domain,
        summary: { completedItems: evaluation.completedItems, totalItems: evaluation.totalItems },
        progress: evaluation.sectionProgress,
        calculated_at: new Date().toISOString(),
      }, { onConflict: "attempt_id" });
      if (resultError) throw resultError;

      if (evaluation.signals.length) {
        const { error: signalError } = await supabase.from("need_signals").insert(evaluation.signals.map((signal) => ({
          student_id: studentId,
          source_attempt_id: id,
          domain: definition.domain,
          kind: signal.kind,
          severity: signal.severity,
          private: signal.private,
        })));
        if (signalError) throw signalError;
      }

      const { error: attemptError } = await supabase.from("assessment_attempts").update({ status: "submitted", submitted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", id);
      if (attemptError) throw attemptError;
      setSubmitted(true);
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className="center-screen"><div className="loader"/></main>;
  if (!definition) return <main className="assessment-page"><ErrorCard message="Asesmen tidak ditemukan."/></main>;
  if (error && !studentId) return <main className="assessment-page"><div className="assessment-shell"><ErrorCard message={error} onRetry={bootstrap}/></div></main>;
  if (submitted) return <main className="assessment-page"><section className="assessment-shell"><div className="assessment-section-card"><div className="assessment-section-head"><span><ShieldCheck size={18}/></span><div><h2>Asesmen sudah terkirim</h2><p>Jawaban Anda sudah tersimpan. Hasil digunakan sebagai bahan refleksi dan pendampingan, bukan label atau diagnosis.</p></div></div><div className="assessment-actions"><Link href="/student" className="assessment-primary" style={{textDecoration:'none',padding:'11px 14px',borderRadius:13,display:'inline-flex',alignItems:'center',gap:7}}><ArrowLeft size={16}/> Kembali ke Beranda</Link></div></div></section></main>;

  return <main className="assessment-page"><div className="assessment-shell" style={{marginBottom:12}}><Link href="/student" className="back-link"><ArrowLeft size={17}/> Beranda siswa</Link>{error && <div style={{marginTop:12}}><ErrorCard message={error}/></div>}</div><AssessmentWizard definition={definition} initialAnswers={answers} saving={saving} onSave={saveDraft} onSubmit={submit}/></main>;
}
