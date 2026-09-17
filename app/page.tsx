"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ChevronRight, ClipboardList, Home, LogOut, Search, ShieldCheck, UserRound, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { BrandLogo } from "@/components/brand/BrandLogo";

const ADMIN_EMAIL = "mohikbalabdkasim.02@gmail.com";

type Student = {
  id: string;
  full_name: string;
  gender: "L" | "P" | null;
  email: string | null;
  nis: string | null;
  nisn: string | null;
  classes: { name: string; slug: string; grade: number } | null;
  student_profiles: { journey_stage: string; expertise: string | null; career_direction: string | null } | null;
};

type StudentDocument = { student_id: string; status: string; latest_version: number };

export default function HomePage() {
  const [sessionReady, setSessionReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [pin, setPin] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [documents, setDocuments] = useState<Record<string, StudentDocument>>({});
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");
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
    setAuthMessage("");
    const [studentsRes, docsRes] = await Promise.all([
      supabase
        .from("students")
        .select("id,full_name,gender,email,nis,nisn,classes(name,slug,grade),student_profiles(journey_stage,expertise,career_direction)")
        .eq("is_active", true)
        .order("full_name"),
      supabase
        .from("student_documents")
        .select("student_id,status,latest_version")
        .eq("document_type", "proposal_hidup"),
    ]);
    if (studentsRes.error) setAuthMessage(studentsRes.error.message);
    else setStudents((studentsRes.data ?? []) as unknown as Student[]);
    if (!docsRes.error) {
      setDocuments(
        Object.fromEntries(((docsRes.data ?? []) as StudentDocument[]).map((item) => [item.student_id, item])),
      );
    }
    setLoading(false);
  }

  function validatePin() {
    if (!/^\d{6}$/.test(pin)) {
      setAuthMessage("PIN harus terdiri dari 6 angka.");
      return false;
    }
    return true;
  }

  async function signIn(e: FormEvent) {
    e.preventDefault();
    setAuthMessage("");
    if (!validatePin()) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password: pin });
    if (error) setAuthMessage("PIN salah atau akun belum diaktifkan.");
    setLoading(false);
  }

  async function activateAccount() {
    setAuthMessage("");
    if (!validatePin()) return;
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: ADMIN_EMAIL,
      password: pin,
      options: { data: { full_name: "Moh Ikbal Abd Kasim" } },
    });
    setAuthMessage(
      error
        ? error.message
        : "PIN berhasil didaftarkan. Jika Supabase meminta verifikasi email, buka email sekali saja lalu kembali dan masuk memakai PIN.",
    );
    setLoading(false);
  }

  const classes = useMemo(
    () =>
      [...new Map(students.filter((s) => s.classes).map((s) => [s.classes!.slug, s.classes!])).values()].sort(
        (a, b) => a.grade - b.grade || a.name.localeCompare(b.name),
      ),
    [students],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter((student) => {
      const matchesQuery =
        !q ||
        [student.full_name, student.email, student.nis, student.nisn, student.student_profiles?.career_direction].some(
          (value) => value?.toLowerCase().includes(q),
        );
      const matchesClass = classFilter === "all" || student.classes?.slug === classFilter;
      const matchesGrade = gradeFilter === "all" || String(student.classes?.grade) === gradeFilter;
      return matchesQuery && matchesClass && matchesGrade;
    });
  }, [students, query, classFilter, gradeFilter]);

  const counts = {
    x: students.filter((s) => s.classes?.grade === 10).length,
    xi: students.filter((s) => s.classes?.grade === 11).length,
    xii: students.filter((s) => s.classes?.grade === 12).length,
  };
  const mapped = students.filter(
    (s) => s.student_profiles?.journey_stage && s.student_profiles.journey_stage !== "belum_dipetakan",
  ).length;
  const proposalCount = Object.values(documents).filter((d) => d.latest_version > 0 && d.status !== "archived").length;

  if (!sessionReady) {
    return (
      <main className="center-screen">
        <div className="loader" />
      </main>
    );
  }

  if (!loggedIn) {
    return (
      <main className="stage6-login">
        <section className="stage6-login-brand">
          <BrandLogo />
          <div className="stage6-login-message">
            <p className="stage6-kicker">BINA INSAN PALU HIGH SCHOOL</p>
            <h1>LifeMap untuk pendampingan siswa yang lebih terarah.</h1>
            <p>
              Satu ruang untuk Proposal Hidup, Life Map, asesmen BK, eksplorasi karier, Action Plan,
              konsultasi, follow-up, dan perkembangan siswa.
            </p>
          </div>
          <p className="stage6-login-note">Student Development Platform · Tahun Ajaran 2026/2027</p>
        </section>

        <section className="stage6-login-form-wrap">
          <div className="stage6-login-card">
            <p className="stage6-kicker">AKSES GURU BK</p>
            <h2>Masuk ke dashboard</h2>
            <p>Gunakan PIN admin 6 digit. Siswa memakai Portal Siswa dengan nama dan PIN masing-masing.</p>
            <form onSubmit={signIn} className="stage6-login-form">
              <label>
                PIN Admin
                <input
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="current-password"
                  type="password"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="••••••"
                  required
                />
              </label>
              <button className="primary-btn" disabled={loading}>
                {loading ? "Memproses..." : "Masuk sebagai Guru BK"}
              </button>
              <button type="button" className="ghost-btn" onClick={activateAccount} disabled={loading}>
                Aktifkan PIN Pertama Kali
              </button>
            </form>
            <Link href="/student/login" className="stage6-login-student">
              <span>
                Portal Siswa
                <small>Pilih kelas, nama, lalu masukkan PIN siswa.</small>
              </span>
              <ChevronRight size={20} />
            </Link>
            {authMessage && <p className="auth-message">{authMessage}</p>}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="stage6-shell">
      <aside className="stage6-sidebar">
        <div className="stage6-sidebar-brand">
          <BrandLogo compact />
        </div>
        <nav className="stage6-nav" aria-label="Navigasi utama">
          <a href="#ringkasan" className="active">
            <Home /> Ringkasan
          </a>
          <a href="#siswa">
            <Users /> Daftar Siswa
          </a>
          <Link href="/counseling">
            <ClipboardList /> BK Control Center
          </Link>
          <Link href="/student/login">
            <UserRound /> Portal Siswa
          </Link>
        </nav>
        <div className="stage6-sidebar-foot">
          <div className="stage6-school-year">
            <span>TAHUN AJARAN</span>
            <strong>2026/2027</strong>
          </div>
          <nav className="stage6-nav">
            <button onClick={() => supabase.auth.signOut()}>
              <LogOut /> Keluar
            </button>
          </nav>
        </div>
      </aside>

      <section className="stage6-main">
        <header className="stage6-topbar">
          <div className="stage6-topbar-copy">
            <strong>Student Development Platform</strong>
            <span>Bina Insan Palu High School</span>
          </div>
          <label className="stage6-search">
            <Search size={18} />
            <input
              aria-label="Cari siswa"
              placeholder="Cari nama siswa, NIS, atau arah karier..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </header>

        <div className="stage6-content">
          <section className="stage6-hero" id="ringkasan">
            <div className="stage6-hero-copy">
              <p className="stage6-kicker">LIFEMAP 360° · DATA TERHUBUNG</p>
              <h1>Pendampingan siswa yang jelas dari data menuju tindakan.</h1>
              <p>
                Pantau perjalanan siswa dari Proposal Hidup dan Life Map sampai asesmen, karier,
                Action Plan, konsultasi, follow-up, dan outcome dalam satu alur yang mudah dipahami.
              </p>
            </div>
            <div className="stage6-hero-actions">
              <Link href="/student/login" className="stage6-primary-link">
                <UserRound size={18} /> Portal Siswa
              </Link>
              <Link href="/counseling" className="stage6-secondary-link">
                <ShieldCheck size={18} /> BK Control Center
              </Link>
            </div>
          </section>

          <section className="stage6-stat-grid" aria-label="Ringkasan data siswa">
            <SummaryStat title="Total siswa" value={students.length} note="Siswa aktif" />
            <SummaryStat title="Proposal masuk" value={proposalCount} note="Proposal Hidup tersimpan" />
            <SummaryStat title="Sudah dipetakan" value={mapped} note="Journey stage terisi" />
            <SummaryStat title="Kelas XII" value={counts.xii} note="Siswa tingkat akhir" />
          </section>

          <section className="stage6-directory" id="siswa">
            <div className="stage6-directory-head">
              <div>
                <p className="stage6-kicker">STUDENT DIRECTORY</p>
                <h2>Daftar Siswa</h2>
                <p>Pilih siswa untuk membuka ringkasan Life & Career Workspace.</p>
              </div>
              <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} aria-label="Filter rombel">
                <option value="all">Semua rombel</option>
                {classes
                  .filter((c) => gradeFilter === "all" || String(c.grade) === gradeFilter)
                  .map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="stage6-filter-row" aria-label="Filter tingkat">
              <button className={gradeFilter === "all" ? "active" : ""} onClick={() => { setGradeFilter("all"); setClassFilter("all"); }}>
                Semua {students.length}
              </button>
              <button className={gradeFilter === "10" ? "active" : ""} onClick={() => { setGradeFilter("10"); setClassFilter("all"); }}>
                Kelas X {counts.x}
              </button>
              <button className={gradeFilter === "11" ? "active" : ""} onClick={() => { setGradeFilter("11"); setClassFilter("all"); }}>
                Kelas XI {counts.xi}
              </button>
              <button className={gradeFilter === "12" ? "active" : ""} onClick={() => { setGradeFilter("12"); setClassFilter("all"); }}>
                Kelas XII {counts.xii}
              </button>
            </div>

            <div className="stage6-student-list">
              {loading ? (
                <div className="stage6-empty">Memuat data siswa...</div>
              ) : (
                filtered.map((student) => (
                  <button key={student.id} className="stage6-student-row" onClick={() => setSelected(student)}>
                    <div className="stage6-avatar">{student.full_name.slice(0, 2).toUpperCase()}</div>
                    <div className="stage6-student-copy">
                      <strong>{student.full_name}</strong>
                      <span>
                        {student.classes?.name ?? "Kelas belum tersedia"} · {student.student_profiles?.career_direction || "Arah karier belum diisi"}
                      </span>
                    </div>
                    <div className="stage6-row-meta">
                      <span className={`stage6-proposal-badge ${documents[student.id]?.latest_version ? "ready" : ""}`}>
                        {documents[student.id]?.latest_version ? `Proposal v${documents[student.id].latest_version}` : "Belum ada proposal"}
                      </span>
                      <ChevronRight size={18} />
                    </div>
                  </button>
                ))
              )}
              {!loading && filtered.length === 0 && <div className="stage6-empty">Tidak ada siswa yang cocok dengan filter.</div>}
            </div>
          </section>
        </div>
      </section>

      {selected && (
        <div className="drawer-backdrop" onClick={() => setSelected(null)}>
          <aside className="student-drawer" onClick={(e) => e.stopPropagation()}>
            <button className="drawer-close" onClick={() => setSelected(null)} aria-label="Tutup ringkasan siswa">×</button>
            <div className="drawer-avatar">{selected.full_name.slice(0, 2).toUpperCase()}</div>
            <p className="eyebrow">QUICK VIEW</p>
            <h2>{selected.full_name}</h2>
            <p className="muted">{selected.classes?.name}</p>
            <div className="detail-grid">
              <Detail label="Expertise" value={selected.student_profiles?.expertise || "Belum diisi"} />
              <Detail label="Arah karier" value={selected.student_profiles?.career_direction || "Belum diisi"} />
              <Detail label="Proposal" value={documents[selected.id]?.latest_version ? `Versi ${documents[selected.id].latest_version}` : "Belum upload"} />
              <Detail label="Status" value={formatStage(selected.student_profiles?.journey_stage)} />
            </div>
            <Link href={`/students/${selected.id}`} className="open-profile-btn">
              Buka Life & Career Workspace <ChevronRight size={18} />
            </Link>
          </aside>
        </div>
      )}
    </main>
  );
}

function SummaryStat({ title, value, note }: { title: string; value: number; note: string }) {
  return (
    <article className="stage6-stat">
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatStage(stage?: string | null) {
  const labels: Record<string, string> = {
    belum_dipetakan: "Belum dipetakan",
    eksplorasi: "Eksplorasi",
    sudah_punya_arah: "Sudah punya arah",
    persiapan: "Persiapan",
    on_track: "On track",
    perlu_pendampingan: "Perlu pendampingan",
  };
  return stage ? labels[stage] || stage : "Belum dipetakan";
}
