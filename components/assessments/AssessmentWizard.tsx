"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Save } from "lucide-react";
import { AssessmentItem } from "./AssessmentItem";
import { AssessmentProgress } from "./AssessmentProgress";
import { evaluateAssessment } from "@/lib/assessments/evaluate";
import type { AssessmentAnswers, AssessmentDefinition } from "@/lib/assessments/types";

export function AssessmentWizard({
  definition,
  initialAnswers = {},
  saving = false,
  onSave,
  onSubmit,
}: {
  definition: AssessmentDefinition;
  initialAnswers?: AssessmentAnswers;
  saving?: boolean;
  onSave?: (answers: AssessmentAnswers) => Promise<void> | void;
  onSubmit?: (answers: AssessmentAnswers) => Promise<void> | void;
}) {
  const [answers, setAnswers] = useState<AssessmentAnswers>(initialAnswers);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const [localSaving, setLocalSaving] = useState(false);
  const section = definition.sections[sectionIndex];
  const evaluation = useMemo(() => evaluateAssessment(definition, answers), [definition, answers]);

  async function saveNow() {
    if (!onSave) return;
    setLocalSaving(true);
    try { await onSave(answers); } finally { setLocalSaving(false); }
  }

  async function submitNow() {
    if (!onSubmit) return;
    setLocalSaving(true);
    try { await onSubmit(answers); } finally { setLocalSaving(false); }
  }

  if (reviewing) {
    return (
      <section className="assessment-shell">
        <div className="assessment-review-head"><div><p className="eyebrow">TINJAU JAWABAN</p><h1>{definition.title}</h1><p>Periksa kembali sebelum mengirim. Hasil asesmen digunakan untuk refleksi dan pendampingan, bukan diagnosis.</p></div><div className="assessment-completion"><strong>{evaluation.completedItems}</strong><span>dari {evaluation.totalItems} butir terisi</span></div></div>
        <div className="assessment-review-list">{definition.sections.map((item, index) => <button key={item.id} type="button" onClick={() => {setSectionIndex(index);setReviewing(false)}}><span>{String(index + 1).padStart(2,"0")}</span><div><strong>{item.title}</strong><small>{evaluation.sectionProgress[item.id]?.answered ?? 0} / {evaluation.sectionProgress[item.id]?.total ?? item.items.length} terisi</small></div><ArrowRight size={17}/></button>)}</div>
        <div className="assessment-actions"><button type="button" className="assessment-secondary" onClick={() => setReviewing(false)}><ArrowLeft size={16}/> Kembali</button><button type="button" className="assessment-primary" disabled={saving || localSaving} onClick={submitNow}><CheckCircle2 size={17}/> {saving || localSaving ? "Mengirim…" : "Kirim Asesmen"}</button></div>
      </section>
    );
  }

  return (
    <section className="assessment-shell">
      <div className="assessment-title"><p className="eyebrow">{definition.domain.toUpperCase()}</p><h1>{definition.title}</h1>{definition.subtitle && <p>{definition.subtitle}</p>}</div>
      <AssessmentProgress current={sectionIndex} total={definition.sections.length}/>
      <article className="assessment-section-card">
        <div className="assessment-section-head"><span>{String(sectionIndex + 1).padStart(2,"0")}</span><div><h2>{section.title}</h2>{section.description && <p>{section.description}</p>}</div></div>
        <div className="assessment-items">{section.items.map((item) => <AssessmentItem key={item.id} item={item} value={answers[item.id]} onChange={(value) => setAnswers((current) => ({...current,[item.id]:value}))}/>)}</div>
      </article>
      <div className="assessment-actions">
        <button type="button" className="assessment-secondary" disabled={sectionIndex === 0} onClick={() => setSectionIndex((value) => Math.max(0, value - 1))}><ArrowLeft size={16}/> Sebelumnya</button>
        <button type="button" className="assessment-save" disabled={saving || localSaving} onClick={saveNow}><Save size={16}/> {saving || localSaving ? "Menyimpan…" : "Simpan draf"}</button>
        {sectionIndex < definition.sections.length - 1 ? <button type="button" className="assessment-primary" onClick={() => setSectionIndex((value) => value + 1)}>Lanjut <ArrowRight size={16}/></button> : <button type="button" className="assessment-primary" onClick={() => setReviewing(true)}>Tinjau <ArrowRight size={16}/></button>}
      </div>
    </section>
  );
}
