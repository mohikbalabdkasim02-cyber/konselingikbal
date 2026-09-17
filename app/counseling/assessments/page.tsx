"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ClipboardCheck, Search, ShieldAlert } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { NeedSignalCard } from "@/components/bk/NeedSignalCard";
import { toUserMessage } from "@/lib/errors";

type NeedSignal = {
  id:string; student_id:string; domain:string; kind:string; severity:"info"|"attention"|"urgent"; status:string; created_at:string;
  students?:{full_name?:string|null;classes?:{name?:string|null}|null}|null;
};
type Attempt = {
  id:string; student_id:string; status:string; submitted_at:string|null;
  students?:{full_name?:string|null;classes?:{name?:string|null}|null}|null;
  assessment_definitions?:{title?:string|null;domain?:string|null}|null;
};

export default function AssessmentInboxPage(){
  const [signals,setSignals]=useState<NeedSignal[]>([]);
  const [attempts,setAttempts]=useState<Attempt[]>([]);
  const [query,setQuery]=useState("");
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState("");

  useEffect(()=>{void load()},[]);

  async function load(){
    setLoading(true);setMessage("");
    const [signalRes,attemptRes]=await Promise.all([
      supabase.from("need_signals").select("id,student_id,domain,kind,severity,status,created_at,students(full_name,classes(name))").in("status",["open","reviewed"]).order("created_at",{ascending:false}).limit(100),
      supabase.from("assessment_attempts").select("id,student_id,status,submitted_at,students(full_name,classes(name)),assessment_definitions(title,domain)").in("status",["submitted","reviewed"]).order("submitted_at",{ascending:false}).limit(100),
    ]);
    if(signalRes.error||attemptRes.error)setMessage(toUserMessage(signalRes.error||attemptRes.error));
    setSignals((signalRes.data??[]) as unknown as NeedSignal[]);
    setAttempts((attemptRes.data??[]) as unknown as Attempt[]);
    setLoading(false);
  }

  async function markReviewed(id:string){
    const {error}=await supabase.from("need_signals").update({status:"reviewed",reviewed_at:new Date().toISOString()}).eq("id",id);
    if(error){setMessage(toUserMessage(error));return;}
    setSignals(list=>list.map(item=>item.id===id?{...item,status:"reviewed"}:item));
  }

  const q=query.trim().toLowerCase();
  const visibleSignals=useMemo(()=>signals.filter(s=>!q||[s.students?.full_name,s.students?.classes?.name,s.domain].some(v=>v?.toLowerCase().includes(q))),[signals,q]);
  const visibleAttempts=useMemo(()=>attempts.filter(a=>!q||[a.students?.full_name,a.students?.classes?.name,a.assessment_definitions?.title].some(v=>v?.toLowerCase().includes(q))),[attempts,q]);
  const urgent=signals.filter(s=>s.status==="open"&&s.severity==="urgent").length;
  const attention=signals.filter(s=>s.status==="open"&&s.severity==="attention").length;
  const submitted=attempts.filter(a=>a.status==="submitted").length;

  return <main className="student-workspace-page">
    <header className="student-workspace-topbar"><Link href="/counseling" className="back-link"><ArrowLeft size={18}/> BK Control Center</Link><div className="workspace-brand">Bina Insan <strong>Assessment Inbox</strong></div></header>
    <section className="student-hero"><div><p className="eyebrow">ASESMEN & NEED SIGNALS</p><h1>Antrean Tindakan Guru BK</h1><p>Prioritaskan keselamatan, permintaan bantuan, asesmen masuk, dan tindak lanjut tanpa membuat ranking siswa.</p></div></section>
    {message&&<div className="workspace-message">{message}</div>}
    <div className="assessment-inbox-metrics"><Metric label="Perlu tindakan segera" value={urgent}/><Metric label="Perlu perhatian" value={attention}/><Metric label="Asesmen belum direview" value={submitted}/></div>
    <section className="assessment-inbox-shell">
      <div className="assessment-inbox-toolbar"><div className="search-box"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari siswa / kelas / asesmen"/></div></div>
      <div className="assessment-inbox-grid">
        <section className="workspace-card"><div className="card-title"><ShieldAlert size={18}/><div><p className="eyebrow">NEED SIGNALS</p><h2>Perlu ditindaklanjuti</h2></div></div>{loading?<p className="muted">Memuat...</p>:<div className="need-signal-list">{visibleSignals.length?visibleSignals.map(signal=><NeedSignalCard key={signal.id} signal={signal} onReview={markReviewed}/>):<p className="empty-state">Tidak ada need signal aktif.</p>}</div>}</section>
        <section className="workspace-card"><div className="card-title"><ClipboardCheck size={18}/><div><p className="eyebrow">ASESMEN MASUK</p><h2>Hasil terbaru</h2></div></div>{loading?<p className="muted">Memuat...</p>:<div className="assessment-attempt-list">{visibleAttempts.length?visibleAttempts.map(a=><Link key={a.id} href={`/students/${a.student_id}`} className="assessment-attempt-row"><div><strong>{a.students?.full_name??"Siswa"}</strong><span>{a.students?.classes?.name??"Kelas belum tersedia"}</span></div><div><strong>{a.assessment_definitions?.title??"Asesmen"}</strong><span>{a.submitted_at?new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'short',year:'numeric'}).format(new Date(a.submitted_at)):"Belum ada tanggal"}</span></div><span className={a.status==="submitted"?"attempt-status new":"attempt-status"}>{a.status==="submitted"?"Perlu review":"Sudah review"}</span></Link>):<p className="empty-state">Belum ada asesmen terkirim.</p>}</div>}</section>
      </div>
    </section>
  </main>
}

function Metric({label,value}:{label:string;value:number}){return <div className="assessment-inbox-metric"><span>{label}</span><strong>{value}</strong></div>}
