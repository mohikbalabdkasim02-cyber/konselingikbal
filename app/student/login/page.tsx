"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Search, ShieldCheck, UserRound } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { supabase } from "@/lib/supabase";
import { toUserMessage } from "@/lib/errors";

type RosterRow = {
  student_id: string;
  full_name: string;
  class_name: string;
  class_order: number;
};

type VerifyRow = {
  ok: boolean;
  code: string;
  student_id: string;
};

export default function StudentLoginPage() {
  const router = useRouter();
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [className, setClassName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [search, setSearch] = useState("");
  const [pin, setPin] = useState("");
  const [loadingRoster, setLoadingRoster] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [staffSessionActive, setStaffSessionActive] = useState(false);

  useEffect(() => { void bootstrap(); }, []);

  async function bootstrap() {
    setLoadingRoster(true);
    setMessage("");
    setStaffSessionActive(false);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (user) {
        const { data: existingLink } = await supabase
          .from("student_auth_links")
          .select("student_id")
          .eq("auth_user_id", user.id)
          .maybeSingle();
        if (existingLink?.student_id) {
          router.replace("/student");
          return;
        }
        setStaffSessionActive(!user.is_anonymous);
      }

      const { data, error } = await supabase.rpc("student_login_roster");
      if (error) throw error;
      const rows = (data ?? []) as RosterRow[];
      setRoster(rows);
      if (rows.length > 0) setClassName(rows[0].class_name);
    } catch (error) {
      setMessage(toUserMessage(error));
    } finally {
      setLoadingRoster(false);
    }
  }

  const classes = useMemo(() => {
    const seen = new Map<string, number>();
    roster.forEach((row) => seen.set(row.class_name, row.class_order));
    return Array.from(seen.entries()).sort((a, b) => a[1] - b[1]).map(([name]) => name);
  }, [roster]);

  const students = useMemo(() => {
    const query = search.trim().toLowerCase();
    return roster.filter((row) => row.class_name === className && (!query || row.full_name.toLowerCase().includes(query)));
  }, [roster, className, search]);

  function loginMessage(code?: string) {
    if (code === "LOCKED") return "Terlalu banyak percobaan PIN. Tunggu 15 menit atau hubungi Guru BK.";
    if (code === "SESSION_ALREADY_LINKED") return "Sesi ini sudah terhubung ke siswa lain. Keluar dari Student Portal lalu coba lagi.";
    if (code === "AUTH_REQUIRED") return "Sesi siswa belum aktif. Muat ulang halaman lalu coba lagi.";
    if (code === "INVALID") return "Nama atau PIN belum benar. Periksa kembali PIN 6 digitmu.";
    return "Login siswa belum dapat diproses. Coba lagi atau hubungi Guru BK.";
  }

  async function ensureAnonymousSession() {
    const { data: current } = await supabase.auth.getSession();
    const currentUser = current.session?.user;

    if (currentUser) {
      const { data: existingLink } = await supabase
        .from("student_auth_links")
        .select("student_id")
        .eq("auth_user_id", currentUser.id)
        .maybeSingle();

      if (existingLink?.student_id) {
        router.replace("/student");
        return false;
      }

      if (!currentUser.is_anonymous) {
        setStaffSessionActive(true);
        throw new Error("Sesi Guru BK sedang aktif. Gunakan perangkat atau profil browser siswa agar data kedua peran tidak tercampur.");
      }

      return true;
    }

    const { data, error } = await supabase.auth.signInAnonymously();

    if (error) {
      console.error("STUDENT_ANON_SIGNIN_FAILED", {
        name: error.name,
        message: error.message,
        status: "status" in error ? error.status : undefined,
        code: "code" in error ? error.code : undefined,
      });
      throw new Error(`Anonymous sign-in gagal: ${error.message}`);
    }

    console.info("STUDENT_ANON_SIGNIN_OK", {
      userId: data.user?.id ?? null,
      isAnonymous: data.user?.is_anonymous ?? null,
    });

    return true;
  }

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    if (staffSessionActive) return;
    if (!className) { setMessage("Pilih kelas terlebih dahulu."); return; }
    if (!studentId) { setMessage("Pilih nama siswa terlebih dahulu."); return; }
    if (!/^\d{6}$/.test(pin)) { setMessage("PIN harus terdiri dari 6 angka."); return; }

    setLoading(true);
    try {
      const ready = await ensureAnonymousSession();
      if (!ready) return;

      const { data, error } = await supabase.rpc("verify_student_pin_login", {
        p_student_id: studentId,
        p_pin: pin,
      });
      if (error) throw error;

      const verify = (Array.isArray(data) ? data[0] : data) as VerifyRow | null;
      if (!verify?.ok) throw new Error(loginMessage(verify?.code));

      setPin("");
      router.replace("/student");
      router.refresh();
    } catch (error) {
      setMessage(toUserMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return <main className="student-login-stage61">
    <section className="student-login-stage61-shell">
      <header className="student-login-stage61-brand">
        <BrandLogo compact className="student-login-stage61-logo" />
        <div>
          <p className="stage6-kicker">BINA INSAN LIFEMAP</p>
          <h1>Portal Siswa</h1>
          <p>Ruang pribadi untuk asesmen, Action Plan, BK Karier, dan perkembanganmu.</p>
        </div>
      </header>

      <div className="student-login-stage61-card">
        <div className="student-login-stage61-intro">
          <div>
            <span>AKSES SISWA</span>
            <h2>Masuk dengan nama dan PIN</h2>
            <p>Pilih kelas dan namamu, lalu masukkan PIN 6 digit yang diberikan Guru BK.</p>
          </div>
          <ShieldCheck size={24} aria-hidden="true" />
        </div>

        <div className="student-login-privacy"><ShieldCheck size={17}/><span>Jawabanmu digunakan untuk pendampingan BK, bukan untuk memberi label atau ranking siswa.</span></div>

        <form onSubmit={signIn} className="student-login-form-stage61">
          <label className="student-login-field">Pilih kelas
            <div className="student-login-control student-login-control-select">
              <select value={className} onChange={(e)=>{setClassName(e.target.value);setStudentId("");setSearch("");}} disabled={loadingRoster || loading} required>
                <option value="">Pilih kelas</option>
                {classes.map((name)=><option key={name} value={name}>{name}</option>)}
              </select>
            </div>
          </label>

          <label className="student-login-field">Cari nama siswa
            <div className="student-login-control"><Search size={18}/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Ketik nama siswa..." disabled={!className || loading}/></div>
          </label>

          <label className="student-login-field">Nama siswa
            <div className="student-login-control student-login-control-select"><UserRound size={18}/><select value={studentId} onChange={(e)=>setStudentId(e.target.value)} disabled={!className || loading} required>
              <option value="">Pilih nama</option>
              {students.map((student)=><option key={student.student_id} value={student.student_id}>{student.full_name}</option>)}
            </select></div>
          </label>

          <label className="student-login-field">PIN 6 angka
            <div className="student-login-control"><LockKeyhole size={18}/><input value={pin} onChange={(e)=>setPin(e.target.value.replace(/\D/g,"").slice(0,6))} inputMode="numeric" type="password" pattern="[0-9]{6}" maxLength={6} placeholder="••••••" autoComplete="one-time-code" required/></div>
          </label>

          <button className="student-login-submit" disabled={loading || loadingRoster || !studentId || staffSessionActive}>{loading ? "Memproses..." : "Masuk ke Portal Siswa"}</button>
        </form>

        {loadingRoster && <p className="student-login-helper">Memuat daftar siswa...</p>}
        {staffSessionActive && <div className="student-session-notice"><ShieldCheck size={19}/><div><strong>Mode Guru BK sedang aktif</strong><p>Untuk menjaga data kedua peran tetap terpisah, Portal Siswa dibuka dari perangkat atau profil browser yang tidak sedang login sebagai Guru BK.</p><Link href="/">Kembali ke dashboard Guru BK</Link></div></div>}
        {message && !staffSessionActive && <p className="auth-message">{message}</p>}
      </div>

      <footer className="student-login-stage61-footer"><span>Bina Insan Palu High School</span><span>Student Development Platform</span></footer>
    </section>
  </main>;
}
