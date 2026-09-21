"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, KeyRound, RefreshCw, Search, ShieldCheck, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toUserMessage } from "@/lib/errors";

type StudentRow = { id:string; full_name:string; classes?:{name?:string|null;grade?:number|null}|null };
type CredentialRow = { student_id:string; is_active:boolean; failed_attempts:number; locked_until:string|null; last_login_at:string|null; updated_at:string };
type AccessRow = StudentRow & { credential: CredentialRow | null };

export default function StudentAccessPage(){
  const [rows,setRows]=useState<AccessRow[]>([]);
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState("");
  const [query,setQuery]=useState("");
  const [denied,setDenied]=useState(false);
  const [workingId,setWorkingId]=useState("");
  const [generated,setGenerated]=useState<{name:string;pin:string}|null>(null);

  useEffect(()=>{void load()},[]);

  async function load(){
    setLoading(true);setMessage("");setDenied(false);
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){setDenied(true);setMessage("Silakan masuk sebagai Guru BK terlebih dahulu.");setLoading(false);return}

    const staffCheck=await supabase.rpc("is_staff");
    if(staffCheck.error||staffCheck.data!==true){setDenied(true);setMessage("Halaman Akses Siswa hanya tersedia untuk Guru BK/staff.");setLoading(false);return}

    const [studentRes,credentialRes]=await Promise.all([
      supabase.from("students").select("id,full_name,classes(name,grade)").eq("is_active",true),
      supabase.from("student_access_credentials").select("student_id,is_active,failed_attempts,locked_until,last_login_at,updated_at"),
    ]);
    if(studentRes.error||credentialRes.error){setMessage(toUserMessage(studentRes.error||credentialRes.error));setLoading(false);return}

    const credentials=new Map(((credentialRes.data??[]) as CredentialRow[]).map(row=>[row.student_id,row]));
    const mapped=((studentRes.data??[]) as unknown as StudentRow[])
      .map(student=>({...student,credential:credentials.get(student.id)??null}))
      .sort((a,b)=>(a.classes?.grade??99)-(b.classes?.grade??99)||(a.classes?.name??"").localeCompare(b.classes?.name??"","id")||a.full_name.localeCompare(b.full_name,"id",{sensitivity:"base"}));
    setRows(mapped);setLoading(false);
  }

  async function generatePin(row:AccessRow){
    const action=row.credential?"reset":"buat";
    if(!window.confirm(`Yakin ingin ${action} PIN Portal Siswa untuk ${row.full_name}? PIN sebelumnya tidak akan berlaku lagi.`))return;
    setWorkingId(row.id);setGenerated(null);setMessage("");
    try{
      const {data,error}=await supabase.rpc("admin_generate_student_pin",{p_student_id:row.id});
      if(error)throw error;
      setGenerated({name:row.full_name,pin:String(data)});
      setMessage("PIN baru berhasil dibuat. Catat atau berikan ke siswa sekarang; sistem hanya menyimpan hash.");
      await load();
    }catch(error){setMessage(toUserMessage(error))}finally{setWorkingId("")}
  }

  const q=query.trim().toLowerCase();
  const visible=useMemo(()=>rows.filter(row=>!q||row.full_name.toLowerCase().includes(q)||(row.classes?.name??"").toLowerCase().includes(q)),[rows,q]);
  const activeCredentialCount=rows.filter(row=>row.credential?.is_active).length;
  const lockedCount=rows.filter(row=>row.credential?.locked_until&&new Date(row.credential.locked_until)>new Date()).length;

  return <main className="student-workspace-page">
    <header className="student-workspace-topbar"><Link href="/counseling" className="back-link"><ArrowLeft size={18}/> BK Control Center</Link><div className="workspace-brand">Bina Insan <strong>Akses Siswa</strong></div></header>
    <section className="student-hero"><div><p className="eyebrow">AKSES STUDENT PORTAL</p><h1>Manajemen PIN Siswa</h1><p>PIN aktif tidak pernah disimpan atau ditampilkan sebagai teks biasa. Guru BK dapat membuat atau mereset PIN individual dan PIN baru hanya ditampilkan satu kali.</p></div></section>

    {message&&<div className="workspace-message">{message}</div>}
    {generated&&<div className="student-pin-once"><KeyRound size={20}/><div><strong>PIN baru - {generated.name}</strong><span>{generated.pin}</span><small>Simpan secara aman. Setelah halaman ditutup, PIN ini tidak dapat dibaca kembali dari database.</small></div></div>}

    <div className="assessment-inbox-metrics">
      <Metric label="Siswa aktif" value={rows.length}/>
      <Metric label="Akses aktif" value={activeCredentialCount}/>
      <Metric label="Sedang terkunci" value={lockedCount}/>
    </div>

    <section className="assessment-inbox-shell">
      <div className="workspace-card" style={{marginBottom:18}}>
        <div className="card-title"><ShieldCheck size={19}/><div><p className="eyebrow">KEAMANAN</p><h2>PIN berbasis hash</h2></div></div>
        <p className="muted">Daftar di bawah menunjukkan status akses, bukan PIN plaintext. Untuk siswa baru atau siswa yang lupa PIN, gunakan tombol Buat/Reset PIN. Reset juga melepaskan sesi Student Portal lama agar akses tidak bercampur.</p>
        <Link href="/system-management" className="small-primary" style={{marginTop:14,width:"max-content",textDecoration:"none"}}><Users size={16}/> Kelola siswa & kelas</Link>
      </div>

      <div className="workspace-card">
        <div className="card-title"><Users size={19}/><div><p className="eyebrow">DAFTAR AKSES</p><h2>Status Portal Siswa</h2></div></div>
        <div className="assessment-inbox-toolbar"><div className="search-box"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari nama / kelas"/></div><button className="ghost-btn" onClick={()=>void load()} disabled={loading}><RefreshCw size={16}/>{loading?"Memuat...":"Muat ulang"}</button></div>
        {denied?<p className="empty-state">Akses ditolak.</p>:loading?<p className="muted">Memuat akses siswa...</p>:<div className="student-access-status-list">
          {visible.map(row=>{
            const locked=Boolean(row.credential?.locked_until&&new Date(row.credential.locked_until)>new Date());
            return <div className="student-access-status-row" key={row.id}>
              <div><strong>{row.full_name}</strong><small>{row.classes?.name??"Kelas belum tersedia"}</small></div>
              <span className={row.credential?.is_active?"access-pill ready":"access-pill"}>{row.credential?.is_active?"Aktif":"Belum ada PIN"}</span>
              <span className={locked?"access-pill locked":"access-pill"}>{locked?"Terkunci":row.credential?.last_login_at?"Pernah login":"Belum login"}</span>
              <button onClick={()=>generatePin(row)} disabled={workingId===row.id}><KeyRound size={14}/>{workingId===row.id?"Memproses...":row.credential?"Reset PIN":"Buat PIN"}</button>
            </div>
          })}
        </div>}
      </div>
    </section>
  </main>
}

function Metric({label,value}:{label:string;value:number}){return <div className="assessment-inbox-metric"><span>{label}</span><strong>{value}</strong></div>}
