"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenCheck, BriefcaseBusiness, ClipboardCheck, KeyRound, Settings } from "lucide-react";

const items = [
  { href:"/counseling/assessments", icon:ClipboardCheck, full:"Asesmen & Need Signals", short:"Asesmen" },
  { href:"/counseling/student-access", icon:KeyRound, full:"Akses Siswa & PIN", short:"Akses" },
  { href:"/counseling/career-monitoring", icon:BriefcaseBusiness, full:"Monitoring Karier", short:"Karier" },
  { href:"/counseling/career-content", icon:BookOpenCheck, full:"Career Content Studio", short:"Konten" },
  { href:"/system-management", icon:Settings, full:"Manajemen Sistem", short:"Sistem" },
];

export function BKQuickAccess(){
  const pathname=usePathname();
  if(pathname!=="/counseling") return null;
  return <nav className="bk-quick-stack" aria-label="Akses cepat BK">
    {items.map(({href,icon:Icon,full,short})=>
      <Link key={href} href={href} className="bk-assessment-quick-access" aria-label={full}>
        <Icon size={18}/>
        <span className="bk-label-full">{full}</span>
        <span className="bk-label-short">{short}</span>
      </Link>
    )}
  </nav>;
}
