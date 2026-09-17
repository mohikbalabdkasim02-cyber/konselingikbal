"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toUserMessage } from "@/lib/errors";

export default function StudentLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function valid() {
    if (!email.trim()) { setMessage("Masukkan email siswa yang terdaftar di sekolah."); return false; }
    if (!/^\d{6}$/.test(pin)) { setMessage("PIN harus terdiri dari 6 angka."); return false; }
    return true;
  }

  async function claimAndOpen() {
    const { error } = await supabase.rpc("claim_student_account");
    if (error) {
      const raw = error.message || "";
      if (raw.includes("STUDENT_EMAIL_NOT_FOUND")) throw new Error("Email ini belum cocok dengan data siswa aktif. Hubungi Guru BK untuk mengecek email siswa.");
      if (raw.includes("STUDENT_EMAIL_NOT_UNIQUE")) throw new Error("Email ini dipakai lebih dari satu data siswa. Hubungi Guru BK untuk memperbaiki data terlebih dahulu.");
      if (raw.includes("STUDENT_ALREADY_LINKED")) throw new Error("Data siswa ini sudah terhubung ke akun lain. Hubungi Guru BK.");
      throw error;
    }
    router.replace("/student");
  }

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    if (!valid()) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: pin });
      if (error) throw new Error("Email atau PIN belum benar. Jika belum pernah aktivasi, gunakan tombol Aktifkan Akun Siswa.");
      await claimAndOpen();
    } catch (error) {
      setMessage(toUserMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function activate() {
    setMessage("");
    if (!valid()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: pin,
        options: { data: { role: "student" } },
      });
      if (error) throw error;
      if (!data.session) {
        setMessage("Akun dibuat. Jika diminta, buka email verifikasi terlebih dahulu, lalu kembali dan masuk menggunakan PIN.");
        return;
      }
      await claimAndOpen();
    } catch (error) {
      setMessage(toUserMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return <main className="login-page student-login-page">
    <section className="login-panel student-login-panel">
      <div className="student-login-brand"><div className="brand-mark"><GraduationCap size={25}/></div><div><p className="eyebrow">BINA INSAN PALU</p><h1>Student Portal</h1></div></div>
      <p className="muted">Masuk dengan email siswa yang terdaftar di sekolah dan PIN 6 angka pribadi.</p>
      <div className="student-login-note"><ShieldCheck size={18}/><span>Asesmen digunakan untuk pendampingan BK, bukan untuk memberi label atau ranking siswa.</span></div>
      <form onSubmit={signIn} className="login-form">
        <label>Email siswa<div className="student-input-icon"><Mail size={17}/><input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="nama@email.com" autoComplete="email" required/></div></label>
        <label>PIN 6 angka<div className="student-input-icon"><LockKeyhole size={17}/><input value={pin} onChange={(e)=>setPin(e.target.value.replace(/\D/g,"").slice(0,6))} inputMode="numeric" type="password" pattern="[0-9]{6}" maxLength={6} placeholder="••••••" required/></div></label>
        <button className="primary-btn" disabled={loading}>{loading ? "Memproses..." : "Masuk ke Student Portal"}</button>
        <button type="button" className="ghost-btn" onClick={activate} disabled={loading}>Aktifkan Akun Siswa</button>
      </form>
      {message && <p className="auth-message">{message}</p>}
    </section>
  </main>;
}
