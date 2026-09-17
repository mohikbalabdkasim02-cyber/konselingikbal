"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpenCheck, BriefcaseBusiness, CalendarClock, ChevronRight, FolderCheck, GitCompareArrows, Search, UserRoundCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toUserMessage } from "@/lib/errors";
import { careerStageLabel, summarizeCareerStudent, type CareerMonitoringStage } from "@/lib/career-monitoring";

type Student={id:string;full_name:string;classes:{name:string;grade:number}|null};
type Choice={student_id:string;position:string;custom_name:string|null;review_date:string|null;status:string};
type SelfProfile={student_id:string};type Comparison={student_id:string};type Portfolio={student_id:string};
type MonitorRow={student:Student;choices:Choice[];selfProfile:boolean;comparisonCount:number;portfolioCount:number;stage:CareerMonitoringStage;needsAttention:boolean;activityScore:number;overdueReviewCount:number;nextReviewDate:string|null};

export default function CareerMonitoringPage(){
  const [students,setStudents]=useState<Student[]>([]);const [choices,setChoices]=useState<Choice[]>([]);const [selfProfiles,setSelfProfiles]=useState<SelfProfile[]>([]);const [comparisons,setComparisons]=useState<Comparison[]>([]);const [portfolio,setPortfolio]=useState<Portfolio[]>([]);
  const [query,setQuery]=useState("");const [stage,setStage]=useState<"all"|CareerMonitoringStage>("all");const [loading,setLoading]=useState(true);const [message,setMessage]=useState("");
  useEffect(()=>{void load()},[]);
  async function load(){setLoading(true);setMessage("");try{const [a,b,c,d,e]=await Promise.all([
    supabase.from("students").select("id,full_name,classes(name,grade)").eq("is_active",true).order("full_name"),
    supabase.from("student_career_choices").select("student_id,position,custom_name,review_date,status").eq("status","active"),
    supabase.from("career_self_profiles").select("student_id"),supabase.from("career_comparisons").select("student_id"),
    supabase.from("career_portfolio_items").select("student_id").eq("status","active")]);
    const err=a.error||b.error||c.error||d.error||e.error;if(err)throw err;setStudents((a.data??[]) as unknown as Student[]);setChoices((b.data??[]) as Choice[]);setSelfProfiles((c.data??[]) as SelfProfile[]);setComparisons((d.data??[]) as Comparison[]);setPortfolio((e.data??[]) as Portfolio[]);
  }catch(e){setMessage(toUserMessage(e))}finally{setLoading(false)}}

  const rows=useMemo<MonitorRow[]>(()=>{const selfSet=new Set(selfProfiles.map(x=>x.student_id));const comparisonCount=new Map<string,number>();comparisons.forEach(x=>comparisonCount.set(x.student_id,(comparisonCount.get(x.student_id)||0)+1));const portfolioCount=new Map<string,number>();portfolio.forEach(x=>portfolioCount.set(x.student_id,(portfolioCount.get(x.student_id)||0)+1));
    return students.map(student=>{const studentChoices=choices.filter(x=>x.student_id===student.id);const summary=summarizeCareerStudent({hasSelfProfile:selfSet.has(student.id),planCount:studentChoices.filter(x=>["A","B","C"].includes(x.position)).length,comparisonCount:comparisonCount.get(student.id)||0,portfolioCount:portfolioCount.get(student.id)||0,reviewDates:studentChoices.map(x=>x.review_date)});return{student,choices:studentChoices,selfProfile:selfSet.has(student.id),comparisonCount:comparisonCount.get(student.id)||0,portfolioCount:portfolioCount.get(student.id)||0,...summary}}).sort((a,b)=>Number(b.needsAttention)-Number(a.needsAttention)||a.student.full_name.localeCompare(b.student.full_name));
  },[students,choices,selfProfiles,comparisons,portfolio]);
  const filtered=useMemo(()=>{const q=query.trim().toLowerCase();return rows.filter(row=>(stage==="all"||row.stage===stage)&&(!q||[row.student.full_name,row.student.classes?.name,...row.choices.map(x=>x.custom_name)].some(v=>v?.toLowerCase().includes(q))))},[rows,query,stage]);
  const stats=useMemo(()=>({total:rows.length,plans:rows.filter(x=>x.choices.some(c=>["A","B","C"].includes(c.position))).length,review:rows.filter(x=>x.stage==="perlu_review").length,notStarted:rows.filter(x=>x.stage==="belum_mulai").length}),[rows]);

  return <main className="assessment-page"><section className="assessment-shell career-admin-shell">
    <div className="career-admin-top"><Link href="/counseling" className="back-link"><ArrowLeft size={17}/> BK Control Center</Link><Link href="/counseling/career-content" className="assessment-save"><BookOpenCheck size={16}/> Career Content Studio</Link></div>
    <div className="assessment-heading"><div><p className="eyebrow">BK KARIER · MONITORING</p><h1>Career Journey Monitor</h1><p>Pantau apakah siswa sudah mengenali diri, menyusun Plan A/B/C, membandingkan pilihan, mengumpulkan bukti eksplorasi, dan kapan pilihan perlu direview.</p></div></div>
    {message&&<div className="workspace-message" style={{marginLeft:0,marginRight:0}}>{message}</div>}
    <div className="assessment-inbox-metrics career-monitor-metrics"><Metric label="Siswa aktif" value={stats.total} icon={<UserRoundCheck size={18}/>}/><Metric label="Punya Plan A/B/C" value={stats.plans} icon={<BriefcaseBusiness size={18}/>}/><Metric label="Perlu review" value={stats.review} icon={<CalendarClock size={18}/>}/><Metric label="Belum mulai" value={stats.notStarted} icon={<Search size={18}/>}/></div>
    <section className="workspace-card career-monitor-card"><div className="career-monitor-toolbar"><div className="search-box"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari siswa, kelas, atau pilihan karier..."/></div><select value={stage} onChange={e=>setStage(e.target.value as "all"|CareerMonitoringStage)}><option value="all">Semua tahap</option><option value="belum_mulai">Belum mulai</option><option value="eksplorasi">Eksplorasi</option><option value="punya_rencana">Punya rencana</option><option value="perlu_review">Perlu review</option></select></div>
      <div className="career-monitor-table"><div className="career-monitor-head"><span>Siswa</span><span>Plan A / B / C</span><span>Aktivitas</span><span>Review</span><span>Status</span><span/></div>{loading?<p className="muted">Memuat monitoring karier...</p>:filtered.map(row=><div className="career-monitor-row" key={row.student.id}><div><strong>{row.student.full_name}</strong><small>{row.student.classes?.name||"Kelas belum tersedia"}</small></div><div className="career-plan-mini">{["A","B","C"].map(pos=>{const item=row.choices.find(x=>x.position===pos);return <span key={pos}><b>{pos}</b>{item?.custom_name||"—"}</span>})}</div><div className="career-activity-mini"><span title="Kenali Diri"><UserRoundCheck size={14}/>{row.selfProfile?"1":"0"}</span><span title="Perbandingan"><GitCompareArrows size={14}/>{row.comparisonCount}</span><span title="Portofolio"><FolderCheck size={14}/>{row.portfolioCount}</span></div><div><strong>{row.overdueReviewCount>0?`${row.overdueReviewCount} lewat jadwal`:row.nextReviewDate?formatDate(row.nextReviewDate):"Belum dijadwalkan"}</strong><small>{row.nextReviewDate&&row.overdueReviewCount===0?"Review berikutnya":""}</small></div><span className={`career-stage-badge ${row.stage}`}>{careerStageLabel(row.stage)}</span><Link href={`/students/${row.student.id}`} className="career-monitor-open" title="Buka Student 360"><ChevronRight size={18}/></Link></div>)}{!loading&&filtered.length===0&&<div className="empty-state">Tidak ada siswa yang cocok dengan filter.</div>}</div>
    </section>
    <p className="career-monitor-note">Status di halaman ini adalah indikator kebutuhan tindak lanjut karier, bukan peringkat siswa dan bukan penilaian kemampuan.</p>
  </section></main>
}

function Metric({label,value,icon}:{label:string;value:number;icon:React.ReactNode}){return <div className="assessment-inbox-metric"><span>{label}</span><strong>{value}</strong><div className="career-metric-icon">{icon}</div></div>}
function formatDate(value:string){return new Intl.DateTimeFormat("id-ID",{day:"numeric",month:"short",year:"numeric"}).format(new Date(`${value}T00:00:00`))}
