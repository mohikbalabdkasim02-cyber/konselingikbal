"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, CheckCircle2, Download, FileSearch, FileText, Flag, GraduationCap, Loader2, Map, RefreshCw, Save, Sparkles, Target, Upload, UserRound } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { parseProposalText, type ProposalExtraction } from "@/lib/proposal-parser";
import { DOCX_MIME, safeStorageFileName, uploadStorageWithRetry, validateProposalFile, type UploadPhase } from "@/lib/upload";
import { toUserMessage } from "@/lib/errors";
import { NetworkState } from "@/components/common/NetworkState";

 type Student = { id:string; full_name:string; gender:"L"|"P"|null; email:string|null; nis:string|null; nisn:string|null; classes:{name:string;slug:string;grade:number}|null };
 type Profile = { student_id:string; expertise:string|null; career_direction:string|null; education_target:string|null; journey_stage:string; role_model:string|null; personal_brand:string|null; major_target:string|null; campus_target:string|null; mentor:string|null; summary_notes:string|null };
 type StudentDocument = { id:string; status:string; latest_version:number };
 type DocumentVersion = { id:string; version_number:number; storage_path:string; file_name:string; mime_type:string; file_size:number; uploaded_at:string; notes:string|null; extraction_status?:string; extracted_at?:string|null; extracted_data?:ProposalExtraction|Record<string,unknown>|null; extraction_notes?:string|null };
 type LifeAspect = { id?:string; category:string; content:string; status:string; sort_order:number };
 type Milestone = { id:string; title:string; description:string|null; target_date:string|null; status:string; sort_order:number };
 type RoadmapItem = { id:string; title:string; description:string|null; mentor:string|null; target_date:string|null; status:string; sort_order:number };

const LIFE_CATEGORIES = [
  ["spiritual","Spiritual & Tazkiyatunnafs"],["islamic_studies","Islamic Studies"],["ibadah","Ibadah"],["leadership","Leadership & Citizenship"],
  ["health","Health"],["knowledge","Knowledge & Science"],["social","Social & Environment"],["entrepreneurship","Entrepreneurship"],
  ["career","Career / Work"],["education","Education"],["finance","Finance"],["transport","Transport"],["family","Family & Friends"],["leisure","Leisure / Care / Respite"],["personal","Personal Life"],
] as const;

const EMPTY_PROFILE: Omit<Profile,"student_id"> = { expertise:"",career_direction:"",education_target:"",journey_stage:"belum_dipetakan",role_model:"",personal_brand:"",major_target:"",campus_target:"",mentor:"",summary_notes:"" };

function asText(value: unknown){ return typeof value === "string" ? value : ""; }
function safeArray<T>(value: unknown): T[]{ return Array.isArray(value) ? value as T[] : []; }
function normalizeExtraction(value: unknown): ProposalExtraction | null {
  if(!value || typeof value !== "object") return null;
  const raw=value as Partial<ProposalExtraction>;
  return {
    profile: raw.profile && typeof raw.profile === "object" ? raw.profile : {},
    lifeAspects: safeArray(raw.lifeAspects).filter((x):x is ProposalExtraction["lifeAspects"][number]=>Boolean(x&&typeof x==="object")),
    milestones: safeArray<string>(raw.milestones).filter(x=>typeof x==="string"),
    roadmap: safeArray<string>(raw.roadmap).filter(x=>typeof x==="string"),
    found: safeArray<string>(raw.found).filter(x=>typeof x==="string"),
    needsReview: safeArray<string>(raw.needsReview).filter(x=>typeof x==="string"),
    textLength: typeof raw.textLength === "number" ? raw.textLength : 0,
  };
}

export default function StudentWorkspacePage(){
  const {id:studentId}=useParams<{id:string}>(); const router=useRouter();
  const [student,setStudent]=useState<Student|null>(null); const [profile,setProfile]=useState<Profile|null>(null); const [doc,setDoc]=useState<StudentDocument|null>(null);
  const [versions,setVersions]=useState<DocumentVersion[]>([]); const [lifeAspects,setLifeAspects]=useState<LifeAspect[]>([]); const [milestones,setMilestones]=useState<Milestone[]>([]); const [roadmap,setRoadmap]=useState<RoadmapItem[]>([]);
  const [activeTab,setActiveTab]=useState("overview"); const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false); const [uploading,setUploading]=useState(false); const [analyzing,setAnalyzing]=useState(false);
  const [message,setMessage]=useState(""); const [previewUrl,setPreviewUrl]=useState<string|null>(null); const [docxText,setDocxText]=useState<string|null>(null); const [newMilestone,setNewMilestone]=useState(""); const [newRoadmap,setNewRoadmap]=useState("");
  const [uploadPhase,setUploadPhase]=useState<UploadPhase>("idle"); const [uploadDetail,setUploadDetail]=useState(""); const [retryFile,setRetryFile]=useState<File|null>(null);

  useEffect(()=>{ supabase.auth.getSession().then(({data})=>{if(!data.session)router.replace("/");else void loadWorkspace();}); },[studentId]);

  function normalizeLife(rows:LifeAspect[]){const map=new globalThis.Map(rows.map(r=>[r.category,r]));return LIFE_CATEGORIES.map(([category],i)=>{const found=map.get(category);return found?{...found,content:asText(found.content)}:{category,content:"",status:"empty",sort_order:i}})}

  async function loadWorkspace(){
    setLoading(true);
    try{
      const [s,p,d,l,m,r]=await Promise.all([
        supabase.from("students").select("id,full_name,gender,email,nis,nisn,classes(name,slug,grade)").eq("id",studentId).single(),
        supabase.from("student_profiles").select("*").eq("student_id",studentId).maybeSingle(),
        supabase.from("student_documents").select("id,status,latest_version").eq("student_id",studentId).eq("document_type","proposal_hidup").maybeSingle(),
        supabase.from("life_aspects").select("id,category,content,status,sort_order").eq("student_id",studentId).order("sort_order"),
        supabase.from("milestones").select("id,title,description,target_date,status,sort_order").eq("student_id",studentId).order("sort_order"),
        supabase.from("roadmap_items").select("id,title,description,mentor,target_date,status,sort_order").eq("student_id",studentId).order("sort_order"),
      ]);
      if(s.error)throw s.error;
      setStudent(s.data as unknown as Student); setProfile((p.data as Profile|null)??({student_id:studentId,...EMPTY_PROFILE} as Profile)); setDoc(d.data as StudentDocument|null);
      setLifeAspects(normalizeLife((l.data??[]) as LifeAspect[])); setMilestones((m.data??[]) as Milestone[]); setRoadmap((r.data??[]) as RoadmapItem[]);
      if(d.data?.id)await loadVersions(d.data.id);else setVersions([]);
    }catch(error){setMessage(toUserMessage(error));}finally{setLoading(false);}
  }

  async function loadVersions(documentId:string){const {data,error}=await supabase.from("document_versions").select("id,version_number,storage_path,file_name,mime_type,file_size,uploaded_at,notes,extraction_status,extracted_at,extracted_data,extraction_notes").eq("document_id",documentId).order("version_number",{ascending:false});if(error)throw error;setVersions((data??[]) as DocumentVersion[])}

  async function saveProfile(){if(!profile)return;setSaving(true);try{const {error}=await supabase.from("student_profiles").upsert({...profile,student_id:studentId},{onConflict:"student_id"});if(error)throw error;setMessage("Profil Life & Career berhasil disimpan.");}catch(e){setMessage(toUserMessage(e));}finally{setSaving(false)}}
  async function saveLifeMap(){setSaving(true);try{const rows=lifeAspects.map((x,i)=>({student_id:studentId,category:x.category,content:asText(x.content).trim()||null,status:asText(x.content).trim()?"filled":"empty",sort_order:i}));const {error}=await supabase.from("life_aspects").upsert(rows,{onConflict:"student_id,category"});if(error)throw error;setMessage("Life Map berhasil diperbarui.");await loadWorkspace();}catch(e){setMessage(toUserMessage(e));}finally{setSaving(false)}}

  async function uploadFile(file:File){
    setUploading(true);setRetryFile(file);setMessage("");setUploadPhase("validating");setUploadDetail(file.name);
    let storagePath=""; let createdVersionId:string|undefined;
    try{
      const {mimeType}=validateProposalFile(file);
      let currentDoc=doc;
      if(!currentDoc){const res=await supabase.from("student_documents").insert({student_id:studentId,document_type:"proposal_hidup",status:"uploaded",latest_version:0}).select("id,status,latest_version").single();if(res.error)throw res.error;currentDoc=res.data as StudentDocument;setDoc(currentDoc)}
      const nextVersion=(currentDoc.latest_version||0)+1;
      storagePath=`${studentId}/proposal_hidup/v${nextVersion}-${Date.now()}-${safeStorageFileName(file.name)}`;
      setUploadPhase("uploading");setUploadDetail("File dikirim dengan retry otomatis jika koneksi terputus.");
      await uploadStorageWithRetry({supabase,bucket:"student-proposals",path:storagePath,file,mimeType,attempts:3});
      setUploadPhase("recording");setUploadDetail("Mencatat versi proposal ke profil siswa.");
      const {data:userData}=await supabase.auth.getUser();
      const v=await supabase.from("document_versions").insert({document_id:currentDoc.id,version_number:nextVersion,storage_path:storagePath,file_name:file.name,mime_type:mimeType,file_size:file.size,uploaded_by:userData.user?.id??null,extraction_status:mimeType===DOCX_MIME?"pending":"unsupported"}).select("id,version_number,storage_path,file_name,mime_type,file_size,uploaded_at,notes,extraction_status,extracted_at,extracted_data,extraction_notes").single();
      if(v.error)throw v.error; createdVersionId=v.data.id;
      const upd=await supabase.from("student_documents").update({latest_version:nextVersion,status:"uploaded"}).eq("id",currentDoc.id);if(upd.error)throw upd.error;
      setUploadPhase("complete");setUploadDetail(`Versi ${nextVersion} tersimpan.`);setRetryFile(null);
      if(mimeType===DOCX_MIME){setMessage(`Proposal versi ${nextVersion} berhasil diunggah. Sedang membaca isinya…`);await analyzeVersion(v.data as DocumentVersion,true)}else{setMessage(`Proposal versi ${nextVersion} berhasil diunggah. PDF/DOC tersimpan dan bisa dilihat. Pembacaan otomatis saat ini digunakan untuk DOCX.`);await loadWorkspace()}
      setActiveTab("overview");
    }catch(error){
      if(createdVersionId)await supabase.from("document_versions").delete().eq("id",createdVersionId);
      if(storagePath)await supabase.storage.from("student-proposals").remove([storagePath]);
      setUploadPhase("error");setUploadDetail(toUserMessage(error));setMessage(toUserMessage(error));
    }finally{setUploading(false)}
  }
  async function uploadProposal(event:ChangeEvent<HTMLInputElement>){const file=event.target.files?.[0];event.target.value="";if(file)await uploadFile(file)}

  function mergeProfile(extracted:ProposalExtraction){const base=profile??({student_id:studentId,...EMPTY_PROFILE} as Profile);const p=extracted.profile??{};return {...base,expertise:base.expertise?.trim()||p.expertise||"",career_direction:base.career_direction?.trim()||p.career_direction||"",education_target:base.education_target?.trim()||p.education_target||"",role_model:base.role_model?.trim()||p.role_model||"",personal_brand:base.personal_brand?.trim()||p.personal_brand||"",major_target:base.major_target?.trim()||p.major_target||"",campus_target:base.campus_target?.trim()||p.campus_target||"",mentor:base.mentor?.trim()||p.mentor||"",summary_notes:p.summary_notes||base.summary_notes||"",journey_stage:base.journey_stage==="belum_dipetakan"&&(p.career_direction||p.expertise)?"eksplorasi":base.journey_stage}}

  async function applyExtraction(extracted:ProposalExtraction){
    const profileRes=await supabase.from("student_profiles").upsert(mergeProfile(extracted),{onConflict:"student_id"});if(profileRes.error)throw profileRes.error;
    const currentLife=new globalThis.Map(lifeAspects.map(x=>[x.category,x]));
    const rows=safeArray<ProposalExtraction["lifeAspects"][number]>(extracted.lifeAspects).map(item=>{const existing=currentLife.get(item.category);const content=asText(existing?.content).trim()||asText(item.content).trim();const idx=LIFE_CATEGORIES.findIndex(([k])=>k===item.category);return{student_id:studentId,category:item.category,content,status:content?"filled":"empty",sort_order:idx>=0?idx:LIFE_CATEGORIES.length}}).filter(x=>x.content);
    if(rows.length){const res=await supabase.from("life_aspects").upsert(rows,{onConflict:"student_id,category"});if(res.error)throw res.error}
    if(milestones.length===0&&extracted.milestones.length){const res=await supabase.from("milestones").insert(extracted.milestones.map((title,i)=>({student_id:studentId,title,sort_order:i})));if(res.error)throw res.error}
    if(roadmap.length===0&&extracted.roadmap.length){const res=await supabase.from("roadmap_items").insert(extracted.roadmap.map((title,i)=>({student_id:studentId,title,sort_order:i})));if(res.error)throw res.error}
  }

  async function analyzeVersion(version:DocumentVersion,automatic=false){
    if(version.mime_type!==DOCX_MIME){setMessage("Smart Proposal Reader saat ini membaca DOCX. PDF dan DOC tetap bisa disimpan/ditampilkan.");return}
    setAnalyzing(true);setMessage(automatic?"Membaca isi proposal dan memetakan jawaban…":"Menganalisis proposal…");
    await supabase.from("document_versions").update({extraction_status:"processing",extraction_notes:null}).eq("id",version.id);
    try{const dl=await supabase.storage.from("student-proposals").download(version.storage_path);if(dl.error||!dl.data)throw dl.error??new Error("Dokumen tidak dapat diunduh.");const mammoth=await import("mammoth");const raw=await mammoth.extractRawText({arrayBuffer:await dl.data.arrayBuffer()});const extracted=normalizeExtraction(parseProposalText(raw.value));if(!extracted)throw new Error("Isi proposal belum dapat dipetakan.");await applyExtraction(extracted);const status=extracted.needsReview.length?"needs_review":"completed";const saved=await supabase.from("document_versions").update({extraction_status:status,extracted_at:new Date().toISOString(),extracted_data:extracted,extraction_notes:extracted.needsReview.join(" | ")||"Semua bagian utama terdeteksi."}).eq("id",version.id);if(saved.error)throw saved.error;setMessage(`Proposal berhasil dibaca: ${extracted.found.length} kelompok data ditemukan${extracted.needsReview.length?`, ${extracted.needsReview.length} bagian perlu dicek.`:"."}`);await loadWorkspace();}catch(error){await supabase.from("document_versions").update({extraction_status:"failed",extraction_notes:toUserMessage(error)}).eq("id",version.id);setMessage(`Pembacaan proposal gagal: ${toUserMessage(error)}`);}finally{setAnalyzing(false)}
  }

  async function openVersion(version:DocumentVersion){setMessage("");setDocxText(null);setPreviewUrl(null);try{if(version.mime_type===DOCX_MIME){const dl=await supabase.storage.from("student-proposals").download(version.storage_path);if(dl.error||!dl.data)throw dl.error??new Error("Dokumen tidak dapat dibuka.");const mammoth=await import("mammoth");const raw=await mammoth.extractRawText({arrayBuffer:await dl.data.arrayBuffer()});setDocxText(raw.value);return}const signed=await supabase.storage.from("student-proposals").createSignedUrl(version.storage_path,3600);if(signed.error)throw signed.error;setPreviewUrl(signed.data.signedUrl);}catch(e){setMessage(toUserMessage(e))}}
  async function downloadVersion(version:DocumentVersion){try{const dl=await supabase.storage.from("student-proposals").download(version.storage_path);if(dl.error||!dl.data)throw dl.error??new Error("Download gagal.");const href=URL.createObjectURL(dl.data);const a=document.createElement("a");a.href=href;a.download=version.file_name;a.click();URL.revokeObjectURL(href);}catch(e){setMessage(toUserMessage(e))}}

  async function addMilestone(){if(!newMilestone.trim())return;const {error}=await supabase.from("milestones").insert({student_id:studentId,title:newMilestone.trim(),sort_order:milestones.length});if(error)return setMessage(toUserMessage(error));setNewMilestone("");await loadWorkspace()}
  async function toggleMilestone(item:Milestone){const next=item.status==="completed"?"planned":"completed";const {error}=await supabase.from("milestones").update({status:next,completed_at:next==="completed"?new Date().toISOString():null}).eq("id",item.id);if(error)setMessage(toUserMessage(error));else await loadWorkspace()}
  async function addRoadmapItem(){if(!newRoadmap.trim())return;const {error}=await supabase.from("roadmap_items").insert({student_id:studentId,title:newRoadmap.trim(),sort_order:roadmap.length});if(error)return setMessage(toUserMessage(error));setNewRoadmap("");await loadWorkspace()}
  async function toggleRoadmap(item:RoadmapItem){const next=item.status==="completed"?"planned":"completed";const {error}=await supabase.from("roadmap_items").update({status:next}).eq("id",item.id);if(error)setMessage(toUserMessage(error));else await loadWorkspace()}

  const journeySteps=["Kenal Diri","Expertise","Mimpi","Arah","Milestone","Roadmap"];
  const progress=useMemo(()=>profile?[true,Boolean(profile.expertise),lifeAspects.some(x=>asText(x.content).trim().length>0),Boolean(profile.career_direction),milestones.length>0,roadmap.length>0]:[false,false,false,false,false,false],[profile,lifeAspects,milestones,roadmap]);
  if(loading||!student||!profile)return <main className="center-screen"><div className="loader"/></main>;
  const latest=versions[0];const extraction=normalizeExtraction(latest?.extracted_data);

  return <main className="student-workspace-page">
    <header className="student-workspace-topbar"><Link href="/" className="back-link"><ArrowLeft size={18}/> Dashboard</Link><div className="workspace-brand">Bina Insan <strong>LifeMap</strong></div></header>
    <section className="student-hero"><div className="student-identity"><div className="big-avatar">{student.full_name.slice(0,2).toUpperCase()}</div><div><p className="eyebrow">DETAIL SISWA</p><h1>{student.full_name}</h1><p>{student.classes?.name??"Kelas belum tersedia"} · {student.gender==="L"?"Laki-laki":student.gender==="P"?"Perempuan":"-"}</p></div></div><div className="hero-actions">{latest?.mime_type===DOCX_MIME&&<button className="smart-read-btn" onClick={()=>analyzeVersion(latest)} disabled={analyzing}><Sparkles size={17}/>{analyzing?"Membaca…":"Baca Proposal"}</button>}<label className="upload-btn"><Upload size={17}/>{uploading?"Mengunggah...":latest?"Upload Versi Baru":"Upload Proposal"}<input type="file" accept=".pdf,.doc,.docx" onChange={uploadProposal} disabled={uploading}/></label></div></section>
    <NetworkState phase={uploadPhase} detail={uploadDetail} onRetry={retryFile?()=>uploadFile(retryFile):undefined}/>
    {message&&<div className="workspace-message">{message}</div>}
    {extraction&&<section className={latest?.extraction_status==="needs_review"?"smart-reader-card review":"smart-reader-card"}><div className="smart-reader-head"><div className="smart-reader-icon"><Sparkles size={20}/></div><div><p className="eyebrow">SMART PROPOSAL READER</p><h2>{latest?.extraction_status==="needs_review"?"Data ditemukan — beberapa bagian perlu dicek":"Proposal sudah dipetakan"}</h2><p>Dashboard mengisi bagian yang kosong dari isi dokumen. Data manual yang sudah ada tidak ditimpa.</p></div></div><div className="smart-reader-summary"><div><strong>{extraction.found.length}</strong><span>kelompok data ditemukan</span></div><div><strong>{extraction.lifeAspects.length}</strong><span>aspek Life Map</span></div><div><strong>{extraction.needsReview.length}</strong><span>perlu dicek</span></div></div><div className="smart-reader-tags">{extraction.found.map(x=><span className="found-tag" key={x}><CheckCircle2 size={14}/>{x}</span>)}{extraction.needsReview.map(x=><span className="review-tag" key={x}>{x}</span>)}</div></section>}
    <div className="journey-strip">{journeySteps.map((step,i)=><div key={step} className={progress[i]?"journey-node done":"journey-node"}><span>{progress[i]?<CheckCircle2 size={15}/>:i+1}</span><strong>{step}</strong></div>)}</div>
    <nav className="workspace-tabs">{[["overview","Overview"],["lifemap","Life Map"],["milestone","Milestone"],["roadmap","Roadmap"],["proposal","Proposal"]].map(([id,label])=><button key={id} className={activeTab===id?"active":""} onClick={()=>setActiveTab(id)}>{label}</button>)}</nav>

    {activeTab==="overview"&&<section className="workspace-grid"><div className="workspace-card span-2"><div className="card-title"><UserRound size={18}/><div><p className="eyebrow">LIFE & CAREER PROFILE</p><h2>Arah utama siswa</h2></div><button className="small-primary" onClick={saveProfile} disabled={saving}>{saving?<Loader2 size={16}/>:<Save size={16}/>} Simpan</button></div><div className="profile-form-grid"><Field label="Expertise" value={profile.expertise??""} onChange={v=>setProfile({...profile,expertise:v})}/><Field label="Arah Karier" value={profile.career_direction??""} onChange={v=>setProfile({...profile,career_direction:v})}/><Field label="Target Pendidikan" value={profile.education_target??""} onChange={v=>setProfile({...profile,education_target:v})}/><Field label="Target Jurusan" value={profile.major_target??""} onChange={v=>setProfile({...profile,major_target:v})}/><Field label="Target Kampus" value={profile.campus_target??""} onChange={v=>setProfile({...profile,campus_target:v})}/><Field label="Mentor" value={profile.mentor??""} onChange={v=>setProfile({...profile,mentor:v})}/><Field label="Role Model" value={profile.role_model??""} onChange={v=>setProfile({...profile,role_model:v})}/><Field label="Prestasi / Personal Brand" value={profile.personal_brand??""} onChange={v=>setProfile({...profile,personal_brand:v})}/><label className="profile-field"><span>Tahap Perjalanan</span><select value={profile.journey_stage} onChange={e=>setProfile({...profile,journey_stage:e.target.value})}><option value="belum_dipetakan">Belum dipetakan</option><option value="eksplorasi">Eksplorasi</option><option value="sudah_punya_arah">Sudah punya arah</option><option value="persiapan">Persiapan</option><option value="on_track">On track</option><option value="perlu_pendampingan">Perlu pendampingan</option></select></label></div></div><div className="workspace-card"><div className="card-title"><FileText size={18}/><div><p className="eyebrow">PROPOSAL HIDUP</p><h2>{latest?`Versi ${latest.version_number}`:"Belum ada file"}</h2></div></div>{latest?<><p className="file-name">{latest.file_name}</p><p className="soft-copy">{formatBytes(latest.file_size)} · {formatDate(latest.uploaded_at)}</p><div className="proposal-actions-stack"><button className="wide-secondary" onClick={()=>{setActiveTab("proposal");void openVersion(latest)}}>Buka proposal</button>{latest.mime_type===DOCX_MIME&&<button className="wide-smart" onClick={()=>analyzeVersion(latest)} disabled={analyzing}><FileSearch size={16}/>{analyzing?"Sedang membaca…":latest.extraction_status==="completed"||latest.extraction_status==="needs_review"?"Baca ulang & sinkronkan":"Baca & isi otomatis"}</button>}</div></>:<p className="soft-copy">Upload PDF atau Word untuk menghubungkan proposal hidup dengan profil siswa.</p>}</div><div className="workspace-card"><div className="card-title"><GraduationCap size={18}/><div><p className="eyebrow">DATA AKADEMIK</p><h2>{student.classes?.name}</h2></div></div><div className="mini-detail"><span>NIS</span><strong>{student.nis||"Belum valid"}</strong></div><div className="mini-detail"><span>NISN</span><strong>{student.nisn||"Belum valid"}</strong></div><div className="mini-detail"><span>Email</span><strong>{student.email||"-"}</strong></div></div></section>}

    {activeTab==="lifemap"&&<section className="workspace-card life-map-card"><div className="card-title"><Map size={18}/><div><p className="eyebrow">LIFE MAP</p><h2>Peta aspek hidup siswa</h2></div><button className="small-primary" onClick={saveLifeMap} disabled={saving}><Save size={16}/> Simpan Life Map</button></div><p className="section-copy">Isi ringkas sesuai proposal siswa. Smart Proposal Reader mengisi jawaban yang jelas dan tetap dapat dikoreksi.</p><div className="life-aspect-grid">{lifeAspects.map((aspect,i)=>{const label=LIFE_CATEGORIES.find(([key])=>key===aspect.category)?.[1]??aspect.category;return <label className={asText(aspect.content).trim()?"life-aspect filled":"life-aspect"} key={aspect.category}><div><span className="aspect-index">{String(i+1).padStart(2,"0")}</span><strong>{label}</strong></div><textarea value={asText(aspect.content)} placeholder="Belum ada catatan..." onChange={e=>setLifeAspects(lifeAspects.map((x,n)=>n===i?{...x,content:e.target.value}:x))}/></label>})}</div></section>}
    {activeTab==="milestone"&&<section className="workspace-card life-map-card"><div className="card-title"><Flag size={18}/><div><p className="eyebrow">MILESTONE</p><h2>Langkah konkret berikutnya</h2></div></div><div className="quick-add"><input value={newMilestone} onChange={e=>setNewMilestone(e.target.value)} placeholder="Contoh: Menentukan 3 pilihan jurusan" onKeyDown={e=>{if(e.key==="Enter")void addMilestone()}}/><button onClick={addMilestone}>Tambah</button></div><div className="check-list">{milestones.map(item=><button key={item.id} onClick={()=>toggleMilestone(item)} className={item.status==="completed"?"check-item complete":"check-item"}><span>{item.status==="completed"?<CheckCircle2 size={18}/>:<span className="empty-check"/>}</span><div><strong>{item.title}</strong><small>{item.target_date?formatDate(item.target_date):"Belum ada target tanggal"}</small></div></button>)}{!milestones.length&&<Empty text="Belum ada milestone. Tambahkan langkah pertama siswa."/>}</div></section>}
    {activeTab==="roadmap"&&<section className="workspace-card life-map-card"><div className="card-title"><Target size={18}/><div><p className="eyebrow">ROADMAP</p><h2>Urutan perjalanan menuju target</h2></div></div><div className="quick-add"><input value={newRoadmap} onChange={e=>setNewRoadmap(e.target.value)} placeholder="Contoh: Persiapan SNBT" onKeyDown={e=>{if(e.key==="Enter")void addRoadmapItem()}}/><button onClick={addRoadmapItem}>Tambah</button></div><div className="roadmap-list">{roadmap.map((item,i)=><button key={item.id} onClick={()=>toggleRoadmap(item)} className={item.status==="completed"?"roadmap-step complete":"roadmap-step"}><span className="roadmap-number">{item.status==="completed"?<CheckCircle2 size={18}/>:i+1}</span><div><strong>{item.title}</strong><small>{item.mentor?`Mentor: ${item.mentor}`:"Mentor belum ditentukan"}</small></div></button>)}{!roadmap.length&&<Empty text="Roadmap masih kosong. Susun urutan perjalanan siswa di sini."/>}</div></section>}
    {activeTab==="proposal"&&<section className="proposal-layout"><aside className="workspace-card version-panel"><div className="card-title"><BookOpen size={18}/><div><p className="eyebrow">DOKUMEN</p><h2>Riwayat Proposal</h2></div></div>{versions.map((version,i)=><div className={i===0?"version-card current":"version-card"} key={version.id}><div><strong>Versi {version.version_number}</strong><span>{i===0?"Aktif":formatDate(version.uploaded_at)}</span></div><p>{version.file_name}</p><div className="extract-status"><span className={`status-dot ${version.extraction_status||"pending"}`}/>{labelExtraction(version.extraction_status)}</div><div className="version-actions"><button onClick={()=>openVersion(version)}>Lihat</button>{version.mime_type===DOCX_MIME&&<button onClick={()=>analyzeVersion(version)} disabled={analyzing}><Sparkles size={14}/> Analisis</button>}<button onClick={()=>downloadVersion(version)}><Download size={14}/> Unduh</button></div></div>)}{!versions.length&&<Empty text="Belum ada proposal yang diunggah."/>}</aside><div className="workspace-card document-viewer"><div className="viewer-head"><div><p className="eyebrow">DOCUMENT VIEWER</p><h2>{latest?.file_name??"Pilih dokumen"}</h2></div>{latest&&<button className="refresh-btn" onClick={()=>openVersion(latest)}><RefreshCw size={16}/> Muat versi aktif</button>}</div>{!previewUrl&&!docxText&&<div className="viewer-empty"><FileText size={42}/><strong>Preview dokumen</strong><p>Pilih “Lihat” pada versi proposal. PDF tampil melalui URL privat; DOCX ditampilkan sebagai teks aman.</p></div>}{previewUrl&&<iframe className="pdf-frame" src={previewUrl} title="Proposal siswa"/>}{docxText&&<article className="docx-preview" style={{whiteSpace:"pre-wrap"}}>{docxText}</article>}</div></section>}
  </main>;
}

function Field({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}){return <label className="profile-field"><span>{label}</span><input value={value} onChange={e=>onChange(e.target.value)} placeholder="Belum diisi"/></label>}
function Empty({text}:{text:string}){return <div className="empty-workspace"><FileText size={22}/><span>{text}</span></div>}
function formatBytes(value:number){if(value<1024)return `${value} B`;if(value<1048576)return `${(value/1024).toFixed(1)} KB`;return `${(value/1048576).toFixed(1)} MB`}
function formatDate(value:string){const date=new Date(value);return Number.isNaN(date.getTime())?"-":new Intl.DateTimeFormat("id-ID",{day:"numeric",month:"short",year:"numeric"}).format(date)}
function labelExtraction(value?:string){const labels:Record<string,string>={pending:"Belum dianalisis",processing:"Sedang membaca",completed:"Terbaca otomatis",needs_review:"Terbaca · perlu cek",unsupported:"Preview saja",failed:"Analisis gagal"};return labels[value||"pending"]||"Belum dianalisis"}
