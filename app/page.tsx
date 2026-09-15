"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronRight, GraduationCap, LogOut, Search, ShieldCheck, Sparkles, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";

const CLASS_LABELS: Record<string, string> = {
  "x-abu-bakar": "X Abu Bakar",
  "x-umar-bin-khattab": "X Umar Bin Khattab",
};

type Student = {
  id: string;
  full_name: string;
  gender: "L" | "P" | null;
  email: string | null;
  nis: string | null;
  nisn: string | null;
  classes: { name: string; slug: string } | null;
  student_profiles: { journey_stage: string; expertise: string | null; career_direction: string | null } | null;
};

export default function HomePage() {
  const [sessionReady, setSessionReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [email, setEmail] = useState("mohikbalabdkasim.02@gmail.com");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [selected, setSelected] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const active = Boolean(data.session);
      setLoggedIn(active);
      setSessionReady(true);
      if (active) loadStudents();
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const active = Boolean(session);
      setLoggedIn(active);
      if (active) loadStudents();
      else setStudents([]);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function loadStudents() {
    setLoading(true);
    const { data, error } = await supabase
      .from("students")
      .select("id,full_name,gender,email,nis,nisn,classes(name,slug),student_profiles(journey_stage,expertise,career_direction)")
      .eq("is_active", true)
      .order("full_name");

    if (!error && data) setStudents(data as unknown as Student[]);
    if (error) setAuthMessage(error.message);
    setLoading(false);
  }

  async function signIn(e: FormEvent) {
    e.preventDefault();
    setAuthMessage("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthMessage(error.message);
    setLoading(false);
  }

  async function activateAccount() {
    setAuthMessage("");
    if (!password || password.length < 8) {
      setAuthMessage("Gunakan password minimal 8 karakter untuk aktivasi akun pertama.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: "Moh Ikbal Abd Kasim" } } });
    setAuthMessage(error ? error.message : "Akun dibuat. Jika verifikasi email aktif, cek inbox lalu login.");
    setLoading(false);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter((student) => {
      const matchesQuery = !q || [student.full_name, student.email, student.nis, student.nisn].some((v) => v?.toLowerCase().includes(q));
      const matchesClass = classFilter === "all" || student.classes?.slug === classFilter;
      return matchesQuery && matchesClass;
    });
  }, [students, query, classFilter]);

  const abu = students.filter((s) => s.classes?.slug === "x-abu-bakar").length;
  const umar = students.filter((s) => s.classes?.slug === "x-umar-bin-khattab").length;
  const mapped = students.filter((s) => s.student_profiles?.journey_stage !== "belum_dipetakan").length;

  if (!sessionReady) return <main className="center-screen"><div className="loader" /></main>;

  if (!loggedIn) {
    return (
      <main className="login-page">
        <section className="login-panel">
          <div className="brand-mark">BI</div>
          <p className="eyebrow">BINA INSAN PALU</p>
          <h1>LifeMap</h1>
          <p className="muted">Dashboard pemantauan siswa, arah karier, dan pendampingan BK.</p>
          <form onSubmit={signIn} className="login-form">
            <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required /></label>
            <label>Password<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required /></label>
            <button className="primary-btn" disabled={loading}>{loading ? "Memproses..." : "Masuk"}</button>
            <button type="button" className="ghost-btn" onClick={activateAccount} disabled={loading}>Aktivasi akun pertama</button>
          </form>
          {authMessage && <p className="auth-message">{authMessage}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-row"><div className="brand-mark small">BI</div><div><strong>Bina Insan LifeMap</strong><span>Student & Career Dashboard</span></div></div>
        <div className="top-actions">
          <div className="search-box"><Search size={18}/><input placeholder="Cari siswa, NIS, email..." value={query} onChange={(e) => setQuery(e.target.value)} /></div>
          <button className="icon-btn" onClick={() => supabase.auth.signOut()} title="Keluar"><LogOut size={18}/></button>
        </div>
      </header>

      <div className="workspace">
        <section className="main-column">
          <div className="hero-row">
            <div><p className="eyebrow">TAHUN AJARAN 2026/2027</p><h1>Overview Siswa</h1><p className="muted">Fondasi data siswa Bina Insan Palu sudah aktif dan terhubung ke Supabase.</p></div>
            <span className="status-pill"><ShieldCheck size={16}/> Database aktif</span>
          </div>

          <div className="stats-grid">
            <Stat title="Total siswa" value={students.length || 52} icon={<Users size={20}/>} />
            <Stat title="X Abu Bakar" value={abu || 27} icon={<GraduationCap size={20}/>} />
            <Stat title="X Umar Bin Khattab" value={umar || 25} icon={<GraduationCap size={20}/>} />
            <Stat title="Sudah dipetakan" value={mapped} icon={<Sparkles size={20}/>} />
          </div>

          <section className="panel">
            <div className="panel-head"><div><p className="eyebrow">STUDENT DIRECTORY</p><h2>Daftar Siswa</h2></div><select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}><option value="all">Semua kelas</option><option value="x-abu-bakar">X Abu Bakar</option><option value="x-umar-bin-khattab">X Umar Bin Khattab</option></select></div>
            <div className="student-list">
              {loading ? <p className="muted">Memuat data...</p> : filtered.map((student) => (
                <button key={student.id} className="student-row" onClick={() => setSelected(student)}>
                  <div className="avatar">{student.full_name.slice(0,2).toUpperCase()}</div>
                  <div className="student-main"><strong>{student.full_name}</strong><span>{student.classes?.name ?? "Kelas belum tersedia"} · {student.gender === "L" ? "Laki-laki" : student.gender === "P" ? "Perempuan" : "-"}</span></div>
                  <div className="student-meta"><span>{student.student_profiles?.journey_stage === "belum_dipetakan" ? "Belum dipetakan" : student.student_profiles?.journey_stage}</span><ChevronRight size={18}/></div>
                </button>
              ))}
              {!loading && filtered.length === 0 && <div className="empty-state">Tidak ada siswa yang cocok dengan pencarian.</div>}
            </div>
          </section>
        </section>

        <aside className="side-column">
          <div className="side-card accent-card"><p className="eyebrow">RINGKASAN</p><h2>52 siswa siap dipantau</h2><p>Dua kelas sudah menjadi data master awal. Tahap berikutnya akan menambahkan proposal Word/PDF, Life Map, dan Career Map.</p></div>
          <div className="side-card"><div className="side-title"><CalendarDays size={18}/><strong>Agenda BK</strong></div><p className="muted">Modul konseling dan follow-up akan diaktifkan pada tahap berikutnya.</p><div className="timeline-placeholder"><span></span><span></span><span></span></div></div>
          <div className="side-card"><p className="eyebrow">KELAS</p><div className="class-breakdown"><div><span>X Abu Bakar</span><strong>{abu || 27}</strong></div><div><span>X Umar Bin Khattab</span><strong>{umar || 25}</strong></div></div></div>
        </aside>
      </div>

      {selected && <div className="drawer-backdrop" onClick={() => setSelected(null)}><aside className="student-drawer" onClick={(e) => e.stopPropagation()}><button className="drawer-close" onClick={() => setSelected(null)}>×</button><div className="drawer-avatar">{selected.full_name.slice(0,2).toUpperCase()}</div><p className="eyebrow">DETAIL SISWA</p><h2>{selected.full_name}</h2><p className="muted">{selected.classes?.name}</p><div className="detail-grid"><Detail label="NIS" value={selected.nis || "Belum valid"}/><Detail label="NISN" value={selected.nisn || "Belum valid"}/><Detail label="Email" value={selected.email || "-"}/><Detail label="Status" value={selected.student_profiles?.journey_stage === "belum_dipetakan" ? "Belum dipetakan" : selected.student_profiles?.journey_stage || "-"}/></div><div className="coming-card"><Sparkles size={18}/><div><strong>Profil Life & Career</strong><p>Expertise, target karier, proposal, milestone, dan roadmap akan tampil di sini pada Tahap 2.</p></div></div></aside></div>}
    </main>
  );
}

function Stat({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
  return <div className="stat-card"><div className="stat-icon">{icon}</div><div><span>{title}</span><strong>{value}</strong></div></div>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="detail-item"><span>{label}</span><strong>{value}</strong></div>;
}
