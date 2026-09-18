"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenCheck, BriefcaseBusiness, ClipboardCheck, KeyRound, Settings } from "lucide-react";

export function BKQuickAccess(){
  const pathname=usePathname();
  if(pathname!=="/counseling") return null;
  return <div className="bk-quick-stack">
    <Link href="/counseling/assessments" className="bk-assessment-quick-access"><ClipboardCheck size={17}/><span>Asesmen & Need Signals</span></Link>
    <Link href="/counseling/student-access" className="bk-assessment-quick-access"><KeyRound size={17}/><span>Akses Siswa & PIN</span></Link>
    <Link href="/counseling/career-monitoring" className="bk-assessment-quick-access"><BriefcaseBusiness size={17}/><span>Monitoring Karier</span></Link>
    <Link href="/counseling/career-content" className="bk-assessment-quick-access"><BookOpenCheck size={17}/><span>Career Content Studio</span></Link>
    <Link href="/system-management" className="bk-assessment-quick-access"><Settings size={17}/><span>Manajemen Sistem</span></Link>
  </div>;
}
