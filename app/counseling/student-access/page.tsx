"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, KeyRound, RefreshCw, Search, ShieldCheck, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toUserMessage } from "@/lib/errors";

type StudentRow = { id:string; full_name:string; classes?:{name?:string|null}|null };
type PinRow = { id:string; full_name:string; class_name:string; pin:string };

const CLASS_ORDER=["X Abu Bakar","X Umar Bin Khattab","XI Utsmaniyyah","XII Abbasiyah"] as const;
const classRank=(name:string)=>{const rank=CLASS_ORDER.indexOf(name as (typeof CLASS_ORDER)[number]);return rank===-1?99:rank};

export default function StudentAccessPage(){
  const [rows,setRows]=useState<PinRow[]>([]);
  const [credentialCount,setCredentialCount]=useState(0);
  const [loading,setLoading]=useState(true);
  const [activating,setActivating]=useState(false);
  const [message,setMessage]=useState("");
  const [query,setQuery]=useState("");
  const [denied,setDenied]=useState(false);

  useEffect(()=>{void load()},[]);

  async function load(){
    setLoading(true);setMessage("");setDenied(false);
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){setDenied(true);setMessage("Silakan masuk sebagai Guru BK terlebih dahulu.");setLoading(false);return}

    const staffCheck=await supabase.rpc("is_staff");
    if(staffCheck.error||staffCheck.data!==true){setDenied(true);setMessage("Halaman Akses Siswa hanya tersedia untuk Guru BK/staff.");setLoading(false);return}

    const [studentRes,credentialRes]=await Promise.all([
      supabase.from("students").select("id,full_name,classes(name)").eq("is_active",true),
      supabase.from("student_access_credentials").select("student_id",{count:"exact",head:true}).eq("is_active",true),
    ]);
    if(studentRes.error||credentialRes.error){setMessage(toUserMessage(studentRes.error||credentialRes.error));setLoading(false);return}

    const ordered=((studentRes.data??[]) as unknown as StudentRow[])
      .map(s=>({id:s.id,full_name:s.full_name,class_name:s.classes?.name??""}))
      .filter(s=>CLASS_ORDER.includes(s.class_name as (typeof CLASS_ORDER)[number]))
      .sort((a,b)=>classRank(a.class_name)-classRank(b.class_name)||a.full_name.localeCompare(b.full_name,"id",{sensitivity:"base"}));

    const mapped=ordered.map((s,index)=>({...s,pin:String(260001+index).padStart(6,"0")}));
    setRows(mapped);setCredentialCount(credentialRes.count??0);setLoading(false);
  }

  async function activateInitialPins(){
    if(activating||denied)return;
    const ok=window.confirm("Aktifkan PIN awal untuk seluruh 116 siswa? Tindakan ini membuat ulang PIN awal sesuai urutan siswa yang sudah diverifikasi.");
    if(!ok)return;
    setActivating(true);setMessage("");
    try{
      const {data,error}=await supabase.rpc("initialize_student_pins");
      if(error)throw error;
      if(Number(data)!==116)throw new Error(`Initializer mengembalikan ${String(data)}, bukan 116 siswa.`);
      setMessage("116 PIN siswa berhasil diaktifkan.");
      await load();
    }catch(error){setMessage(toUserMessage(error))}finally{setActivating(false)}
  }

  const q=query.trim().toLowerCase();
  const visible=useMemo(()=>rows.filter(r=>!q||r.full_name.toLowerCase().includes(q)||r.class_name.toLowerCase().includes(q)||r.pin.includes(q)),[rows,q]);
  const ready=credentialCount===116&&rows.length===116;

  return <main className="student-workspace-page">
    <header className="student-workspace-topbar"><Link href="/counseling" className="back-link"><ArrowLeft size={18}/> BK Control Center</Link><div className="workspace-brand">Bina Insan <strong>Akses Siswa</strong></div></header>
    <section className="student-hero"><div><p className="eyebrow">AKSES STUDENT PORTAL</p><h1>PIN 116 Siswa</h1><p>Kelola fondasi akses siswa tanpa menyimpan PIN awal sebagai teks biasa di database. PIN diverifikasi dan disimpan sebagai bcrypt hash.</p></div></section>

    {message&&<div className="workspace-message">{message}</div>}

    <div className="assessment-inbox-metrics">
      <Metric label="Siswa terverifikasi" value={rows.length}/>
      <Metric label="PIN aktif" value={credentialCount}/>
      <div className="assessment-inbox-metric"><span>Status</span><strong style={{fontSize:18}}>{ready?"Siap":"Belum aktif"}</strong></div>
    </div>

    <section className="assessment-inbox-shell">
      <div className="workspace-card" style={{marginBottom:18}}>
        <div className="card-title"><ShieldCheck size={19}/><div><p className="eyebrow">KEAMANAN</p><h2>Aktivasi satu kali</h2></div></div>
        <p className="muted">Sistem hanya mengaktifkan PIN jika tepat 116 siswa aktif ditemukan pada empat kelas yang sudah diverifikasi. Hash PIN tidak pernah ditampilkan di halaman ini.</p>
        {ready?<div style={{display:"flex",alignItems:"center",gap:10,fontWeight:800,color:"#0B5D55",marginTop:14}}><CheckCircle2 size={20}/>116 PIN siswa sudah aktif</div>:<button className="small-primary" style={{marginTop:14}} onClick={activateInitialPins} disabled={loading||activating||denied||rows.length!==116}><KeyRound size={16}/>{activating?"Mengaktifkan...":"Aktifkan 116 PIN Awal"}</button>}
        {!ready&&!loading&&rows.length!==116&&<p className="muted" style={{marginTop:10}}>Aktivasi dikunci karena roster yang terbaca bukan 116 siswa.</p>}
      </div>

      <div className="workspace-card">
        <div className="card-title"><Users size={19}/><div><p className="eyebrow">DAFTAR AKSES</p><h2>Nama siswa & PIN awal</h2></div></div>
        <div className="assessment-inbox-toolbar"><div className="search-box"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari nama / kelas / PIN"/></div><button className="ghost-btn" onClick={()=>void load()} disabled={loading}><RefreshCw size={16}/>{loading?"Memuat...":"Muat ulang"}</button></div>
        {denied?<p className="empty-state">Akses ditolak.</p>:loading?<p className="muted">Memuat roster siswa...</p>:<div className="monitor-table">
          <div className="monitor-head" style={{gridTemplateColumns:"1.6fr 1fr .7fr"}}><span>Siswa</span><span>Kelas</span><span>PIN awal</span></div>
          {visible.map(row=><div className="monitor-row" style={{gridTemplateColumns:"1.6fr 1fr .7fr"}} key={row.id}><span><strong>{row.full_name}</strong></span><span>{row.class_name}</span><span><strong>{row.pin}</strong></span></div>)}
        </div>}
      </div>
    </section>
  </main>
}

function Metric({label,value}:{label:string;value:number}){return <div className="assessment-inbox-metric"><span>{label}</span><strong>{value}</strong></div>}
