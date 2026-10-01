"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronRight, Search, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { BrandLogo } from "@/components/brand/BrandLogo";
import "./directory.css";

type StudentRow={
  id:string;
  full_name:string;
  nis:string|null;
  nisn:string|null;
  classes:{name:string;grade:number}|null;
  student_profiles:{career_direction:string|null;journey_stage:string|null}|null;
};

function one<T>(value:T|T[]|null|undefined):T|null{
  if(Array.isArray(value))return value[0]??null;
  return value??null;
}

export default function StudentsDirectoryPage(){
  const router=useRouter();
  const [students,setStudents]=useState<StudentRow[]>([]);
  const [loading,setLoading]=useState(true);
  const [query,setQuery]=useState("");
  const [grade,setGrade]=useState("all");
  const [error,setError]=useState("");

  useEffect(()=>{void load()},[]);

  async function load(){
    setLoading(true);setError("");
    try{
      const {data:{session}}=await supabase.auth.getSession();
      if(!session){router.replace("/");return}
      const {data,error}=await supabase
        .from("students")
        .select("id,full_name,nis,nisn,classes(name,grade),student_profiles(career_direction,journey_stage)")
        .eq("is_active",true)
        .order("full_name");
      if(error)throw error;
      setStudents(((data??[]) as unknown as Record<string,unknown>[]).map(row=>({
        id:String(row.id??""),
        full_name:String(row.full_name??""),
        nis:typeof row.nis==="string"?row.nis:null,
        nisn:typeof row.nisn==="string"?row.nisn:null,
        classes:one(row.classes as StudentRow["classes"]|StudentRow["classes"][]),
        student_profiles:one(row.student_profiles as StudentRow["student_profiles"]|StudentRow["student_profiles"][]),
      })));
    }catch(e){setError(e instanceof Error?e.message:"Daftar siswa gagal dimuat.")}
    finally{setLoading(false)}
  }

  const filtered=useMemo(()=>{
    const needle=query.trim().toLowerCase();
    return students.filter(student=>{
      if(grade!=="all"&&String(student.classes?.grade??"")!==grade)return false;
      if(!needle)return true;
      return [
        student.full_name,
        student.nis,
        student.nisn,
        student.classes?.name,
        student.student_profiles?.career_direction,
      ].some(value=>typeof value==="string"&&value.toLowerCase().includes(needle));
    });
  },[students,query,grade]);

  return <main className="staff-student-directory-page">
    <header className="staff-directory-topbar">
      <Link href="/" className="staff-directory-back"><ArrowLeft/> <span>Dashboard</span></Link>
      <BrandLogo compact/>
    </header>

    <section className="staff-directory-shell">
      <div className="staff-directory-head">
        <div><span>DATA SISWA</span><h1>Daftar Siswa</h1><p>{students.length} siswa aktif · buka profil untuk melihat Student 360.</p></div>
        <div className="staff-directory-count"><Users/><strong>{students.length}</strong></div>
      </div>

      <div className="staff-directory-search">
        <Search/>
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari nama, NIS, kelas, atau arah karier"/>
      </div>

      <div className="staff-directory-filters" aria-label="Filter tingkat">
        {[["all","Semua"],["10","X"],["11","XI"],["12","XII"]].map(([value,label])=>
          <button key={value} type="button" className={grade===value?"active":""} onClick={()=>setGrade(value)}>{label}</button>
        )}
      </div>

      {error&&<div className="staff-directory-error">{error}<button onClick={load}>Coba lagi</button></div>}

      <section className="staff-directory-list" aria-label="Daftar siswa">
        {loading?Array.from({length:7}).map((_,index)=><div className="staff-directory-skeleton" key={index}><i/><div><b/><span/></div></div>):
          filtered.map(student=><Link href={`/students/${student.id}`} className="staff-directory-row" key={student.id}>
            <div className="staff-directory-avatar">{student.full_name.split(/\s+/).slice(0,2).map(part=>part[0]).join("").toUpperCase()}</div>
            <div className="staff-directory-copy">
              <strong>{student.full_name}</strong>
              <span>{student.classes?.name??"Kelas belum tersedia"}{student.nis?` · NIS ${student.nis}`:""}</span>
              <small>{student.student_profiles?.career_direction?.trim()||"Arah karier belum dipetakan"}</small>
            </div>
            <ChevronRight/>
          </Link>)
        }
        {!loading&&!filtered.length&&<div className="staff-directory-empty"><Users/><strong>Tidak ada siswa yang cocok</strong><span>Coba ubah kata pencarian atau filter tingkat.</span></div>}
      </section>
    </section>
  </main>;
}
