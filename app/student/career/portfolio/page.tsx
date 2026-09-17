"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Archive, ArrowLeft, ExternalLink, FolderCheck, Plus, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toUserMessage } from "@/lib/errors";
import { portfolioItemIsMeaningful, toPortfolioPayload, type CareerPortfolioDraft } from "@/lib/career-planning";

type PortfolioItem={id:string;title:string;category:string;evidence_url:string|null;reflection:string|null;occurred_at:string|null;created_at:string};
const EMPTY:CareerPortfolioDraft={title:"",category:"project",evidence_url:"",reflection:"",occurred_at:""};
const CATEGORIES=[
  ["project","Proyek"],["achievement","Prestasi"],["organization","Organisasi"],["volunteering","Volunteering"],["course","Kursus / Pelatihan"],["competition","Kompetisi"],["shadowing","Job Shadowing / Wawancara"],["certificate","Sertifikat"],["other","Lainnya"],
] as const;

export default function CareerPortfolioPage(){
  const [studentId,setStudentId]=useState("");
  const [items,setItems]=useState<PortfolioItem[]>([]);
  const [draft,setDraft]=useState<CareerPortfolioDraft>(EMPTY);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState("");
  useEffect(()=>{void load()},[]);
  async function load(){setLoading(true);setMessage("");try{const {data:{session}}=await supabase.auth.getSession();if(!session)throw new Error("Silakan masuk terlebih dahulu.");const link=await supabase.from("student_auth_links").select("student_id").eq("auth_user_id",session.user.id).single();if(link.error)throw link.error;setStudentId(link.data.student_id);const result=await supabase.from("career_portfolio_items").select("id,title,category,evidence_url,reflection,occurred_at,created_at").eq("student_id",link.data.student_id).eq("status","active").order("occurred_at",{ascending:false,nullsFirst:false}).order("created_at",{ascending:false});if(result.error)throw result.error;setItems((result.data??[]) as PortfolioItem[]);}catch(error){setMessage(toUserMessage(error));}finally{setLoading(false)}}
  async function addItem(){if(!studentId)return;if(!portfolioItemIsMeaningful(draft)){setMessage("Judul bukti eksplorasi perlu diisi.");return;}if(draft.evidence_url?.trim()&&!/^https?:\/\//i.test(draft.evidence_url.trim())){setMessage("Link bukti harus dimulai dengan http:// atau https://");return;}setSaving(true);setMessage("");try{const {error}=await supabase.from("career_portfolio_items").insert(toPortfolioPayload(studentId,draft));if(error)throw error;setDraft(EMPTY);setMessage("Bukti eksplorasi berhasil ditambahkan.");await load();}catch(error){setMessage(toUserMessage(error));}finally{setSaving(false)}}
  async function archiveItem(id:string){try{const {error}=await supabase.from("career_portfolio_items").update({status:"archived",updated_at:new Date().toISOString()}).eq("id",id);if(error)throw error;setItems(list=>list.filter(item=>item.id!==id));setMessage("Bukti dipindahkan ke arsip.");}catch(error){setMessage(toUserMessage(error));}}
  if(loading)return <main className="center-screen"><div className="loader"/></main>;
  return <main className="assessment-page"><section className="assessment-shell career-student-shell"><Link href="/student/career" className="back-link"><ArrowLeft size={17}/> Perjalanan Karier</Link><div className="assessment-title" style={{marginTop:22}}><p className="eyebrow">BUKTI EKSPLORASI</p><h1>Portofolio Karier Saya</h1><p>Simpan proyek, prestasi, organisasi, kursus, kompetisi, volunteering, job shadowing, dan bukti lain yang membantu Anda menguji minat serta kemampuan.</p></div>{message&&<div className="workspace-message" style={{marginLeft:0,marginRight:0}}>{message}</div>}
    <section className="assessment-section-card"><div className="assessment-section-head"><span><Plus size={18}/></span><div><h2>Tambah Bukti Eksplorasi</h2><p>Yang penting bukan banyaknya bukti, tetapi apa yang Anda pelajari dari pengalaman tersebut.</p></div></div><div className="career-portfolio-form"><label><span>Judul pengalaman / bukti *</span><input value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} placeholder="Contoh: Proyek robotik sekolah"/></label><label><span>Kategori</span><select value={draft.category} onChange={e=>setDraft({...draft,category:e.target.value})}>{CATEGORIES.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label><span>Tanggal kegiatan</span><input type="date" value={draft.occurred_at??""} onChange={e=>setDraft({...draft,occurred_at:e.target.value})}/></label><label><span>Link bukti (opsional)</span><input type="url" value={draft.evidence_url??""} onChange={e=>setDraft({...draft,evidence_url:e.target.value})} placeholder="https://..."/></label><label className="portfolio-reflection"><span>Refleksi saya</span><textarea rows={4} value={draft.reflection??""} onChange={e=>setDraft({...draft,reflection:e.target.value})} placeholder="Apa yang saya lakukan, pelajari, sukai, dan ingin saya tingkatkan?"/></label></div><div className="assessment-actions"><button className="assessment-primary" onClick={addItem} disabled={saving}><Save size={16}/>{saving?"Menyimpan...":"Simpan Bukti"}</button></div></section>
    <section className="assessment-section-card"><div className="assessment-section-head"><span><FolderCheck size={18}/></span><div><h2>Jejak Eksplorasi Saya</h2><p>{items.length} bukti aktif. Gunakan refleksi ini saat menyusun Plan A/B/C dan berdiskusi dengan Guru BK.</p></div></div>{items.length?<div className="career-portfolio-grid">{items.map(item=><article className="career-portfolio-item" key={item.id}><div className="portfolio-meta"><span>{labelCategory(item.category)}</span>{item.occurred_at&&<time>{new Intl.DateTimeFormat("id-ID",{day:"numeric",month:"short",year:"numeric"}).format(new Date(item.occurred_at))}</time>}</div><h3>{item.title}</h3><p>{item.reflection||"Belum ada refleksi pada bukti ini."}</p><div className="portfolio-actions">{safeUrl(item.evidence_url)&&<a href={item.evidence_url!} target="_blank" rel="noreferrer"><ExternalLink size={15}/> Lihat bukti</a>}<button type="button" onClick={()=>archiveItem(item.id)}><Archive size={15}/> Arsipkan</button></div></article>)}</div>:<div className="empty-state">Belum ada bukti eksplorasi. Mulai dari pengalaman kecil yang benar-benar pernah Anda lakukan.</div>}</section>
  </section></main>;
}
function safeUrl(value:string|null){return Boolean(value&&/^https?:\/\//i.test(value))}
function labelCategory(value:string){return CATEGORIES.find(([key])=>key===value)?.[1]??"Lainnya"}
