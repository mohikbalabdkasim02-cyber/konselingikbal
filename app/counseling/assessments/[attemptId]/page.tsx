"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Download, Save, ShieldAlert } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getAssessmentDefinition } from "@/lib/assessments/registry";
import { toUserMessage } from "@/lib/errors";
import { ErrorCard } from "@/components/common/ErrorCard";
import { downloadStudentReportPdf, loadStudentReportBundle } from "@/lib/student-report";

type AttemptRow={
  id:string;student_id:string;status:string;submitted_at:string|null;
  students:{full_name:string;classes:{name:string}|null}|null;
  assessment_definitions:{slug:string;title:string;domain:"personal"|"learning"|"social"|"career";version:number}|null;
};
type ReviewState={
  need_level:string;priority_issue:string;triggers:string;protective_factors:string;agreed_support:string;involved_parties:string;follow_up_date:string;status:string;notes:string;review_data:Record<string,string>;
};
const EMPTY:ReviewState={need_level:"",priority_issue:"",triggers:"",protective_factors:"",agreed_support:"",involved_parties:"",follow_up_date:"",status:"monitoring",notes:"",review_data:{}};

const FIELD_LABELS:Record<string,Array<[string,string]>>={
  learning:[
    ["learning_problem","Masalah belajar utama"],["learning_cause","Faktor penyebab dominan"],["learning_impact","Dampak yang sudah terlihat"],["learning_strength","Kekuatan/protektif siswa"],["learning_need","Kebutuhan prioritas"],["learning_intervention","Rencana Intervensi / Layanan BK"],
  ],
  social:[
    ["social_area","Area dominan (Sekolah / Kelas / Guru / Teman)"],["social_impact","Tingkat dampak (Ringan / Sedang / Berat / Perlu penanganan segera)"],["social_safety","Risiko keselamatan (Tidak terindikasi / Perlu asesmen lanjut / Perlu tindakan segera)"],["social_need","Kebutuhan utama siswa"],["social_strength","Kekuatan/sumber dukungan siswa"],["social_intervention","Intervensi awal"],
  ],
};

function answerDisplay(value:unknown, options?:Array<{value:string;label:string}>){
  if(Array.isArray(value)) return value.map(v=>options?.find(o=>o.value===String(v))?.label??String(v)).join("; ");
  if(typeof value==="string") return options?.find(o=>o.value===value)?.label??value;
  if(value===null||value===undefined) return "—";
  return JSON.stringify(value);
}

export default function CounselorAssessmentReview(){
  const {attemptId}=useParams<{attemptId:string}>();
  const [attempt,setAttempt]=useState<AttemptRow|null>(null);const [answers,setAnswers]=useState<Record<string,unknown>>({});const [review,setReview]=useState<ReviewState>(EMPTY);const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);const [reporting,setReporting]=useState(false);const [message,setMessage]=useState("");
  useEffect(()=>{void load()},[attemptId]);

  async function load(){
    setLoading(true);setMessage("");
    try{
      const a=await supabase.from("assessment_attempts").select("id,student_id,status,submitted_at,students(full_name,classes(name)),assessment_definitions(slug,title,domain,version)").eq("id",attemptId).single();if(a.error)throw a.error;
      setAttempt(a.data as unknown as AttemptRow);
      const [ans,rev]=await Promise.all([
        supabase.from("assessment_answers").select("item_key,value").eq("attempt_id",attemptId),
        supabase.from("assessment_reviews").select("need_level,priority_issue,triggers,protective_factors,agreed_support,involved_parties,follow_up_date,status,notes,review_data").eq("attempt_id",attemptId).maybeSingle(),
      ]);
      if(ans.error)throw ans.error;if(rev.error)throw rev.error;
      setAnswers(Object.fromEntries((ans.data??[]).map(x=>[x.item_key,x.value])));
      if(rev.data)setReview({...EMPTY,...rev.data,follow_up_date:rev.data.follow_up_date??"",review_data:(rev.data.review_data??{}) as Record<string,string>});
    }catch(e){setMessage(toUserMessage(e));}finally{setLoading(false)}
  }

  async function saveReview(){
    if(!attempt)return;setSaving(true);setMessage("");
    try{
      const payload={attempt_id:attempt.id,need_level:review.need_level||null,priority_issue:review.priority_issue||null,triggers:review.triggers||null,protective_factors:review.protective_factors||null,agreed_support:review.agreed_support||null,involved_parties:review.involved_parties||null,follow_up_date:review.follow_up_date||null,status:review.status||"monitoring",notes:review.notes||null,review_data:review.review_data,updated_at:new Date().toISOString()};
      const r=await supabase.from("assessment_reviews").upsert(payload,{onConflict:"attempt_id"});if(r.error)throw r.error;
      const a=await supabase.from("assessment_attempts").update({status:"reviewed",reviewed_at:new Date().toISOString()}).eq("id",attempt.id);if(a.error)throw a.error;
      setAttempt({...attempt,status:"reviewed"});setMessage("Review Guru BK berhasil disimpan.");
    }catch(e){setMessage(toUserMessage(e));}finally{setSaving(false)}
  }

  const definition=useMemo(()=>attempt?.assessment_definitions?getAssessmentDefinition(attempt.assessment_definitions.slug,attempt.assessment_definitions.version):null,[attempt]);
  const answered=useMemo(()=>definition?.sections.flatMap(section=>section.items.map(item=>({section:section.title,item,value:answers[item.id]})))??[],[definition,answers]);
  const answeredCount=useMemo(()=>answered.filter(x=>x.value!==undefined&&x.value!==null&&x.value!=="").length,[answered]);

  async function downloadFullReport(){
    if(!attempt)return;
    setReporting(true);setMessage("");
    try{
      const bundle=await loadStudentReportBundle(supabase,attempt.student_id);
      await downloadStudentReportPdf(bundle,{includeDetailedAnswers:true});
      setMessage("PDF laporan komprehensif siswa berhasil dibuat.");
    }catch(e){setMessage(toUserMessage(e))}finally{setReporting(false)}
  }
  if(loading)return <main className="center-screen"><div className="loader"/></main>;
  if(!attempt)return <main className="assessment-page"><div className="assessment-shell"><ErrorCard message={message||"Hasil asesmen tidak ditemukan."}/></div></main>;
  const domain=attempt.assessment_definitions?.domain??"personal";

  return <main className="student-workspace-page">
    <header className="student-workspace-topbar"><Link href="/counseling/assessments" className="back-link"><ArrowLeft size={18}/> Assessment Inbox</Link><div className="workspace-brand">Bina Insan <strong>Review Asesmen</strong></div></header>
    <section className="student-hero"><div><p className="eyebrow">REVIEW GURU BK</p><h1>{attempt.students?.full_name??"Siswa"}</h1><p>{attempt.students?.classes?.name??"Kelas belum tersedia"} · {attempt.assessment_definitions?.title??"Asesmen"}</p></div><div className="hero-actions"><button className="refresh-btn" onClick={downloadFullReport} disabled={reporting}><Download size={16}/>{reporting?"Menyiapkan...":"Download PDF Siswa"}</button><span className="status-pill"><CheckCircle2 size={16}/>{attempt.status==="reviewed"?"Sudah direview":"Perlu review"}</span></div></section>
    {message&&<div className="workspace-message">{message}</div>}
    <section className="counselor-review-grid">
      <div className="workspace-card"><div className="card-title"><ShieldAlert size={18}/><div><p className="eyebrow">JAWABAN SISWA</p><h2>{answeredCount}/{answered.length} soal terjawab</h2></div></div><p className="section-copy">Semua soal ditampilkan sesuai urutan asesmen, termasuk soal yang belum dijawab. Jawaban sensitif hanya ditampilkan di ruang review individual ini.</p><div className="review-answer-list">{answered.map(({section,item,value},index)=><div className={value===undefined||value===null||value===""?"review-answer unanswered":"review-answer"} key={item.id}><small>{String(index+1).padStart(2,"0")} · {section}{item.sensitive?" · SENSITIF":""}</small><strong>{item.prompt}</strong><p>{answerDisplay(value,item.options)}</p></div>)}</div></div>
      <aside className="workspace-card counselor-review-form"><div className="card-title"><Save size={18}/><div><p className="eyebrow">LEMBAR TINDAK LANJUT</p><h2>Catatan Guru BK</h2></div></div>
        {domain==="personal"&&<><TextArea label="Masalah prioritas" value={review.priority_issue} onChange={v=>setReview({...review,priority_issue:v})}/><label className="profile-field"><span>Tingkat kebutuhan</span><select value={review.need_level} onChange={e=>setReview({...review,need_level:e.target.value})}><option value="">Pilih</option><option value="light">Ringan</option><option value="medium">Sedang</option><option value="high">Tinggi</option><option value="urgent">Perlu tindak lanjut segera</option></select></label><TextArea label="Faktor pemicu utama" value={review.triggers} onChange={v=>setReview({...review,triggers:v})}/><TextArea label="Faktor pelindung/kekuatan siswa" value={review.protective_factors} onChange={v=>setReview({...review,protective_factors:v})}/><TextArea label="Bantuan yang disepakati" value={review.agreed_support} onChange={v=>setReview({...review,agreed_support:v})}/></>}
        {(FIELD_LABELS[domain]??[]).map(([key,label])=><TextArea key={key} label={label} value={review.review_data[key]??""} onChange={v=>setReview({...review,review_data:{...review.review_data,[key]:v}})}/>)}
        <TextArea label="Pihak yang dilibatkan" value={review.involved_parties} onChange={v=>setReview({...review,involved_parties:v})}/><label className="profile-field"><span>{domain==="learning"?"Tanggal evaluasi berikutnya":"Tanggal tindak lanjut"}</span><input type="date" value={review.follow_up_date} onChange={e=>setReview({...review,follow_up_date:e.target.value})}/></label><label className="profile-field"><span>Status</span><select value={review.status} onChange={e=>setReview({...review,status:e.target.value})}><option value="done">Selesai</option><option value="monitoring">Monitoring</option><option value="continued_counseling">Konseling lanjutan</option><option value="referral">Rujukan</option></select></label><TextArea label="Catatan konselor" value={review.notes} onChange={v=>setReview({...review,notes:v})}/><button className="small-primary full-btn" onClick={saveReview} disabled={saving}><Save size={16}/>{saving?"Menyimpan...":"Simpan Review"}</button>
      </aside>
    </section>
  </main>
}

function TextArea({label,value,onChange}:{label:string;value:string;onChange:(value:string)=>void}){return <label className="profile-field"><span>{label}</span><textarea value={value} onChange={e=>onChange(e.target.value)} rows={3}/></label>}
