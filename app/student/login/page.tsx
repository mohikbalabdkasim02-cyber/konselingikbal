"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, LockKeyhole, Search, ShieldCheck, UserRound } from "lucide-react";
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

  useEffect(() => { void bootstrap(); }, []);

  async function bootstrap() {
    setLoadingRoster(true);
    setMessage("");
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
        throw new Error("Akun Guru BK sedang aktif di browser ini. Gunakan perangkat/tab siswa yang tidak sedang login sebagai Guru BK.");
      }

      return true;
    }

    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      const detail = error.message?.toLowerCase() ?? "";
      if (detail.includes("anonymous") || detail.includes("disabled")) {
        throw new Error("Akses siswa belum aktif di server. Hubungi Guru BK untuk mengaktifkan login siswa.");
      }
      throw error;
    }
    return true;
  }

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setMessage("");
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

  return <main className="login-page student-login-page">
    <section className="login-panel student-login-panel">
      <div className="student-login-brand"><div className="brand-mark"><GraduationCap size={25}/></div><div><p className="eyebrow">BINA INSAN PALU</p><h1>Portal Asesmen Siswa</h1></div></div>
      <p className="muted">Pilih kelas dan namamu, lalu masukkan PIN 6 digit yang diberikan Guru BK.</p>
      <div className="student-login-note"><ShieldCheck size={18}/><span>Jawaban asesmen digunakan untuk pendampingan BK, bukan untuk memberi label atau ranking siswa.</span></div>

      <form onSubmit={signIn} className="login-form">
        <label>Pilih kelas
          <select value={className} onChange={(e)=>{setClassName(e.target.value);setStudentId("");setSearch("");}} disabled={loadingRoster || loading} required>
            <option value="">Pilih kelas</option>
            {classes.map((name)=><option key={name} value={name}>{name}</option>)}
          </select>
        </label>

        <label>Cari nama siswa
          <div className="student-input-icon"><Search size={17}/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Ketik nama..." disabled={!className || loading}/></div>
        </label>

        <label>Nama siswa
          <div className="student-input-icon"><UserRound size={17}/><select value={studentId} onChange={(e)=>setStudentId(e.target.value)} disabled={!className || loading} required>
            <option value="">Pilih nama</option>
            {students.map((student)=><option key={student.student_id} value={student.student_id}>{student.full_name}</option>)}
          </select></div>
        </label>

        <label>PIN 6 angka
          <div className="student-input-icon"><LockKeyhole size={17}/><input value={pin} onChange={(e)=>setPin(e.target.value.replace(/\D/g,"").slice(0,6))} inputMode="numeric" type="password" pattern="[0-9]{6}" maxLength={6} placeholder="••••••" autoComplete="one-time-code" required/></div>
        </label>

        <button className="primary-btn" disabled={loading || loadingRoster || !studentId}>{loading ? "Memproses..." : "Masuk ke Student Portal"}</button>
      </form>
      {loadingRoster && <p className="muted">Memuat daftar siswa...</p>}
      {message && <p className="auth-message">{message}</p>}
    </section>
  </main>;
}
