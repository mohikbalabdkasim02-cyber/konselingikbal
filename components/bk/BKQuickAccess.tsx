"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardCheck } from "lucide-react";

export function BKQuickAccess(){
  const pathname=usePathname();
  if(pathname!=="/counseling") return null;
  return <Link href="/counseling/assessments" className="bk-assessment-quick-access"><ClipboardCheck size={17}/><span>Asesmen & Need Signals</span></Link>;
}
