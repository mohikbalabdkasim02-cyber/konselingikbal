"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpenCheck,
  BriefcaseBusiness,
  ClipboardCheck,
  Home,
  KeyRound,
  LayoutGrid,
  LogOut,
  MoreHorizontal,
  Settings,
  ShieldCheck,
  Target,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type NavItem = {
  href:string;
  label:string;
  icon:typeof Home;
  match:(pathname:string,hash:string)=>boolean;
};

const staffPrimary:NavItem[] = [
  {href:"/",label:"Beranda",icon:Home,match:(p,h)=>p==="/"&&h!=="#siswa"},
  {href:"/students",label:"Siswa",icon:Users,match:(p)=>p==="/students"||p.startsWith("/students/")},
  {href:"/counseling",label:"BK",icon:ShieldCheck,match:(p)=>p.startsWith("/counseling")},
];

const studentPrimary:NavItem[] = [
  {href:"/student",label:"Beranda",icon:Home,match:(p)=>p==="/student"},
  {href:"/student/assessments",label:"Asesmen",icon:ClipboardCheck,match:(p)=>p.startsWith("/student/assessments")},
  {href:"/student/action-plan",label:"Rencana",icon:Target,match:(p)=>p.startsWith("/student/action-plan")},
  {href:"/student/career",label:"Karier",icon:BriefcaseBusiness,match:(p)=>p.startsWith("/student/career")},
];

const moreItems = [
  {href:"/counseling/assessments",label:"Asesmen & Need Signals",caption:"Jawaban, sinyal kebutuhan, dan review siswa",icon:ClipboardCheck},
  {href:"/counseling/student-access",label:"Akses Siswa & PIN",caption:"Kelola akses Portal Siswa",icon:KeyRound},
  {href:"/counseling/career-monitoring",label:"Monitoring Karier",caption:"Pantau perjalanan dan review karier",icon:BriefcaseBusiness},
  {href:"/counseling/career-content",label:"Career Content Studio",caption:"Kelola konten Career 360°",icon:BookOpenCheck},
  {href:"/system-management",label:"Manajemen Sistem",caption:"Siswa, kelas, import, laporan, dan pengaturan",icon:Settings},
  {href:"/student/login",label:"Portal Siswa",caption:"Buka pintu masuk khusus siswa",icon:UserRound},
];

export function MobileAppNav(){
  const pathname=usePathname();
  const [hash,setHash]=useState("");
  const [moreOpen,setMoreOpen]=useState(false);
  const [rootStaffSession,setRootStaffSession]=useState(false);
  const [sessionChecked,setSessionChecked]=useState(pathname!=="/");

  useEffect(()=>{
    const syncHash=()=>setHash(window.location.hash);
    syncHash();
    window.addEventListener("hashchange",syncHash);
    return()=>window.removeEventListener("hashchange",syncHash);
  },[]);

  useEffect(()=>{
    if(pathname!=="/"){setSessionChecked(true);return}
    let active=true;
    supabase.auth.getSession().then(({data})=>{
      if(!active)return;
      setRootStaffSession(Boolean(data.session));
      setSessionChecked(true);
    }).catch(()=>{if(active)setSessionChecked(true)});
    const {data:listener}=supabase.auth.onAuthStateChange((_event,session)=>{
      if(!active)return;
      setRootStaffSession(Boolean(session));
      setSessionChecked(true);
    });
    return()=>{active=false;listener.subscription.unsubscribe()};
  },[pathname]);

  const mode=useMemo<"student"|"staff"|null>(()=>{
    if(pathname==="/student/login")return null;
    if(pathname.startsWith("/student"))return "student";
    if(pathname==="/"&&!rootStaffSession)return null;
    if(
      pathname==="/"||
      pathname.startsWith("/students/")||
      pathname.startsWith("/counseling")||
      pathname.startsWith("/system-management")
    )return "staff";
    return null;
  },[pathname,rootStaffSession]);

  useEffect(()=>{
    if(!sessionChecked||!mode){document.body.classList.remove("mobile-nav-visible");return}
    document.body.classList.add("mobile-nav-visible");
    return()=>document.body.classList.remove("mobile-nav-visible");
  },[mode,sessionChecked]);

  useEffect(()=>{
    if(!moreOpen)return;
    const previous=document.body.style.overflow;
    document.body.style.overflow="hidden";
    const onKey=(event:KeyboardEvent)=>{if(event.key==="Escape")setMoreOpen(false)};
    window.addEventListener("keydown",onKey);
    return()=>{
      document.body.style.overflow=previous;
      window.removeEventListener("keydown",onKey);
    };
  },[moreOpen]);

  if(!sessionChecked||!mode)return null;

  const items=mode==="student"?studentPrimary:staffPrimary;

  async function signOut(){
    setMoreOpen(false);
    await supabase.auth.signOut();
    window.location.href="/";
  }

  return <>
    <nav className={"mobile-app-nav "+(mode==="student"?"student":"staff")} aria-label={mode==="student"?"Navigasi siswa":"Navigasi Guru BK"}>
      <div className="mobile-app-nav-inner">
        {items.map(({href,label,icon:Icon,match})=>{
          const active=match(pathname,hash);
          return <Link key={href} href={href} className={active?"active":""} aria-current={active?"page":undefined}>
            <Icon/>
            <span>{label}</span>
          </Link>;
        })}
        {mode==="staff"&&<button type="button" className={moreOpen?"active":""} onClick={()=>setMoreOpen(true)} aria-expanded={moreOpen}>
          <MoreHorizontal/>
          <span>Lainnya</span>
        </button>}
      </div>
    </nav>

    {mode==="staff"&&moreOpen&&<div className="mobile-more-backdrop" role="presentation" onClick={()=>setMoreOpen(false)}>
      <section className="mobile-more-sheet" role="dialog" aria-modal="true" aria-label="Menu lainnya" onClick={event=>event.stopPropagation()}>
        <div className="mobile-sheet-handle"/>
        <header className="mobile-more-head">
          <div>
            <span>MENU LAINNYA</span>
            <h2>Akses Guru BK</h2>
          </div>
          <button type="button" onClick={()=>setMoreOpen(false)} aria-label="Tutup menu"><X/></button>
        </header>
        <div className="mobile-more-grid">
          {moreItems.map(({href,label,caption,icon:Icon})=><Link key={href} href={href} onClick={()=>setMoreOpen(false)}>
            <Icon/>
            <div><strong>{label}</strong><span>{caption}</span></div>
          </Link>)}
        </div>
        <button type="button" className="mobile-more-logout" onClick={signOut}><LogOut/><span>Keluar dari akun Guru BK</span></button>
        <div className="mobile-more-credit"><LayoutGrid/><span>Dikembangkan oleh <strong>Teman Digital</strong></span></div>
      </section>
    </div>}
  </>;
}
