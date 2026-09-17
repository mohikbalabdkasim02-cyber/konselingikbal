"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BriefcaseBusiness, ChevronRight, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toUserMessage } from "@/lib/errors";

type Career={id:string;slug:string;name:string;category:string|null;summary:string|null;last_reviewed_at:string|null};

export default function CareerExplorerPage(){
  const [items,setItems]=useState<Career[]>([]);const [query,setQuery]=useState("");const [category,setCategory]=useState("all");const [loading,setLoading]=useState(true);const [message,setMessage]=useState("");
  useEffect(()=>{void load()},[]);
  async function load(){setLoading(true);try{const {data,error}=await supabase.from("career_profiles").select("id,slug,name,category,summary,last_reviewed_at").eq("is_published",true).order("name");if(error)throw error;setItems((data??[]) as Career[]);}catch(e){setMessage(toUserMessage(e));}finally{setLoading(false)}}
  const categories=useMemo(()=>[...new Set(items.map(x=>x.category).filter(Boolean) as string[])].sort(),[items]);
  const filtered=useMemo(()=>{const q=query.trim().toLowerCase();return items.filter(x=>(category==="all"||x.category===category)&&(!q||[x.name,x.category,x.summary].some(v=>v?.toLowerCase().includes(q))))},[items,query,category]);
  return <main className="assessment-page"><section className="assessment-shell career-student-shell"><Link href="/student/career" className="back-link"><ArrowLeft size={17}/> Perjalanan Karier</Link><div className="assessment-title" style={{marginTop:22}}><p className="eyebrow">CAREER 360°</p><h1>Eksplorasi Karier</h1><p>Pelajari karier dari aktivitas nyata, manfaat, kompetensi, jalur pendidikan, tantangan, risiko, prospek, dan alternatif—bukan hanya dari nama profesi.</p></div>{message&&<div className="workspace-message" style={{marginLeft:0,marginRight:0}}>{message}</div>}<div className="career-explorer-tools"><div className="search-box"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari profesi atau bidang..."/></div><select value={category} onChange={e=>setCategory(e.target.value)}><option value="all">Semua bidang</option>{categories.map(x=><option key={x} value={x}>{x}</option>)}</select></div>{loading?<div className="center-screen" style={{minHeight:220}}><div className="loader"/></div>:filtered.length?<div className="career-explorer-grid">{filtered.map(c=><Link href={`/student/career/explore/${c.slug}`} key={c.id} className="career-profile-card"><div className="career-profile-icon"><BriefcaseBusiness size={20}/></div><div><span>{c.category||"Bidang karier"}</span><h2>{c.name}</h2><p>{c.summary||"Buka profil untuk melihat Career 360°."}</p><small>{c.last_reviewed_at?`Ditinjau ${new Intl.DateTimeFormat("id-ID",{month:"short",year:"numeric"}).format(new Date(c.last_reviewed_at))}`:"Konten sedang dikurasi"}</small></div><ChevronRight size={18}/></Link>)}</div>:<div className="assessment-section-card"><div className="viewer-empty"><BriefcaseBusiness size={40}/><strong>Perpustakaan Career 360° sedang dikurasi</strong><p>Struktur Career Explorer sudah aktif. Profil profesi hanya akan tampil setelah kontennya direview dan dipublikasikan oleh Guru BK/admin agar siswa tidak menerima informasi profesi yang belum terverifikasi.</p></div></div>}</section></main>
}
