"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpenCheck, CheckCircle2, FilePenLine, Plus, Search, Send, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toUserMessage } from "@/lib/errors";
import { buildCareerProfilePayload, careerProfilePublicationReady, type CareerProfileDraft } from "@/lib/career-content";

type CareerProfile = {
  id:string; slug:string; name:string; category:string|null; aliases:string[]|null; summary:string|null; activities:string|null;
  contribution:string|null; good_values:string|null; supporting_profile:string|null; competencies:string|null; education_path:string|null;
  challenges:string|null; difficulty_factors:string|null; risk_mitigation:string|null; prospects:string|null; alternatives:string|null;
  start_now:string|null; reflection_questions:unknown; sources:unknown; last_reviewed_at:string|null; content_owner:string|null; is_published:boolean;
};

const EMPTY: CareerProfileDraft = {name:"",slug:"",category:"",aliasesText:"",summary:"",activities:"",contribution:"",good_values:"",supporting_profile:"",competencies:"",education_path:"",challenges:"",difficulty_factors:"",risk_mitigation:"",prospects:"",alternatives:"",start_now:"",reflectionQuestionsText:"",sourcesText:"",content_owner:"Tim BK Bina Insan"};
const textLines=(value:unknown)=>Array.isArray(value)?value.filter((item):item is string=>typeof item==="string").join("\n"):"";

export default function CareerContentStudio(){
  const [profiles,setProfiles]=useState<CareerProfile[]>([]);const [selected,setSelected]=useState<CareerProfile|null>(null);const [draft,setDraft]=useState<CareerProfileDraft>({...EMPTY});
  const [query,setQuery]=useState("");const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);const [message,setMessage]=useState("");
  useEffect(()=>{void loadProfiles()},[]);

  async function loadProfiles(selectId?:string){setLoading(true);try{const {data,error}=await supabase.from("career_profiles").select("*").order("name");if(error)throw error;const rows=(data??[]) as CareerProfile[];setProfiles(rows);if(selectId){const found=rows.find(p=>p.id===selectId);if(found)selectProfile(found)}}catch(e){setMessage(toUserMessage(e))}finally{setLoading(false)}}
  function selectProfile(profile:CareerProfile){setSelected(profile);setDraft({name:profile.name,slug:profile.slug,category:profile.category??"",aliasesText:(profile.aliases??[]).join("\n"),summary:profile.summary??"",activities:profile.activities??"",contribution:profile.contribution??"",good_values:profile.good_values??"",supporting_profile:profile.supporting_profile??"",competencies:profile.competencies??"",education_path:profile.education_path??"",challenges:profile.challenges??"",difficulty_factors:profile.difficulty_factors??"",risk_mitigation:profile.risk_mitigation??"",prospects:profile.prospects??"",alternatives:profile.alternatives??"",start_now:profile.start_now??"",reflectionQuestionsText:textLines(profile.reflection_questions),sourcesText:textLines(profile.sources),content_owner:profile.content_owner??""});setMessage("")}
  function newProfile(){setSelected(null);setDraft({...EMPTY});setMessage("")}
  function patch<K extends keyof CareerProfileDraft>(key:K,value:CareerProfileDraft[K]){setDraft(prev=>({...prev,[key]:value}))}

  async function saveProfile(nextPublished?:boolean){
    const payload=buildCareerProfilePayload(draft);if(!payload.name)return setMessage("Nama profesi wajib diisi.");
    const publish=nextPublished??selected?.is_published??false;if(publish&&!careerProfilePublicationReady(payload))return setMessage("Belum dapat dipublikasikan. Lengkapi ringkasan, aktivitas, kompetensi, jalur pendidikan, tantangan, dan langkah mulai sekarang.");
    setSaving(true);setMessage("");try{const dbPayload={...payload,is_published:publish,last_reviewed_at:publish?new Date().toISOString():(selected?.last_reviewed_at??null),updated_at:new Date().toISOString()};
      if(selected){const {error}=await supabase.from("career_profiles").update(dbPayload).eq("id",selected.id);if(error)throw error;setMessage(publish?"Career 360 berhasil disimpan dan dipublikasikan.":"Perubahan Career 360 berhasil disimpan.");await loadProfiles(selected.id)}
      else{const {data,error}=await supabase.from("career_profiles").insert(dbPayload).select("id").single();if(error)throw error;setMessage(publish?"Career 360 baru berhasil dipublikasikan.":"Draft Career 360 berhasil dibuat.");await loadProfiles(data.id)}
    }catch(e){setMessage(toUserMessage(e))}finally{setSaving(false)}
  }

  const filtered=useMemo(()=>{const q=query.trim().toLowerCase();return profiles.filter(p=>!q||[p.name,p.category,p.slug].some(v=>v?.toLowerCase().includes(q)))},[profiles,query]);
  const ready=careerProfilePublicationReady(buildCareerProfilePayload(draft));

  return <main className="assessment-page"><section className="assessment-shell career-admin-shell">
    <div className="career-admin-top"><Link href="/counseling" className="back-link"><ArrowLeft size={17}/> BK Control Center</Link><Link href="/counseling/career-monitoring" className="assessment-save"><ShieldCheck size={16}/> Monitoring Karier</Link></div>
    <div className="assessment-heading"><div><p className="eyebrow">BK KARIER · GURU BK</p><h1>Career Content Studio</h1><p>Kelola Career 360° yang dibaca siswa. Konten dapat disimpan sebagai draft, direview, lalu dipublikasikan tanpa mengubah Proposal Hidup atau LifeMap lama.</p></div><button className="assessment-primary" onClick={newProfile}><Plus size={17}/> Profil baru</button></div>
    {message&&<div className="workspace-message" style={{marginLeft:0,marginRight:0}}>{message}</div>}
    <div className="career-admin-layout">
      <aside className="workspace-card career-admin-list"><div className="card-title"><BookOpenCheck size={18}/><div><p className="eyebrow">LIBRARY</p><h2>Career 360°</h2></div></div><div className="search-box"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari profesi..."/></div><div className="career-admin-list-items">{loading?<p className="muted">Memuat...</p>:filtered.map(profile=><button key={profile.id} className={selected?.id===profile.id?"career-admin-list-item active":"career-admin-list-item"} onClick={()=>selectProfile(profile)}><span><strong>{profile.name}</strong><small>{profile.category||"Tanpa kategori"}</small></span><em className={profile.is_published?"published":"draft"}>{profile.is_published?"Published":"Draft"}</em></button>)}{!loading&&filtered.length===0&&<p className="muted">Belum ada profil karier.</p>}</div></aside>
      <section className="workspace-card career-editor"><div className="career-editor-head"><div><p className="eyebrow">{selected?"EDIT PROFILE":"NEW PROFILE"}</p><h2>{draft.name||"Career 360° baru"}</h2></div><div className="career-editor-status"><span className={ready?"ready":"incomplete"}>{ready?<><CheckCircle2 size={14}/> Siap publish</>:<>Belum lengkap</>}</span>{selected&&<span className={selected.is_published?"published":"draft"}>{selected.is_published?"Published":"Draft"}</span>}</div></div>
        <div className="career-editor-grid"><Field label="Nama profesi" value={draft.name} onChange={v=>patch("name",v)}/><Field label="Slug" value={draft.slug??""} onChange={v=>patch("slug",v)} placeholder="Otomatis dari nama jika kosong"/><Field label="Kategori" value={draft.category??""} onChange={v=>patch("category",v)}/><Field label="Content owner" value={draft.content_owner??""} onChange={v=>patch("content_owner",v)}/><Area label="Alias / nama lain · satu per baris" value={draft.aliasesText??""} onChange={v=>patch("aliasesText",v)} span/><Area label="Ringkasan profesi" value={draft.summary??""} onChange={v=>patch("summary",v)} span/><Area label="Aktivitas & realitas kerja" value={draft.activities??""} onChange={v=>patch("activities",v)}/><Area label="Kontribusi & manfaat" value={draft.contribution??""} onChange={v=>patch("contribution",v)}/><Area label="Nilai kebaikan / integritas" value={draft.good_values??""} onChange={v=>patch("good_values",v)}/><Area label="Profil yang mendukung" value={draft.supporting_profile??""} onChange={v=>patch("supporting_profile",v)}/><Area label="Kompetensi yang dibutuhkan" value={draft.competencies??""} onChange={v=>patch("competencies",v)}/><Area label="Jalur pendidikan" value={draft.education_path??""} onChange={v=>patch("education_path",v)}/><Area label="Tantangan & pengorbanan" value={draft.challenges??""} onChange={v=>patch("challenges",v)}/><Area label="Mengapa seseorang bisa kesulitan?" value={draft.difficulty_factors??""} onChange={v=>patch("difficulty_factors",v)}/><Area label="Cara mengurangi risiko" value={draft.risk_mitigation??""} onChange={v=>patch("risk_mitigation",v)}/><Area label="Prospek & perkembangan" value={draft.prospects??""} onChange={v=>patch("prospects",v)}/><Area label="Alternatif karier" value={draft.alternatives??""} onChange={v=>patch("alternatives",v)}/><Area label="Mulai dari sekarang" value={draft.start_now??""} onChange={v=>patch("start_now",v)}/><Area label="Pertanyaan refleksi · satu per baris" value={draft.reflectionQuestionsText??""} onChange={v=>patch("reflectionQuestionsText",v)} span/><Area label="Sumber / URL resmi · satu per baris" value={draft.sourcesText??""} onChange={v=>patch("sourcesText",v)} span/></div>
        <div className="career-editor-actions"><button className="assessment-save" disabled={saving} onClick={()=>saveProfile()}><FilePenLine size={16}/>{saving?"Menyimpan...":"Simpan"}</button>{selected?.is_published&&<button className="assessment-save" disabled={saving} onClick={()=>saveProfile(false)}>Jadikan draft</button>}<button className="assessment-primary" disabled={saving||!ready} onClick={()=>saveProfile(true)}><Send size={16}/>{selected?.is_published?"Simpan & review ulang":"Publish"}</button></div>
      </section>
    </div>
  </section></main>
}

function Field({label,value,onChange,placeholder}:{label:string;value:string;onChange:(v:string)=>void;placeholder?:string}){return <label className="career-admin-field"><span>{label}</span><input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/></label>}
function Area({label,value,onChange,span=false}:{label:string;value:string;onChange:(v:string)=>void;span?:boolean}){return <label className={span?"career-admin-field span":"career-admin-field"}><span>{label}</span><textarea rows={4} value={value} onChange={e=>onChange(e.target.value)}/></label>}
