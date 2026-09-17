"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpenCheck, ChevronRight, LogOut, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toUserMessage } from "@/lib/errors";
import { ErrorCard } from "@/components/common/ErrorCard";

export default function StudentHomePage() {
  const [student, setStudent] = useState<{ id:string; full_name:string; classes:{name:string}|null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true); setError("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) throw new Error("Silakan masuk terlebih dahulu.");
      const { data: link, error: linkError } = await supabase.from("student_auth_links").select("student_id").eq("auth_user_id", user.id).maybeSingle();
      if (linkError) throw linkError;
      if (!link?.student_id) throw new Error("Akun siswa belum terhubung ke data siswa. Hubungi Guru BK.");
      const { data, error: studentError } = await supabase.from("students").select("id,full_name,classes(name)").eq("id", link.student_id).single();
      if (studentError) throw studentError;
      setStudent(data as unknown as { id:string; full_name:string; classes:{name:string}|null });
    } catch (err) { setError(toUserMessage(err)); }
    finally { setLoading(false); }
  }

  if (loading) return <main className="center-screen"><div className="loader"/></main>;
  if (!student) return <main className="assessment-page"><div className="assessment-shell"><ErrorCard message={error || "Akun siswa belum tersedia."} onRetry={load}/></div></main>;

  return <main className="assessment-page"><section className="assessment-shell">
    <div className="student-portal-head"><div><p className="eyebrow">BINA INSAN • STUDENT PORTAL</p><h1>Assalamu’alaikum, {student.full_name.split(" ")[0]}</h1><p>{student.full_name} · {student.classes?.name ?? "Kelas belum tersedia"}</p></div><button className="icon-btn" onClick={()=>supabase.auth.signOut()} title="Keluar"><LogOut size={18}/></button></div>
    <div className="student-portal-notice"><ShieldCheck size={19}/><div><strong>Ruang refleksi pribadi</strong><span>Jawaban asesmen digunakan untuk pendampingan BK sesuai kewenangan, bukan untuk memberi label.</span></div></div>
    <div className="student-portal-grid">
      <Link href="/student/assessments/pribadi" className="student-portal-card"><div className="student-portal-icon"><Sparkles size={21}/></div><div><span>ASESMEN PRIBADI</span><h2>Bimbingan Pribadi</h2><p>Kenali diri, emosi, kebiasaan, kebutuhan dukungan, dan susun Personal Action Plan 14 hari.</p></div><ChevronRight size={19}/></Link>
      <Link href="/student/assessments/belajar" className="student-portal-card"><div className="student-portal-icon"><BookOpenCheck size={21}/></div><div><span>ASESMEN BELAJAR</span><h2>Bimbingan Belajar</h2><p>Masalah belajar, penyebab, dampak, kebiasaan belajar, tekanan akademik, dan Learning Action Plan 14 hari.</p></div><ChevronRight size={19}/></Link>
      <Link href="/student/assessments/sosial" className="student-portal-card"><div className="student-portal-icon"><UsersRound size={21}/></div><div><span>ASESMEN SOSIAL</span><h2>Bimbingan Sosial</h2><p>Sekolah, kelas, guru, teman, batas sehat, triase keselamatan, dan Social Action Plan 7–14 hari.</p></div><ChevronRight size={19}/></Link>
      <div className="student-portal-card disabled"><div className="student-portal-icon"><BookOpenCheck size={21}/></div><div><span>BK KARIER</span><h2>Karier & LifeMap</h2><p>Proposal Hidup, eksplorasi karier, Plan A/B/C, roadmap, dan portofolio tetap dipertahankan dan akan diperluas.</p></div></div>
    </div>
  </section></main>;
}
