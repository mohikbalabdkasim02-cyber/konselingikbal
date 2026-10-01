"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Save } from "lucide-react";
import { AssessmentItem } from "./AssessmentItem";
import { AssessmentProgress } from "./AssessmentProgress";
import { evaluateAssessment } from "@/lib/assessments/evaluate";
import type { AssessmentAnswers, AssessmentDefinition } from "@/lib/assessments/types";

function hasAnswer(value:unknown){
  if(Array.isArray(value))return value.length>0;
  if(typeof value==="string")return value.trim().length>0;
  return value!==undefined&&value!==null&&value!=="";
}

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
  const [itemIndex, setItemIndex] = useState(0);
  const [mobileMode, setMobileMode] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [localSaving, setLocalSaving] = useState(false);
  const section = definition.sections[sectionIndex];
  const evaluation = useMemo(() => evaluateAssessment(definition, answers), [definition, answers]);
  const flatItems = useMemo(
    () => definition.sections.flatMap((sectionItem, sectionPosition) =>
      sectionItem.items.map((item) => ({item, section:sectionItem, sectionIndex:sectionPosition})),
    ),
    [definition],
  );
  const currentMobile = flatItems[itemIndex];

  useEffect(()=>{
    const media=window.matchMedia("(max-width: 820px)");
    const sync=()=>setMobileMode(media.matches);
    sync();
    media.addEventListener("change",sync);
    return()=>media.removeEventListener("change",sync);
  },[]);

  useEffect(()=>{
    if(!mobileMode||!flatItems.length)return;
    const firstOpen=flatItems.findIndex(({item})=>!hasAnswer(answers[item.id]));
    if(firstOpen>0)setItemIndex(firstOpen);
  // only choose the resume point when the mobile assessment is first opened
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[mobileMode]);

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

  async function nextMobile(){
    try{
      await saveNow();
      if(itemIndex<flatItems.length-1)setItemIndex(value=>value+1);
      else setReviewing(true);
    }catch{
      // Parent surfaces the save error; keep the student on the same question.
    }
  }

  async function previousMobile(){
    try{
      await saveNow();
      setItemIndex(value=>Math.max(0,value-1));
    }catch{
      // Parent surfaces the save error; keep the student on the same question.
    }
  }

  if (reviewing) {
    return (
      <section className="assessment-shell">
        <div className="assessment-review-head"><div><p className="eyebrow">TINJAU JAWABAN</p><h1>{definition.title}</h1><p>Periksa kembali sebelum mengirim. Hasil asesmen digunakan untuk refleksi dan pendampingan, bukan diagnosis.</p></div><div className="assessment-completion"><strong>{evaluation.completedItems}</strong><span>dari {evaluation.totalItems} butir terisi</span></div></div>
        <div className="assessment-review-list">{definition.sections.map((item, index) => <button key={item.id} type="button" onClick={() => {
          setSectionIndex(index);
          if(mobileMode){
            const first=flatItems.findIndex(entry=>entry.sectionIndex===index);
            if(first>=0)setItemIndex(first);
          }
          setReviewing(false);
        }}><span>{String(index + 1).padStart(2,"0")}</span><div><strong>{item.title}</strong><small>{evaluation.sectionProgress[item.id]?.answered ?? 0} / {evaluation.sectionProgress[item.id]?.total ?? item.items.length} terisi</small></div><ArrowRight size={17}/></button>)}</div>
        <div className="assessment-actions"><button type="button" className="assessment-secondary" onClick={() => setReviewing(false)}><ArrowLeft size={18}/> Kembali</button><button type="button" className="assessment-primary" disabled={saving || localSaving} onClick={submitNow}><CheckCircle2 size={19}/> {saving || localSaving ? "Mengirim…" : "Kirim Asesmen"}</button></div>
      </section>
    );
  }

  if(mobileMode&&currentMobile){
    const progress=Math.round(((itemIndex+1)/flatItems.length)*100);
    return <section className="assessment-shell assessment-mobile-wizard">
      <div className="assessment-mobile-top">
        <div><span>{definition.domain.toUpperCase()}</span><strong>{definition.title}</strong></div>
        <b>{itemIndex+1}/{flatItems.length}</b>
      </div>
      <div className="assessment-mobile-progress"><i style={{width:`${progress}%`}}/></div>
      <article className="assessment-mobile-question">
        <div className="assessment-mobile-section">
          <span>{currentMobile.section.title}</span>
          <small>Pertanyaan {itemIndex+1} dari {flatItems.length}</small>
        </div>
        <AssessmentItem
          item={currentMobile.item}
          value={answers[currentMobile.item.id]}
          onChange={(value) => setAnswers((current) => ({...current,[currentMobile.item.id]:value}))}
        />
      </article>
      <div className="assessment-mobile-save-state">
        <Save/>
        <span>Jawaban disimpan saat Anda berpindah pertanyaan.</span>
      </div>
      <div className="assessment-actions assessment-mobile-actions">
        <button type="button" className="assessment-secondary" disabled={itemIndex===0} onClick={()=>void previousMobile()}><ArrowLeft size={19}/> Kembali</button>
        <button type="button" className="assessment-primary" disabled={saving||localSaving} onClick={()=>void nextMobile()}>
          {saving||localSaving?"Menyimpan…":itemIndex<flatItems.length-1?"Lanjut":"Tinjau"}
          {!saving&&!localSaving&&<ArrowRight size={19}/>}
        </button>
      </div>
    </section>;
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
        <button type="button" className="assessment-secondary" disabled={sectionIndex === 0} onClick={() => setSectionIndex((value) => Math.max(0, value - 1))}><ArrowLeft size={18}/> Sebelumnya</button>
        <button type="button" className="assessment-save" disabled={saving || localSaving} onClick={saveNow}><Save size={18}/> {saving || localSaving ? "Menyimpan…" : "Simpan draf"}</button>
        {sectionIndex < definition.sections.length - 1 ? <button type="button" className="assessment-primary" onClick={() => setSectionIndex((value) => value + 1)}>Lanjut <ArrowRight size={18}/></button> : <button type="button" className="assessment-primary" onClick={() => setReviewing(true)}>Tinjau <ArrowRight size={18}/></button>}
      </div>
    </section>
  );
}
