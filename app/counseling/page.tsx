"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, CalendarClock, Check, CheckCircle2, ChevronDown, ClipboardList, Plus, Search, Users, AlertCircle, BarChart3, Download, GraduationCap, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import "./stage3.css";

type Row = {
  student_id:string; full_name:string; class_name:string; grade:number;
  journey_stage:string|null; career_direction:string|null; education_target:string|null;
  proposal_version:number; has_counseling:boolean; last_counseling_at:string|null;
  next_follow_up_at:string|null; open_follow_ups:number;
};
type Session = {id:string;student_id:string;scheduled_at:string|null;session_type:string;status:string;topic:string|null;summary:string|null;recommendation:string|null;next_action:string|null;students:{full_name:string}|null};
type FollowUp = {id:string;student_id:string;title:string;notes:string|null;due_at:string|null;priority:string;status:string;students:{full_name:string}|null};
type Outcome = {id:string;student_id:string;outcome_type:string;institution:string|null;major_or_role:string|null;status:string;students:{full_name:string}|null};

export default function CounselingPage(){
  const [rows,setRows]=useState<Row[]>([]); const [sessions,setSessions]=useState<Session[]>([]); const [followups,setFollowups]=useState<FollowUp[]>([]); const [outcomes,setOutcomes]=useState<Outcome[]>([]);
  const [q,setQ]=useState(""); const [grade,setGrade]=useState("all"); const [loading,setLoading]=useState(true); const [msg,setMsg]=useState("");
  const [studentId,setStudentId]=useState(""); const [topic,setTopic]=useState(""); const [sessionType,setSessionType]=useState("career"); const [scheduledAt,setScheduledAt]=useState("");
  const [followTitle,setFollowTitle]=useState(""); const [followDue,setFollowDue]=useState(""); const [priority,setPriority]=useState("normal");
  const [outcomeType,setOutcomeType]=useState("undecided"); const [institution,setInstitution]=useState(""); const [majorRole,setMajorRole]=useState("");

  useEffect(()=>{loadAll()},[]);
  async function loadAll(){setLoading(true);setMsg(""); const [a,b,c,d]=await Promise.all([
    supabase.from("student_monitoring_summary").select("*").order("grade").order("full_name"),
    supabase.from("counseling_sessions").select("id,student_id,scheduled_at,session_type,status,topic,summary,recommendation,next_action,students(full_name)").order("scheduled_at",{ascending:false}).limit(50),
    supabase.from("follow_ups").select("id,student_id,title,notes,due_at,priority,status,students(full_name)").in("status",["open","in_progress"]).order("due_at",{ascending:true}).limit(50),
    supabase.from("student_outcomes").select("id,student_id,outcome_type,institution,major_or_role,status,students(full_name)").order("updated_at",{ascending:false}).limit(50)
  ]); if(a.error||b.error||c.error||d.error)setMsg(a.error?.message||b.error?.message||c.error?.message||d.error?.message||"Gagal memuat data");
    setRows((a.data||[]) as Row[]); setSessions((b.data||[]) as unknown as Session[]); setFollowups((c.data||[]) as unknown as FollowUp[]); setOutcomes((d.data||[]) as unknown as Outcome[]); setLoading(false);
  }

  const filtered=useMemo(()=>rows.filter(r=>(grade==='all'||String(r.grade)===grade)&&(!q||[r.full_name,r.class_name,r.career_direction].some(x=>x?.toLowerCase().includes(q.toLowerCase())))),[rows,q,grade]);
  const stats=useMemo(()=>({total:rows.length,counseled:rows.filter(r=>r.has_counseling).length,follow:rows.filter(r=>r.open_follow_ups>0).length,proposal:rows.filter(r=>r.proposal_version>0).length}),[rows]);
  const careerGroups=useMemo(()=>{const m=new Map<string,number>(); rows.forEach(r=>{const k=(r.career_direction||'Belum ditentukan').trim()||'Belum ditentukan';m.set(k,(m.get(k)||0)+1)});return [...m.entries()].sort((a,b)=>b[1]-a[1]).slice(0,8)},[rows]);

  async function addSession(){if(!studentId)return setMsg("Pilih siswa terlebih dahulu."); const {data:{user}}=await supabase.auth.getUser(); const {data,error}=await supabase.from("counseling_sessions").insert({student_id:studentId,counselor_id:user?.id||null,topic:topic||null,session_type:sessionType,scheduled_at:scheduledAt?new Date(scheduledAt).toISOString():null,status:'scheduled'}).select("id").single(); if(error)return setMsg(error.message); await supabase.rpc("log_activity",{p_student_id:studentId,p_action:"create",p_entity_type:"counseling_session",p_entity_id:data.id,p_metadata:{topic}}); setTopic("");setScheduledAt("");setMsg("Jadwal konseling berhasil dibuat.");loadAll();}
  async function completeSession(id:string){const {error}=await supabase.from("counseling_sessions").update({status:'completed',ended_at:new Date().toISOString()}).eq("id",id);if(error)return setMsg(error.message);setMsg("Sesi ditandai selesai.");loadAll();}
  async function addFollowUp(){if(!studentId||!followTitle.trim())return setMsg("Pilih siswa dan isi tindak lanjut.");const {data:{user}}=await supabase.auth.getUser();const {data,error}=await supabase.from("follow_ups").insert({student_id:studentId,assigned_to:user?.id||null,title:followTitle.trim(),due_at:followDue?new Date(followDue).toISOString():null,priority,status:'open'}).select("id").single();if(error)return setMsg(error.message);await supabase.rpc("log_activity",{p_student_id:studentId,p_action:"create",p_entity_type:"follow_up",p_entity_id:data.id,p_metadata:{title:followTitle}});setFollowTitle("");setFollowDue("");setMsg("Follow-up berhasil ditambahkan.");loadAll();}
  async function finishFollow(id:string){const {error}=await supabase.from("follow_ups").update({status:'done',completed_at:new Date().toISOString()}).eq("id",id);if(error)return setMsg(error.message);setMsg("Follow-up selesai.");loadAll();}
  async function saveOutcome(){if(!studentId)return setMsg("Pilih siswa terlebih dahulu."); const existing=outcomes.find(o=>o.student_id===studentId); const payload={student_id:studentId,outcome_type:outcomeType,institution:institution||null,major_or_role:majorRole||null,status:'planned'}; const result=existing?await supabase.from("student_outcomes").update(payload).eq("id",existing.id):await supabase.from("student_outcomes").insert(payload); if(result.error)return setMsg(result.error.message); await supabase.rpc("log_activity",{p_student_id:studentId,p_action:existing?"update":"create",p_entity_type:"student_outcome",p_entity_id:existing?.id||null,p_metadata:{outcome_type:outcomeType}}); setInstitution("");setMajorRole("");setMsg("Outcome siswa berhasil disimpan.");loadAll();}

  function exportCsv(){const header=["Nama","Kelas","Tingkat","Arah Karier","Target Pendidikan","Proposal","Pernah Konseling","Follow-up Aktif","Follow-up Berikutnya"];const body=filtered.map(r=>[r.full_name,r.class_name,String(r.grade),r.career_direction||"",r.education_target||"",String(r.proposal_version),r.has_counseling?"Ya":"Tidak",String(r.open_follow_ups),r.next_follow_up_at||""]);const csv=[header,...body].map(row=>row.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`monitoring-bk-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url);}

  return <main className="student-workspace-page">
    <header className="student-workspace-topbar"><Link href="/" className="back-link"><ArrowLeft size={18}/> Dashboard</Link><div className="workspace-brand">Bina Insan <strong>BK Control Center</strong></div></header>
    <section className="student-hero"><div><p className="eyebrow">TAHAP 3</p><h1>Monitoring Konseling & Follow-up</h1><p>Kelola sesi BK, tindak lanjut, prioritas siswa, outcome, dan ringkasan arah karier dalam satu tempat.</p></div><div className="stage3-actions"><button className="stage3-action-btn" onClick={exportCsv}><Download size={16}/> Ekspor CSV</button></div></section>
    {msg&&<div className="workspace-message">{msg}</div>}
    <div className="stats-grid stage3-stats"><Metric label="Siswa aktif" value={stats.total} icon={<Users size={20}/>}/><Metric label="Pernah konseling" value={stats.counseled} icon={<ClipboardList size={20}/>}/><Metric label="Perlu follow-up" value={stats.follow} icon={<AlertCircle size={20}/>}/><Metric label="Proposal masuk" value={stats.proposal} icon={<BarChart3 size={20}/>}/></div>

    <section className="stage3-grid">
      <div className="workspace-card span-2"><div className="card-title"><Users size={18}/><div><p className="eyebrow">MONITORING</p><h2>Peta Siswa</h2></div></div><div className="stage3-filters"><div className="search-box"><Search size={17}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Cari siswa / kelas / arah karier"/></div><select value={grade} onChange={e=>setGrade(e.target.value)}><option value="all">Semua tingkat</option><option value="10">Kelas X</option><option value="11">Kelas XI</option><option value="12">Kelas XII</option></select></div>
      <div className="monitor-table"><div className="monitor-head"><span>Siswa</span><span>Arah</span><span>Proposal</span><span>Follow-up</span></div>{loading?<p>Memuat...</p>:filtered.map(r=><Link href={`/students/${r.student_id}`} className="monitor-row" key={r.student_id}><span><strong>{r.full_name}</strong><small>{r.class_name}</small></span><span>{r.career_direction||"Belum ditentukan"}</span><span>{r.proposal_version?`v${r.proposal_version}`:"—"}</span><span className={r.open_follow_ups>0?'priority-text':''}>{r.open_follow_ups||"—"}</span></Link>)}</div></div>
      <aside className="workspace-card"><div className="card-title"><BarChart3 size={18}/><div><p className="eyebrow">CAREER MAP</p><h2>Arah terbanyak</h2></div></div><div className="career-bars">{careerGroups.map(([name,count])=><div key={name}><div><span>{name}</span><strong>{count}</strong></div><progress max={Math.max(...careerGroups.map(x=>x[1]),1)} value={count}/></div>)}</div></aside>
    </section>

    <section className="stage3-grid">
      <div className="workspace-card"><div className="card-title"><CalendarClock size={18}/><div><p className="eyebrow">SESI BARU</p><h2>Jadwalkan konseling</h2></div></div><StageForm rows={rows} studentId={studentId} setStudentId={setStudentId}/><label className="profile-field"><span>Topik</span><input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="Contoh: pilihan jurusan"/></label><label className="profile-field"><span>Jenis</span><select value={sessionType} onChange={e=>setSessionType(e.target.value)}><option value="career">Karier</option><option value="academic">Akademik</option><option value="personal">Personal</option><option value="follow_up">Follow-up</option><option value="parent">Orang tua</option></select></label><label className="profile-field"><span>Jadwal</span><input type="datetime-local" value={scheduledAt} onChange={e=>setScheduledAt(e.target.value)}/></label><button className="small-primary full-btn" onClick={addSession}><Plus size={16}/> Tambah sesi</button></div>
      <div className="workspace-card"><div className="card-title"><AlertCircle size={18}/><div><p className="eyebrow">TINDAK LANJUT</p><h2>Buat follow-up</h2></div></div><StageForm rows={rows} studentId={studentId} setStudentId={setStudentId}/><label className="profile-field"><span>Tugas</span><input value={followTitle} onChange={e=>setFollowTitle(e.target.value)} placeholder="Contoh: finalisasi 3 pilihan kampus"/></label><label className="profile-field"><span>Prioritas</span><select value={priority} onChange={e=>setPriority(e.target.value)}><option value="low">Rendah</option><option value="normal">Normal</option><option value="high">Tinggi</option><option value="urgent">Urgent</option></select></label><label className="profile-field"><span>Batas waktu</span><input type="datetime-local" value={followDue} onChange={e=>setFollowDue(e.target.value)}/></label><button className="small-primary full-btn" onClick={addFollowUp}><Plus size={16}/> Tambah follow-up</button></div>
    </section>

    <section className="stage3-grid">
      <div className="workspace-card"><div className="card-title"><GraduationCap size={18}/><div><p className="eyebrow">OUTCOME</p><h2>Arah akhir / alumni</h2></div></div><StageForm rows={rows} studentId={studentId} setStudentId={setStudentId}/><label className="profile-field"><span>Outcome</span><select value={outcomeType} onChange={e=>setOutcomeType(e.target.value)}><option value="undecided">Belum ditentukan</option><option value="university">Perguruan tinggi</option><option value="vocational">Vokasi</option><option value="civil_service">Kedinasan / PNS</option><option value="military_police">TNI / Polri</option><option value="work">Kerja</option><option value="entrepreneurship">Wirausaha</option><option value="gap_year">Gap year</option><option value="other">Lainnya</option></select></label><label className="profile-field"><span>Institusi / Kampus</span><input value={institution} onChange={e=>setInstitution(e.target.value)} placeholder="Nama institusi"/></label><label className="profile-field"><span>Jurusan / Peran</span><input value={majorRole} onChange={e=>setMajorRole(e.target.value)} placeholder="Jurusan atau pekerjaan"/></label><button className="small-primary full-btn" onClick={saveOutcome}><Plus size={16}/> Simpan outcome</button></div>
      <div className="workspace-card"><div className="card-title"><GraduationCap size={18}/><div><p className="eyebrow">OUTCOME TERBARU</p><h2>Jejak transisi</h2></div></div><div className="outcome-list">{outcomes.slice(0,10).map(o=><div className="outcome-chip" key={o.id}><div><strong>{o.students?.full_name||"Siswa"}</strong><span>{o.institution||labelOutcome(o.outcome_type)}{o.major_or_role?` · ${o.major_or_role}`:""}</span></div><span>{labelOutcome(o.outcome_type)}</span></div>)}</div></div>
    </section>

    <section className="stage3-grid">
      <div className="workspace-card"><div className="card-title"><ClipboardList size={18}/><div><p className="eyebrow">RIWAYAT</p><h2>Sesi terbaru</h2></div></div><div className="task-list">{sessions.slice(0,12).map(s=><div className="task-row" key={s.id}><div><strong>{s.students?.full_name||"Siswa"}</strong><small>{s.topic||s.session_type} · {s.scheduled_at?new Date(s.scheduled_at).toLocaleString('id-ID'):'Belum dijadwalkan'}</small></div><button disabled={s.status==='completed'} onClick={()=>completeSession(s.id)}>{s.status==='completed'?<><CheckCircle2 size={15}/> Selesai</>:"Selesaikan"}</button></div>)}</div></div>
      <div className="workspace-card"><div className="card-title"><AlertCircle size={18}/><div><p className="eyebrow">ANTRIAN</p><h2>Follow-up aktif</h2></div></div><div className="task-list">{followups.slice(0,12).map(f=><div className={`task-row ${f.priority==='urgent'||f.priority==='high'?'urgent':''}`} key={f.id}><div><strong>{f.students?.full_name||"Siswa"}</strong><small>{f.title} · {f.due_at?new Date(f.due_at).toLocaleDateString('id-ID'):'Tanpa deadline'}</small></div><button onClick={()=>finishFollow(f.id)}><CheckCircle2 size={15}/> Selesai</button></div>)}</div></div>
    </section>
  </main>
}

function StageForm({rows,studentId,setStudentId}:{rows:Row[];studentId:string;setStudentId:(v:string)=>void}){return <label className="profile-field"><span>Siswa</span><StudentPicker rows={rows} value={studentId} onChange={setStudentId}/></label>}

function StudentPicker({rows,value,onChange}:{rows:Row[];value:string;onChange:(v:string)=>void}){
  const [open,setOpen]=useState(false); const [query,setQuery]=useState(""); const wrapRef=useRef<HTMLDivElement>(null);
  const selected=rows.find(r=>r.student_id===value);
  const results=useMemo(()=>{const needle=query.trim().toLowerCase();return rows.filter(r=>!needle||`${r.full_name} ${r.class_name}`.toLowerCase().includes(needle)).slice(0,40)},[rows,query]);
  useEffect(()=>{function close(e:MouseEvent){if(wrapRef.current&&!wrapRef.current.contains(e.target as Node))setOpen(false)}document.addEventListener('mousedown',close);return()=>document.removeEventListener('mousedown',close)},[]);
  function choose(id:string){onChange(id);setOpen(false);setQuery("")}
  return <div className="student-picker" ref={wrapRef}>
    <button type="button" className={open?"student-picker-trigger active":"student-picker-trigger"} onClick={()=>setOpen(v=>!v)}>
      <span>{selected?<><strong>{selected.full_name}</strong><small>{selected.class_name}</small></>:<span className="student-picker-placeholder">Cari atau pilih siswa</span>}</span>
      <span className="picker-icons">{value&&<X size={15} onClick={(e)=>{e.stopPropagation();onChange("")}}/>}<ChevronDown size={17}/></span>
    </button>
    {open&&<div className="student-picker-popover">
      <div className="student-picker-search"><Search size={17}/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Ketik nama siswa, mis. A..."/></div>
      <div className="student-picker-results">{results.length?results.map(r=><button type="button" key={r.student_id} className={r.student_id===value?"student-picker-option selected":"student-picker-option"} onClick={()=>choose(r.student_id)}><span><strong>{r.full_name}</strong><small>{r.class_name}</small></span>{r.student_id===value&&<Check size={16}/>}</button>):<div className="student-picker-empty">Tidak ada siswa yang cocok.</div>}</div>
      <div className="student-picker-foot">{results.length} hasil · ketik untuk mempersempit pencarian</div>
    </div>}
  </div>
}
function Metric({label,value,icon}:{label:string;value:number;icon:React.ReactNode}){return <div className="stat-card"><div className="stat-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong></div></div>}
function labelOutcome(v:string){const labels:Record<string,string>={undecided:"Belum ditentukan",university:"Perguruan tinggi",vocational:"Vokasi",civil_service:"Kedinasan / PNS",military_police:"TNI / Polri",work:"Kerja",entrepreneurship:"Wirausaha",gap_year:"Gap year",other:"Lainnya"};return labels[v]||v}
