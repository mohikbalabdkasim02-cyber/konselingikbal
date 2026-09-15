"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronRight, FileCheck2, GraduationCap, LogOut, Search, ShieldCheck, Sparkles, Users, ClipboardList } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Student = {
  id: string;
  full_name: string;
  gender: "L" | "P" | null;
  email: string | null;
  nis: string | null;
  nisn: string | null;
  classes: { name: string; slug: string; grade: number } | null;
  student_profiles: { journey_stage: string; expertise: string | null; career_direction: string | null } | null;
};

type StudentDocument = { student_id: string; status: string; latest_version: number };

export default function HomePage() {
  const [sessionReady, setSessionReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [email, setEmail] = useState("mohikbalabdkasim.02@gmail.com");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [documents, setDocuments] = useState<Record<string, StudentDocument>>({});
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [selected, setSelected] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const active = Boolean(data.session);
      setLoggedIn(active);
      setSessionReady(true);
      if (active) loadStudents();
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const active = Boolean(session);
      setLoggedIn(active);
      if (active) loadStudents(); else setStudents([]);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function loadStudents() {
    setLoading(true);
    setAuthMessage("");
    const [studentsRes, docsRes] = await Promise.all([
      supabase.from("students").select("id,full_name,gender,email,nis,nisn,classes(name,slug,grade),student_profiles(journey_stage,expertise,career_direction)").eq("is_active", true).order("full_name"),
      supabase.from("student_documents").select("student_id,status,latest_version").eq("document_type", "proposal_hidup"),
    ]);
    if (studentsRes.error) setAuthMessage(studentsRes.error.message);
    else setStudents((studentsRes.data ?? []) as unknown as Student[]);
    if (!docsRes.error) setDocuments(Object.fromEntries(((docsRes.data ?? []) as StudentDocument[]).map((item) => [item.student_id, item])));
    setLoading(false);
  }

  async function signIn(e: FormEvent) {
    e.preventDefault(); setAuthMessage(""); setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthMessage(error.message); setLoading(false);
  }

  async function activateAccount() {
    setAuthMessage("");
    if (!password || password.length < 8) return setAuthMessage("Gunakan password minimal 8 karakter untuk aktivasi akun pertama.");
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: "Moh Ikbal Abd Kasim" } } });
    setAuthMessage(error ? error.message : "Akun dibuat. Jika verifikasi email aktif, cek inbox lalu login.");
    setLoading(false);
  }

  const classes = useMemo(() => [...new Map(students.filter((s)=>s.classes).map((s)=>[s.classes!.slug,s.classes!])).values()].sort((a,b)=>a.grade-b.grade || a.name.localeCompare(b.name)), [students]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter((student) => {
      const matchesQuery = !q || [student.full_name, student.email, student.nis, student.nisn, student.student_profiles?.career_direction].some((v) => v?.toLowerCase().includes(q));
      const matchesClass = classFilter === "all" || student.classes?.slug === classFilter;
      const matchesGrade = gradeFilter === "all" || String(student.classes?.grade) === gradeFilter;
      return matchesQuery && matchesClass && matchesGrade;
    });
  }, [students, query, classFilter, gradeFilter]);

  const counts = { x: students.filter((s)=>s.classes?.grade===10).length, xi: students.filter((s)=>s.classes?.grade===11).length, xii: students.filter((s)=>s.classes?.grade===12).length };
  const mapped = students.filter((s) => s.student_profiles?.journey_stage && s.student_profiles.journey_stage !== "belum_dipetakan").length;
  const proposalCount = Object.values(documents).filter((d)=>d.latest_version>0 && d.status!=="archived").length;

  if (!sessionReady) return <main className="center-screen"><div className="loader" /></main>;
  if (!loggedIn) return <main className="login-page"><section className="login-panel"><div className="brand-mark">BI</div><p className="eyebrow">BINA INSAN PALU</p><h1>LifeMap</h1><p className="muted">Dashboard pemantauan siswa, proposal hidup, arah karier, dan pendampingan BK.</p><form onSubmit={signIn} className="login-form"><label>Email<input value={email} onChange={(e)=>setEmail(e.target.value)} type="email" required/></label><label>Password<input value={password} onChange={(e)=>setPassword(e.target.value)} type="password" required/></label><button className="primary-btn" disabled={loading}>{loading?"Memproses...":"Masuk"}</button><button type="button" className="ghost-btn" onClick={activateAccount} disabled={loading}>Aktivasi akun pertama</button></form>{authMessage&&<p className="auth-message">{authMessage}</p>}</section></main>;

  return <main className="app-shell">
    <header className="topbar"><div className="brand-row"><div className="brand-mark small">BI</div><div><strong>Bina Insan LifeMap</strong><span>Student Life & Career Dashboard</span></div></div><div className="top-actions"><Link href="/counseling" className="open-profile-btn" style={{marginTop:0,padding:'10px 13px'}}><ClipboardList size={17}/> BK Control Center</Link><div className="search-box"><Search size={18}/><input placeholder="Cari siswa, NIS, karier..." value={query} onChange={(e)=>setQuery(e.target.value)}/></div><button className="icon-btn" onClick={()=>supabase.auth.signOut()} title="Keluar"><LogOut size={18}/></button></div></header>
    <div className="workspace">
      <section className="main-column">
        <div className="hero-row"><div><p className="eyebrow">TAHUN AJARAN 2026/2027</p><h1>Student Life & Career Map</h1><p className="muted">Pantau 116 siswa dari kelas X hingga XII, proposal hidup, arah perkembangan, konseling, dan tindak lanjut masing-masing.</p></div><span className="status-pill"><ShieldCheck size={16}/> Supabase aktif</span></div>
        <div className="stats-grid"><Stat title="Total siswa" value={students.length} icon={<Users size={20}/>}/><Stat title="Proposal masuk" value={proposalCount} icon={<FileCheck2 size={20}/>}/><Stat title="Sudah dipetakan" value={mapped} icon={<Sparkles size={20}/>}/><Stat title="Kelas XII" value={counts.xii} icon={<GraduationCap size={20}/>}/></div>
        <div className="grade-tabs"><button className={gradeFilter==='all'?'active':''} onClick={()=>{setGradeFilter('all');setClassFilter('all')}}>Semua <strong>{students.length}</strong></button><button className={gradeFilter==='10'?'active':''} onClick={()=>{setGradeFilter('10');setClassFilter('all')}}>Kelas X <strong>{counts.x}</strong></button><button className={gradeFilter==='11'?'active':''} onClick={()=>{setGradeFilter('11');setClassFilter('all')}}>Kelas XI <strong>{counts.xi}</strong></button><button className={gradeFilter==='12'?'active':''} onClick={()=>{setGradeFilter('12');setClassFilter('all')}}>Kelas XII <strong>{counts.xii}</strong></button></div>
        <section className="panel"><div className="panel-head"><div><p className="eyebrow">STUDENT DIRECTORY</p><h2>Daftar Siswa</h2></div><select value={classFilter} onChange={(e)=>setClassFilter(e.target.value)}><option value="all">Semua rombel</option>{classes.filter((c)=>gradeFilter==='all'||String(c.grade)===gradeFilter).map((c)=><option key={c.slug} value={c.slug}>{c.name}</option>)}</select></div>
          <div className="student-list">{loading?<p className="muted">Memuat data...</p>:filtered.map((student)=><button key={student.id} className="student-row" onClick={()=>setSelected(student)}><div className="avatar">{student.full_name.slice(0,2).toUpperCase()}</div><div className="student-main"><strong>{student.full_name}</strong><span>{student.classes?.name ?? "Kelas belum tersedia"} · {student.student_profiles?.career_direction || "Arah karier belum diisi"}</span></div><div className="student-meta"><span className={documents[student.id]?.latest_version ? 'doc-badge ready':'doc-badge'}>{documents[student.id]?.latest_version ? `Proposal v${documents[student.id].latest_version}` : 'Belum ada proposal'}</span><ChevronRight size={18}/></div></button>)}{!loading&&filtered.length===0&&<div className="empty-state">Tidak ada siswa yang cocok dengan filter.</div>}</div>
        </section>
      </section>
      <aside className="side-column"><div className="side-card accent-card"><p className="eyebrow">RINGKASAN</p><h2>{students.length} siswa aktif</h2><p>Empat rombel dari kelas X, XI, dan XII sudah terhubung. Proposal, LifeMap, konseling, follow-up, dan outcome kini dikelola dalam satu sistem.</p><Link href="/counseling" className="wide-secondary" style={{display:'block',textAlign:'center',textDecoration:'none'}}>Buka BK Control Center</Link></div><div className="side-card"><div className="side-title"><CalendarDays size={18}/><strong>Progress Sistem</strong></div><div className="class-breakdown"><div><span>Kelas X</span><strong>{counts.x}</strong></div><div><span>Kelas XI</span><strong>{counts.xi}</strong></div><div><span>Kelas XII</span><strong>{counts.xii}</strong></div><div><span>Proposal</span><strong>{proposalCount}</strong></div></div></div></aside>
    </div>
    {selected&&<div className="drawer-backdrop" onClick={()=>setSelected(null)}><aside className="student-drawer" onClick={(e)=>e.stopPropagation()}><button className="drawer-close" onClick={()=>setSelected(null)}>×</button><div className="drawer-avatar">{selected.full_name.slice(0,2).toUpperCase()}</div><p className="eyebrow">QUICK VIEW</p><h2>{selected.full_name}</h2><p className="muted">{selected.classes?.name}</p><div className="detail-grid"><Detail label="Expertise" value={selected.student_profiles?.expertise||"Belum diisi"}/><Detail label="Arah karier" value={selected.student_profiles?.career_direction||"Belum diisi"}/><Detail label="Proposal" value={documents[selected.id]?.latest_version?`Versi ${documents[selected.id].latest_version}`:"Belum upload"}/><Detail label="Status" value={formatStage(selected.student_profiles?.journey_stage)}/></div><Link href={`/students/${selected.id}`} className="open-profile-btn">Buka Life & Career Workspace <ChevronRight size={18}/></Link></aside></div>}
  </main>;
}

function Stat({title,value,icon}:{title:string;value:number;icon:React.ReactNode}){return <div className="stat-card"><div className="stat-icon">{icon}</div><div><span>{title}</span><strong>{value}</strong></div></div>}
function Detail({label,value}:{label:string;value:string}){return <div className="detail-item"><span>{label}</span><strong>{value}</strong></div>}
function formatStage(stage?:string|null){const labels:Record<string,string>={belum_dipetakan:'Belum dipetakan',eksplorasi:'Eksplorasi',sudah_punya_arah:'Sudah punya arah',persiapan:'Persiapan',on_track:'On track',perlu_pendampingan:'Perlu pendampingan'};return stage?labels[stage]||stage:'Belum dipetakan'}
