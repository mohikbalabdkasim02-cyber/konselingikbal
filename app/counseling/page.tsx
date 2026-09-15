"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarClock, CheckCircle2, ClipboardList, Plus, Search, Users, AlertCircle, BarChart3 } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Row = {
  student_id:string; full_name:string; class_name:string; grade:number;
  journey_stage:string|null; career_direction:string|null; education_target:string|null;
  proposal_version:number; has_counseling:boolean; last_counseling_at:string|null;
  next_follow_up_at:string|null; open_follow_ups:number;
};
type Session = {id:string;student_id:string;scheduled_at:string|null;session_type:string;status:string;topic:string|null;summary:string|null;recommendation:string|null;next_action:string|null;students:{full_name:string}|null};
type FollowUp = {id:string;student_id:string;title:string;notes:string|null;due_at:string|null;priority:string;status:string;students:{full_name:string}|null};

export default function CounselingPage(){
  const [rows,setRows]=useState<Row[]>([]); const [sessions,setSessions]=useState<Session[]>([]); const [followups,setFollowups]=useState<FollowUp[]>([]);
  const [q,setQ]=useState(""); const [grade,setGrade]=useState("all"); const [loading,setLoading]=useState(true); const [msg,setMsg]=useState("");
  const [studentId,setStudentId]=useState(""); const [topic,setTopic]=useState(""); const [sessionType,setSessionType]=useState("career"); const [scheduledAt,setScheduledAt]=useState("");
  const [followTitle,setFollowTitle]=useState(""); const [followDue,setFollowDue]=useState(""); const [priority,setPriority]=useState("normal");

  useEffect(()=>{loadAll()},[]);
  async function loadAll(){setLoading(true);setMsg(""); const [a,b,c]=await Promise.all([
    supabase.from("student_monitoring_summary").select("*").order("grade").order("full_name"),
    supabase.from("counseling_sessions").select("id,student_id,scheduled_at,session_type,status,topic,summary,recommendation,next_action,students(full_name)").order("scheduled_at",{ascending:false}).limit(50),
    supabase.from("follow_ups").select("id,student_id,title,notes,due_at,priority,status,students(full_name)").in("status",["open","in_progress"]).order("due_at",{ascending:true}).limit(50)
  ]); if(a.error||b.error||c.error)setMsg(a.error?.message||b.error?.message||c.error?.message||"Gagal memuat data");
    setRows((a.data||[]) as Row[]); setSessions((b.data||[]) as unknown as Session[]); setFollowups((c.data||[]) as unknown as FollowUp[]); setLoading(false);
  }

  const filtered=useMemo(()=>rows.filter(r=>(grade==='all'||String(r.grade)===grade)&&(!q||[r.full_name,r.class_name,r.career_direction].some(x=>x?.toLowerCase().includes(q.toLowerCase())))),[rows,q,grade]);
  const stats=useMemo(()=>({total:rows.length,counseled:rows.filter(r=>r.has_counseling).length,follow:rows.filter(r=>r.open_follow_ups>0).length,proposal:rows.filter(r=>r.proposal_version>0).length}),[rows]);
  const careerGroups=useMemo(()=>{const m=new Map<string,number>(); rows.forEach(r=>{const k=(r.career_direction||'Belum ditentukan').trim()||'Belum ditentukan';m.set(k,(m.get(k)||0)+1)});return [...m.entries()].sort((a,b)=>b[1]-a[1]).slice(0,8)},[rows]);

  async function addSession(){if(!studentId)return setMsg("Pilih siswa terlebih dahulu."); const {data:{user}}=await supabase.auth.getUser(); const {data,error}=await supabase.from("counseling_sessions").insert({student_id:studentId,counselor_id:user?.id||null,topic:topic||null,session_type:sessionType,scheduled_at:scheduledAt?new Date(scheduledAt).toISOString():null,status:'scheduled'}).select("id").single(); if(error)return setMsg(error.message); await supabase.rpc("log_activity",{p_student_id:studentId,p_action:"create",p_entity_type:"counseling_session",p_entity_id:data.id,p_metadata:{topic}}); setTopic("");setScheduledAt("");setMsg("Jadwal konseling berhasil dibuat.");loadAll();}
  async function completeSession(id:string){const {error}=await supabase.from("counseling_sessions").update({status:'completed',ended_at:new Date().toISOString()}).eq("id",id);if(error)return setMsg(error.message);setMsg("Sesi ditandai selesai.");loadAll();}
  async function addFollowUp(){if(!studentId||!followTitle.trim())return setMsg("Pilih siswa dan isi tindak lanjut.");const {data:{user}}=await supabase.auth.getUser();const {data,error}=await supabase.from("follow_ups").insert({student_id:studentId,assigned_to:user?.id||null,title:followTitle.trim(),due_at:followDue?new Date(followDue).toISOString():null,priority,status:'open'}).select("id").single();if(error)return setMsg(error.message);await supabase.rpc("log_activity",{p_student_id:studentId,p_action:"create",p_entity_type:"follow_up",p_entity_id:data.id,p_metadata:{title:followTitle}});setFollowTitle("");setFollowDue("");setMsg("Follow-up berhasil ditambahkan.");loadAll();}
  async function finishFollow(id:string){const {error}=await supabase.from("follow_ups").update({status:'done',completed_at:new Date().toISOString()}).eq("id",id);if(error)return setMsg(error.message);setMsg("Follow-up selesai.");loadAll();}

  return <main className="student-workspace-page">
    <header className="student-workspace-topbar"><Link href="/" className="back-link"><ArrowLeft size={18}/> Dashboard</Link><div className="workspace-brand">Bina Insan <strong>BK Control Center</strong></div></header>
    <section className="student-hero"><div><p className="eyebrow">TAHAP 3</p><h1>Monitoring Konseling & Follow-up</h1><p>Kelola sesi BK, tindak lanjut, prioritas siswa, dan ringkasan arah karier dalam satu tempat.</p></div></section>
    {msg&&<div className="workspace-message">{msg}</div>}
    <div className="stats-grid stage3-stats"><Metric label="Siswa aktif" value={stats.total} icon={<Users size={20}/>}/><Metric label="Pernah konseling" value={stats.counseled} icon={<ClipboardList size={20}/>}/><Metric label="Perlu follow-up" value={stats.follow} icon={<AlertCircle size={20}/>}/><Metric label="Proposal masuk" value={stats.proposal} icon={<BarChart3 size={20}/>}/></div>

    <section className="stage3-grid">
      <div className="workspace-card span-2"><div className="card-title"><Users size={18}/><div><p className="eyebrow">MONITORING</p><h2>Peta Siswa</h2></div></div><div className="stage3-filters"><div className="search-box"><Search size={17}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Cari siswa / kelas / arah karier"/></div><select value={grade} onChange={e=>setGrade(e.target.value)}><option value="all">Semua tingkat</option><option value="10">Kelas X</option><option value="11">Kelas XI</option><option value="12">Kelas XII</option></select></div>
      <div className="monitor-table"><div className="monitor-head"><span>Siswa</span><span>Arah</span><span>Proposal</span><span>Follow-up</span></div>{loading?<p>Memuat...</p>:filtered.map(r=><Link href={`/students/${r.student_id}`} className="monitor-row" key={r.student_id}><span><strong>{r.full_name}</strong><small>{r.class_name}</small></span><span>{r.career_direction||"Belum ditentukan"}</span><span>{r.proposal_version?`v${r.proposal_version}`:"—"}</span><span className={r.open_follow_ups>0?'priority-text':''}>{r.open_follow_ups||"—"}</span></Link>)}</div></div>
      <aside className="workspace-card"><div className="card-title"><BarChart3 size={18}/><div><p className="eyebrow">CAREER MAP</p><h2>Arah terbanyak</h2></div></div><div className="career-bars">{careerGroups.map(([name,count])=><div key={name}><div><span>{name}</span><strong>{count}</strong></div><progress max={Math.max(...careerGroups.map(x=>x[1]),1)} value={count}/></div>)}</div></aside>
    </section>

    <section className="stage3-grid">
      <div className="workspace-card"><div className="card-title"><CalendarClock size={18}/><div><p className="eyebrow">SESI BARU</p><h2>Jadwalkan konseling</h2></div></div><StageForm rows={rows} studentId={studentId} setStudentId={setStudentId}/><label className="profile-field"><span>Topik</span><input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="Contoh: pilihan jurusan"/></label><label className="profile-field"><span>Jenis</span><select value={sessionType} onChange={e=>setSessionType(e.target.value)}><option value="career">Karier</option><option value="academic">Akademik</option><option value="personal">Personal</option><option value="follow_up">Follow-up</option><option value="parent">Orang tua</option></select></label><label className="profile-field"><span>Jadwal</span><input type="datetime-local" value={scheduledAt} onChange={e=>setScheduledAt(e.target.value)}/></label><button className="small-primary full-btn" onClick={addSession}><Plus size={16}/> Tambah sesi</button></div>
      <div className="workspace-card"><div className="card-title"><AlertCircle size={18}/><div><p className="eyebrow">TINDAK LANJ</p><h2>Buat follow-up</h2></div></div><StageForm rows={rows} studentId={studentId} setStudentId={setStudentId}/><label className="profile-field"><span>Tugas</span><input value={followTitle} onChange={e=>setFollowTitle(e.target.value)} placeholder="Contoh: finalisasi 3 pilihan kampus"/></label><label className="profile-field"><span>Prioritas</span><select value={priority} onChange={e=>setPriority(e.target.value)}><option value="low">Rendah</option><option value="normal">Normal</option><option value="high">Tinggi</option><option value="urgent">Urgent</option></select></label><label className="profile-field"><span>Batas waktu</span><input type="datetime-local" value={followDue} onChange={e=>setFollowDue(e.target.value)}/></label><button className="small-primary full-btn" onClick={addFollowUp}><Plus size={16}/> Tambah follow-up</button></div>
    </section>

    <section className="stage3-grid">
      <div className="workspace-card"><div className="card-title"><ClipboardList size={18}/><div><p className="eyebrow">RIWAYAT</p><h2>Sesi terbaru</h2></div></div><div className="task-list">{sessions.slice(0,12).map(s=><div className="task-row" key={s.id}><div><strong>{s.students?.full_name||"Siswa"}</strong><small>{s.topic||s.session_type} · {s.scheduled_at?new Date(s.scheduled_at).toLocaleString('id-ID'):'Belum dijadwalkan'}</small></div><button disabled={s.status==='completed'} onClick={()=>completeSession(s.id)}>{s.status==='completed'?<><CheckCircle2 size={15}/> Selesai</>:"Selesaikan"}</button></div>)}</div></div>
      <div className="workspace-card"><div className="card-title"><AlertCircle size={18}/><div><p className="eyebrow">ANTRIAN</p><h2>Follow-up aktif</h2></div></div><div className="task-list">{followups.slice(0,12).map(f=><div className={`task-row ${f.priority==='urgent'||f.priority==='high'?'urgent':''}`} key={f.id}><div><strong>{f.students?.full_name||"Siswa"}</strong><small>{f.title} · {f.due_at?new Date(f.due_at).toLocaleDateString('id-ID'):'Tanpa deadline'}</small></div><button onClick={()=>finishFollow(f.id)}><CheckCircle2 size={15}/> Selesai</button></div>)}</div></div>
    </section>
  </main>
}

function StageForm({rows,studentId,setStudentId}:{rows:Row[];studentId:string;setStudentId:(v:string)=>void}){return <label className="profile-field"><span>Siswa</span><select value={studentId} onChange={e=>setStudentId(e.target.value)}><option value="">Pilih siswa</option>{rows.map(r=><option key={r.student_id} value={r.student_id}>{r.full_name} — {r.class_name}</option>)}</select></label>}
function Metric({label,value,icon}:{label:string;value:number;icon:React.ReactNode}){return <div className="stat-card"><div className="stat-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong></div></div>}
