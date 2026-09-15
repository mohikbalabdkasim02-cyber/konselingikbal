"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, CheckCircle2, Download, FileText, Flag, GraduationCap, Loader2, Map, RefreshCw, Save, Target, Upload, UserRound } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Student = {
  id: string;
  full_name: string;
  gender: "L" | "P" | null;
  email: string | null;
  nis: string | null;
  nisn: string | null;
  classes: { name: string; slug: string; grade: number } | null;
};

type Profile = {
  student_id: string;
  expertise: string | null;
  career_direction: string | null;
  education_target: string | null;
  journey_stage: string;
  role_model: string | null;
  personal_brand: string | null;
  major_target: string | null;
  campus_target: string | null;
  mentor: string | null;
  summary_notes: string | null;
};

type StudentDocument = { id: string; status: string; latest_version: number };
type DocumentVersion = { id: string; version_number: number; storage_path: string; file_name: string; mime_type: string; file_size: number; uploaded_at: string; notes: string | null };
type LifeAspect = { id?: string; category: string; content: string; status: string; sort_order: number };
type Milestone = { id: string; title: string; description: string | null; target_date: string | null; status: string; sort_order: number };
type RoadmapItem = { id: string; title: string; description: string | null; mentor: string | null; target_date: string | null; status: string; sort_order: number };

const LIFE_CATEGORIES = [
  ["spiritual", "Spiritual & Tazkiyatunnafs"],
  ["islamic_studies", "Islamic Studies"],
  ["ibadah", "Ibadah"],
  ["leadership", "Leadership & Citizenship"],
  ["health", "Health"],
  ["knowledge", "Knowledge & Science"],
  ["social", "Social & Environment"],
  ["entrepreneurship", "Entrepreneurship"],
  ["career", "Career / Work"],
  ["education", "Education"],
  ["finance", "Finance"],
  ["family", "Family & Friends"],
  ["personal", "Personal Life"],
] as const;

const EMPTY_PROFILE: Omit<Profile, "student_id"> = {
  expertise: "",
  career_direction: "",
  education_target: "",
  journey_stage: "belum_dipetakan",
  role_model: "",
  personal_brand: "",
  major_target: "",
  campus_target: "",
  mentor: "",
  summary_notes: "",
};

export default function StudentWorkspacePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const studentId = params.id;
  const [student, setStudent] = useState<Student | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [doc, setDoc] = useState<StudentDocument | null>(null);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [lifeAspects, setLifeAspects] = useState<LifeAspect[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [roadmap, setRoadmap] = useState<RoadmapItem[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [docxHtml, setDocxHtml] = useState<string | null>(null);
  const [newMilestone, setNewMilestone] = useState("");
  const [newRoadmap, setNewRoadmap] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/");
      else loadWorkspace();
    });
  }, [studentId]);

  async function loadWorkspace() {
    setLoading(true);
    setMessage("");
    const [studentRes, profileRes, docRes, lifeRes, milestoneRes, roadmapRes] = await Promise.all([
      supabase.from("students").select("id,full_name,gender,email,nis,nisn,classes(name,slug,grade)").eq("id", studentId).single(),
      supabase.from("student_profiles").select("*").eq("student_id", studentId).maybeSingle(),
      supabase.from("student_documents").select("id,status,latest_version").eq("student_id", studentId).eq("document_type", "proposal_hidup").maybeSingle(),
      supabase.from("life_aspects").select("id,category,content,status,sort_order").eq("student_id", studentId).order("sort_order"),
      supabase.from("milestones").select("id,title,description,target_date,status,sort_order").eq("student_id", studentId).order("sort_order"),
      supabase.from("roadmap_items").select("id,title,description,mentor,target_date,status,sort_order").eq("student_id", studentId).order("sort_order"),
    ]);

    if (studentRes.error) {
      setMessage(studentRes.error.message);
      setLoading(false);
      return;
    }
    setStudent(studentRes.data as unknown as Student);
    setProfile((profileRes.data as Profile | null) ?? ({ student_id: studentId, ...EMPTY_PROFILE } as Profile));
    setDoc(docRes.data as StudentDocument | null);
    setLifeAspects(normalizeLifeAspects((lifeRes.data ?? []) as LifeAspect[]));
    setMilestones((milestoneRes.data ?? []) as Milestone[]);
    setRoadmap((roadmapRes.data ?? []) as RoadmapItem[]);

    if (docRes.data?.id) await loadVersions(docRes.data.id);
    else setVersions([]);
    setLoading(false);
  }

  function normalizeLifeAspects(rows: LifeAspect[]) {
    const byCategory = new globalThis.Map(rows.map((row) => [row.category, row]));
    return LIFE_CATEGORIES.map(([category], index) => byCategory.get(category) ?? { category, content: "", status: "empty", sort_order: index });
  }

  async function loadVersions(documentId: string) {
    const { data, error } = await supabase.from("document_versions").select("id,version_number,storage_path,file_name,mime_type,file_size,uploaded_at,notes").eq("document_id", documentId).order("version_number", { ascending: false });
    if (error) setMessage(error.message);
    setVersions((data ?? []) as DocumentVersion[]);
  }

  async function saveProfile() {
    if (!profile) return;
    setSaving(true);
    setMessage("");
    const payload = { ...profile, student_id: studentId };
    const { error } = await supabase.from("student_profiles").upsert(payload, { onConflict: "student_id" });
    setMessage(error ? error.message : "Profil Life & Career berhasil disimpan.");
    setSaving(false);
  }

  async function saveLifeMap() {
    setSaving(true);
    setMessage("");
    const rows = lifeAspects.map((item, index) => ({
      student_id: studentId,
      category: item.category,
      content: item.content.trim() || null,
      status: item.content.trim() ? "filled" : "empty",
      sort_order: index,
    }));
    const { error } = await supabase.from("life_aspects").upsert(rows, { onConflict: "student_id,category" });
    setMessage(error ? error.message : "Life Map berhasil diperbarui.");
    setSaving(false);
    if (!error) await loadWorkspace();
  }

  async function uploadProposal(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const allowed = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword"];
    if (!allowed.includes(file.type)) return setMessage("Format harus PDF, DOCX, atau DOC.");
    if (file.size > 20 * 1024 * 1024) return setMessage("Ukuran file maksimal 20 MB.");

    setUploading(true);
    setMessage("");
    try {
      let currentDoc = doc;
      if (!currentDoc) {
        const { data, error } = await supabase.from("student_documents").insert({ student_id: studentId, document_type: "proposal_hidup", status: "uploaded", latest_version: 0 }).select("id,status,latest_version").single();
        if (error) throw error;
        currentDoc = data as StudentDocument;
        setDoc(currentDoc);
      }

      const nextVersion = (currentDoc.latest_version || 0) + 1;
      const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `${studentId}/proposal_hidup/v${nextVersion}-${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from("student-proposals").upload(storagePath, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;

      const { data: userData } = await supabase.auth.getUser();
      const { error: versionError } = await supabase.from("document_versions").insert({
        document_id: currentDoc.id,
        version_number: nextVersion,
        storage_path: storagePath,
        file_name: file.name,
        mime_type: file.type,
        file_size: file.size,
        uploaded_by: userData.user?.id ?? null,
      });
      if (versionError) {
        await supabase.storage.from("student-proposals").remove([storagePath]);
        throw versionError;
      }

      const { error: docError } = await supabase.from("student_documents").update({ latest_version: nextVersion, status: "uploaded" }).eq("id", currentDoc.id);
      if (docError) throw docError;
      setMessage(`Proposal versi ${nextVersion} berhasil diunggah.`);
      await loadWorkspace();
      setActiveTab("proposal");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload gagal.");
    } finally {
      setUploading(false);
    }
  }

  async function openVersion(version: DocumentVersion) {
    setMessage("");
    setDocxHtml(null);
    setPreviewUrl(null);
    if (version.mime_type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const { data, error } = await supabase.storage.from("student-proposals").download(version.storage_path);
      if (error || !data) return setMessage(error?.message ?? "Dokumen tidak dapat dibuka.");
      try {
        const mammoth = await import("mammoth");
        const arrayBuffer = await data.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setDocxHtml(result.value);
      } catch {
        setMessage("Preview DOCX gagal. File tetap dapat diunduh.");
      }
      return;
    }
    const { data, error } = await supabase.storage.from("student-proposals").createSignedUrl(version.storage_path, 3600);
    if (error) return setMessage(error.message);
    setPreviewUrl(data.signedUrl);
  }

  async function downloadVersion(version: DocumentVersion) {
    const { data, error } = await supabase.storage.from("student-proposals").download(version.storage_path);
    if (error || !data) return setMessage(error?.message ?? "Download gagal.");
    const href = URL.createObjectURL(data);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = version.file_name;
    anchor.click();
    URL.revokeObjectURL(href);
  }

  async function addMilestone() {
    if (!newMilestone.trim()) return;
    const { error } = await supabase.from("milestones").insert({ student_id: studentId, title: newMilestone.trim(), sort_order: milestones.length });
    if (error) return setMessage(error.message);
    setNewMilestone("");
    await loadWorkspace();
  }

  async function toggleMilestone(item: Milestone) {
    const next = item.status === "completed" ? "planned" : "completed";
    await supabase.from("milestones").update({ status: next, completed_at: next === "completed" ? new Date().toISOString() : null }).eq("id", item.id);
    await loadWorkspace();
  }

  async function addRoadmapItem() {
    if (!newRoadmap.trim()) return;
    const { error } = await supabase.from("roadmap_items").insert({ student_id: studentId, title: newRoadmap.trim(), sort_order: roadmap.length });
    if (error) return setMessage(error.message);
    setNewRoadmap("");
    await loadWorkspace();
  }

  async function toggleRoadmap(item: RoadmapItem) {
    const next = item.status === "completed" ? "planned" : "completed";
    await supabase.from("roadmap_items").update({ status: next }).eq("id", item.id);
    await loadWorkspace();
  }

  const journeySteps = ["Kenal Diri", "Expertise", "Mimpi", "Arah", "Milestone", "Roadmap"];
  const progress = useMemo(() => {
    if (!profile) return [false, false, false, false, false, false];
    return [true, Boolean(profile.expertise), lifeAspects.some((x) => x.content.trim()), Boolean(profile.career_direction), milestones.length > 0, roadmap.length > 0];
  }, [profile, lifeAspects, milestones, roadmap]);

  if (loading || !student || !profile) return <main className="center-screen"><div className="loader" /></main>;
  const latest = versions[0];

  return (
    <main className="student-workspace-page">
      <header className="student-workspace-topbar">
        <Link href="/" className="back-link"><ArrowLeft size={18}/> Dashboard</Link>
        <div className="workspace-brand">Bina Insan <strong>LifeMap</strong></div>
      </header>

      <section className="student-hero">
        <div className="student-identity">
          <div className="big-avatar">{student.full_name.slice(0,2).toUpperCase()}</div>
          <div><p className="eyebrow">DETAIL SISWA</p><h1>{student.full_name}</h1><p>{student.classes?.name} · {student.gender === "L" ? "Laki-laki" : "Perempuan"}</p></div>
        </div>
        <div className="hero-actions">
          <label className="upload-btn"><Upload size={17}/>{uploading ? "Mengunggah..." : latest ? "Upload Versi Baru" : "Upload Proposal"}<input type="file" accept=".pdf,.doc,.docx" onChange={uploadProposal} disabled={uploading}/></label>
        </div>
      </section>

      {message && <div className="workspace-message">{message}</div>}

      <div className="journey-strip">
        {journeySteps.map((step, index) => <div key={step} className={progress[index] ? "journey-node done" : "journey-node"}><span>{progress[index] ? <CheckCircle2 size={15}/> : index + 1}</span><strong>{step}</strong></div>)}
      </div>

      <nav className="workspace-tabs">
        {[['overview','Overview'],['lifemap','Life Map'],['milestone','Milestone'],['roadmap','Roadmap'],['proposal','Proposal']].map(([id,label]) => <button key={id} className={activeTab === id ? "active" : ""} onClick={() => setActiveTab(id)}>{label}</button>)}
      </nav>

      {activeTab === "overview" && <section className="workspace-grid">
        <div className="workspace-card span-2">
          <div className="card-title"><UserRound size={18}/><div><p className="eyebrow">LIFE & CAREER PROFILE</p><h2>Arah utama siswa</h2></div><button className="small-primary" onClick={saveProfile} disabled={saving}>{saving ? <Loader2 size={16}/> : <Save size={16}/>} Simpan</button></div>
          <div className="profile-form-grid">
            <Field label="Expertise" value={profile.expertise ?? ""} onChange={(v) => setProfile({...profile, expertise:v})}/>
            <Field label="Arah Karier" value={profile.career_direction ?? ""} onChange={(v) => setProfile({...profile, career_direction:v})}/>
            <Field label="Target Pendidikan" value={profile.education_target ?? ""} onChange={(v) => setProfile({...profile, education_target:v})}/>
            <Field label="Target Jurusan" value={profile.major_target ?? ""} onChange={(v) => setProfile({...profile, major_target:v})}/>
            <Field label="Target Kampus" value={profile.campus_target ?? ""} onChange={(v) => setProfile({...profile, campus_target:v})}/>
            <Field label="Mentor" value={profile.mentor ?? ""} onChange={(v) => setProfile({...profile, mentor:v})}/>
            <Field label="Role Model" value={profile.role_model ?? ""} onChange={(v) => setProfile({...profile, role_model:v})}/>
            <Field label="Prestasi / Personal Brand" value={profile.personal_brand ?? ""} onChange={(v) => setProfile({...profile, personal_brand:v})}/>
            <label className="profile-field"><span>Tahap Perjalanan</span><select value={profile.journey_stage} onChange={(e) => setProfile({...profile, journey_stage:e.target.value})}><option value="belum_dipetakan">Belum dipetakan</option><option value="eksplorasi">Eksplorasi</option><option value="sudah_punya_arah">Sudah punya arah</option><option value="persiapan">Persiapan</option><option value="on_track">On track</option><option value="perlu_pendampingan">Perlu pendampingan</option></select></label>
          </div>
        </div>
        <div className="workspace-card">
          <div className="card-title"><FileText size={18}/><div><p className="eyebrow">PROPOSAL HIDUP</p><h2>{latest ? `Versi ${latest.version_number}` : "Belum ada file"}</h2></div></div>
          {latest ? <><p className="file-name">{latest.file_name}</p><p className="soft-copy">{formatBytes(latest.file_size)} · {formatDate(latest.uploaded_at)}</p><button className="wide-secondary" onClick={() => {setActiveTab('proposal'); openVersion(latest)}}>Buka proposal</button></> : <p className="soft-copy">Upload PDF atau Word untuk menghubungkan proposal hidup dengan profil siswa.</p>}
        </div>
        <div className="workspace-card">
          <div className="card-title"><GraduationCap size={18}/><div><p className="eyebrow">DATA AKADEMIK</p><h2>{student.classes?.name}</h2></div></div>
          <div className="mini-detail"><span>NIS</span><strong>{student.nis || "Belum valid"}</strong></div><div className="mini-detail"><span>NISN</span><strong>{student.nisn || "Belum valid"}</strong></div><div className="mini-detail"><span>Email</span><strong>{student.email || "-"}</strong></div>
        </div>
      </section>}

      {activeTab === "lifemap" && <section className="workspace-card life-map-card">
        <div className="card-title"><Map size={18}/><div><p className="eyebrow">LIFE MAP</p><h2>Peta aspek hidup siswa</h2></div><button className="small-primary" onClick={saveLifeMap} disabled={saving}><Save size={16}/> Simpan Life Map</button></div>
        <p className="section-copy">Isi ringkas sesuai proposal siswa. Kosongkan jika bagian tersebut memang belum disusun.</p>
        <div className="life-aspect-grid">{lifeAspects.map((aspect, index) => {const label = LIFE_CATEGORIES.find(([key]) => key === aspect.category)?.[1] ?? aspect.category; return <label className={aspect.content.trim() ? "life-aspect filled" : "life-aspect"} key={aspect.category}><div><span className="aspect-index">{String(index+1).padStart(2,'0')}</span><strong>{label}</strong></div><textarea value={aspect.content} placeholder="Belum ada catatan..." onChange={(e) => setLifeAspects(lifeAspects.map((item,i) => i===index ? {...item,content:e.target.value} : item))}/></label>})}</div>
      </section>}

      {activeTab === "milestone" && <section className="workspace-card">
        <div className="card-title"><Flag size={18}/><div><p className="eyebrow">MILESTONE</p><h2>Langkah konkret berikutnya</h2></div></div>
        <div className="quick-add"><input value={newMilestone} onChange={(e)=>setNewMilestone(e.target.value)} placeholder="Contoh: Menentukan 3 pilihan jurusan" onKeyDown={(e)=>{if(e.key==='Enter') addMilestone()}}/><button onClick={addMilestone}>Tambah</button></div>
        <div className="check-list">{milestones.map((item)=><button key={item.id} onClick={()=>toggleMilestone(item)} className={item.status==='completed' ? 'check-item complete':'check-item'}><span>{item.status==='completed' ? <CheckCircle2 size={18}/> : <span className="empty-check"/>}</span><div><strong>{item.title}</strong><small>{item.target_date ? formatDate(item.target_date) : 'Belum ada target tanggal'}</small></div></button>)}{milestones.length===0 && <Empty text="Belum ada milestone. Tambahkan langkah pertama siswa."/>}</div>
      </section>}

      {activeTab === "roadmap" && <section className="workspace-card">
        <div className="card-title"><Target size={18}/><div><p className="eyebrow">ROADMAP</p><h2>Urutan perjalanan menuju target</h2></div></div>
        <div className="quick-add"><input value={newRoadmap} onChange={(e)=>setNewRoadmap(e.target.value)} placeholder="Contoh: Persiapan SNBT" onKeyDown={(e)=>{if(e.key==='Enter') addRoadmapItem()}}/><button onClick={addRoadmapItem}>Tambah</button></div>
        <div className="roadmap-list">{roadmap.map((item,index)=><button key={item.id} onClick={()=>toggleRoadmap(item)} className={item.status==='completed'?'roadmap-step complete':'roadmap-step'}><span className="roadmap-number">{item.status==='completed'?<CheckCircle2 size={18}/>:index+1}</span><div><strong>{item.title}</strong><small>{item.mentor ? `Mentor: ${item.mentor}` : 'Mentor belum ditentukan'}</small></div></button>)}{roadmap.length===0 && <Empty text="Roadmap masih kosong. Susun urutan perjalanan siswa di sini."/>}</div>
      </section>}

      {activeTab === "proposal" && <section className="proposal-layout">
        <aside className="workspace-card version-panel">
          <div className="card-title"><BookOpen size={18}/><div><p className="eyebrow">DOKUMEN</p><h2>Riwayat Proposal</h2></div></div>
          {versions.map((version,index)=><div className={index===0?'version-card current':'version-card'} key={version.id}><div><strong>Versi {version.version_number}</strong><span>{index===0?'Aktif':formatDate(version.uploaded_at)}</span></div><p>{version.file_name}</p><div className="version-actions"><button onClick={()=>openVersion(version)}>Lihat</button><button onClick={()=>downloadVersion(version)}><Download size={14}/> Unduh</button></div></div>)}
          {versions.length===0 && <Empty text="Belum ada proposal yang diunggah."/>}
        </aside>
        <div className="workspace-card document-viewer">
          <div className="viewer-head"><div><p className="eyebrow">DOCUMENT VIEWER</p><h2>{latest?.file_name ?? 'Pilih dokumen'}</h2></div>{latest && <button className="refresh-btn" onClick={()=>openVersion(latest)}><RefreshCw size={16}/> Muat versi aktif</button>}</div>
          {!previewUrl && !docxHtml && <div className="viewer-empty"><FileText size={42}/><strong>Preview dokumen</strong><p>Pilih “Lihat” pada versi proposal. PDF akan tampil langsung; DOCX dirender menjadi tampilan web. File DOC lama tetap dapat diunduh.</p></div>}
          {previewUrl && <iframe className="pdf-frame" src={previewUrl} title="Proposal siswa"/>}
          {docxHtml && <article className="docx-preview" dangerouslySetInnerHTML={{__html:docxHtml}}/>}
        </div>
      </section>}
    </main>
  );
}

function Field({label,value,onChange}:{label:string;value:string;onChange:(value:string)=>void}) { return <label className="profile-field"><span>{label}</span><input value={value} onChange={(e)=>onChange(e.target.value)} placeholder="Belum diisi"/></label> }
function Empty({text}:{text:string}) { return <div className="empty-workspace"><FileText size={22}/><span>{text}</span></div> }
function formatBytes(value:number){ if(value<1024) return `${value} B`; if(value<1048576) return `${(value/1024).toFixed(1)} KB`; return `${(value/1048576).toFixed(1)} MB`; }
function formatDate(value:string){ return new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'short',year:'numeric'}).format(new Date(value)); }
