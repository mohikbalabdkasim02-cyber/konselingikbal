"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, BellRing, CheckCircle2, Clock3, UserRound } from "lucide-react";
import { supabase } from "@/lib/supabase";
import "../stage3.css";

type RequestRow = { id:string; student_id:string; source_attempt_id:string|null; domain:string; urgency:"normal"|"soon"|"urgent"; status:"requested"|"scheduled"|"completed"|"cancelled"; requested_at:string };
type SignalRow = { id:string; student_id:string; source_attempt_id:string|null; domain:string; kind:string; severity:"info"|"attention"|"urgent"; status:"open"|"reviewed"|"resolved"; created_at:string };
type StudentMeta = { student_id:string; full_name:string; class_name:string };
type QueueItem = { key:string; student_id:string; source_attempt_id:string|null; full_name:string; class_name:string; domain:string; label:string; level:string; created_at:string; type:"request"|"signal" };

const domainLabel: Record<string,string> = { personal:"Pribadi", learning:"Belajar", social:"Sosial", career:"Karier" };
const kindLabel: Record<string,string> = {
  requested_help:"Siswa meminta bicara dengan Guru BK",
  urgent_help_request:"Permintaan bantuan segera",
  support_gap:"Butuh dukungan orang dewasa",
  personal_safety:"Perlu perhatian keamanan",
  threat_or_abuse:"Perlu tindak lanjut perlindungan",
  self_harm_concern:"Perlu tindak lanjut segera",
  social_safety_threat:"Ancaman keselamatan sosial",
  social_safety_violence:"Kekerasan / risiko kekerasan",
  social_safety_sexual:"Isu batas aman / pelecehan",
  social_safety_extortion:"Pemerasan / tekanan",
  social_safety_private_content:"Privasi digital",
  social_safety_bullying:"Perundungan berulang",
  social_safety_school_fear:"Takut datang ke sekolah",
};

function humanKind(kind:string){ return kindLabel[kind] ?? kind.replaceAll("_"," "); }

export default function CounselingRequestsPage(){
  const [requests,setRequests]=useState<RequestRow[]>([]);
  const [signals,setSignals]=useState<SignalRow[]>([]);
  const [students,setStudents]=useState<Map<string,StudentMeta>>(new Map());
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState("");
  const [filter,setFilter]=useState<"all"|"urgent"|"request"|"signal">("all");

  useEffect(()=>{ void loadQueue(); },[]);

  async function loadQueue(){
    setLoading(true); setMessage("");
    const [requestRes,signalRes,studentRes]=await Promise.all([
      supabase.from("consultation_requests").select("id,student_id,source_attempt_id,domain,urgency,status,requested_at").in("status",["requested","scheduled"]).order("requested_at",{ascending:false}).limit(100),
      supabase.from("need_signals").select("id,student_id,source_attempt_id,domain,kind,severity,status,created_at").in("status",["open","reviewed"]).order("created_at",{ascending:false}).limit(100),
      supabase.from("student_monitoring_summary").select("student_id,full_name,class_name")
    ]);
    const error=requestRes.error||signalRes.error||studentRes.error;
    if(error) setMessage(error.message||"Gagal memuat antrean bantuan.");
    setRequests((requestRes.data||[]) as RequestRow[]);
    setSignals((signalRes.data||[]) as SignalRow[]);
    setStudents(new Map(((studentRes.data||[]) as StudentMeta[]).map((row)=>[row.student_id,row])));
    setLoading(false);
  }

  const items=useMemo<QueueItem[]>(()=>{
    const reqItems:QueueItem[]=requests.map((row)=>{ const student=students.get(row.student_id); return { key:`request-${row.id}`, student_id:row.student_id, source_attempt_id:row.source_attempt_id, full_name:student?.full_name||"Siswa", class_name:student?.class_name||"—", domain:row.domain, label:"Siswa meminta bicara dengan Guru BK", level:row.urgency, created_at:row.requested_at, type:"request" }; });
    const signalItems:QueueItem[]=signals.map((row)=>{ const student=students.get(row.student_id); return { key:`signal-${row.id}`, student_id:row.student_id, source_attempt_id:row.source_attempt_id, full_name:student?.full_name||"Siswa", class_name:student?.class_name||"—", domain:row.domain, label:humanKind(row.kind), level:row.severity, created_at:row.created_at, type:"signal" }; });
    return [...reqItems,...signalItems].filter((item)=>{
      if(filter==="urgent") return item.level==="urgent";
      if(filter==="request") return item.type==="request";
      if(filter==="signal") return item.type==="signal";
      return true;
    }).sort((a,b)=>{
      const weight=(value:string)=>value==="urgent"?3:(value==="attention"||value==="soon"?2:1);
      const diff=weight(b.level)-weight(a.level);
      return diff||new Date(b.created_at).getTime()-new Date(a.created_at).getTime();
    });
  },[requests,signals,students,filter]);

  const urgentCount=items.filter((item)=>item.level==="urgent").length;

  return <main className="student-workspace-page">
    <header className="student-workspace-topbar"><Link href="/counseling" className="back-link"><ArrowLeft size={18}/> BK Control Center</Link><div className="workspace-brand">Bina Insan <strong>Need & Help Queue</strong></div></header>
    <section className="student-hero"><div><p className="eyebrow">TAHAP 4</p><h1>Permintaan Bantuan & Need Signal</h1><p>Antrean privat untuk Guru BK. Tampilan ini hanya memuat metadata kebutuhan dan prioritas, bukan isi jawaban sensitif siswa.</p></div></section>
    {message&&<div className="workspace-message">{message}</div>}
    <div className="stats-grid stage3-stats"><Metric label="Antrean aktif" value={items.length} icon={<BellRing size={20}/>}/><Metric label="Urgent" value={urgentCount} icon={<AlertTriangle size={20}/>}/><Metric label="Minta bicara" value={requests.filter((r)=>r.status==="requested").length} icon={<UserRound size={20}/>}/><Metric label="Need signal" value={signals.filter((s)=>s.status==="open").length} icon={<Clock3 size={20}/>}/></div>
    <section className="workspace-card" style={{marginTop:16}}>
      <div className="stage3-filters" style={{marginBottom:14}}>{([["all","Semua"],["urgent","Urgent"],["request","Permintaan siswa"],["signal","Need signal"]] as const).map(([value,label])=><button key={value} className={filter===value?"small-primary":"stage3-action-btn"} onClick={()=>setFilter(value)}>{label}</button>)}</div>
      <div className="task-list">{loading?<p>Memuat antrean...</p>:items.length===0?<div className="empty-state"><CheckCircle2 size={22}/><strong>Tidak ada antrean aktif</strong><span>Permintaan bantuan baru akan tampil di sini.</span></div>:items.map((item)=><div className="task-row" key={item.key}><div><strong>{item.full_name}</strong><span>{item.class_name} · {domainLabel[item.domain]||item.domain}</span><small>{item.label}</small></div><div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end"}}><span className={item.level==="urgent"?"priority-text":""}>{item.level}</span>{item.source_attempt_id&&<Link className="stage3-action-btn" href={`/counseling/assessments/${item.source_attempt_id}`}>Buka asesmen</Link>}<Link className="small-primary" href={`/students/${item.student_id}`}>Student 360</Link></div></div>)}</div>
    </section>
  </main>;
}

function Metric({label,value,icon}:{label:string;value:number;icon:React.ReactNode}){ return <div className="stat-card"><div className="stat-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong></div></div>; }
