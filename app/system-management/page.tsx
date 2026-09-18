"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  Upload,
  UserRound,
  Users,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toUserMessage } from "@/lib/errors";
import { downloadStudentReportPdf, loadStudentReportBundle, loadGroupReportSummary, downloadGroupSummaryPdf, loadComprehensiveGroupBundles, downloadComprehensiveGroupPdf } from "@/lib/student-report";
import "./system-management.css";

type Tab = "overview" | "students" | "classes" | "import" | "reports" | "settings";
type AcademicYear = { id: string; name: string; starts_on: string | null; ends_on: string | null; is_active: boolean };
type ClassRow = { id: string; academic_year_id: string; name: string; grade: number; slug: string; is_active?: boolean };
type StudentRow = {
  id: string;
  class_id: string;
  nis: string | null;
  nisn: string | null;
  full_name: string;
  gender: string | null;
  email: string | null;
  is_active: boolean;
  classes?: { name?: string | null; grade?: number | null } | null;
};
type ImportRow = {
  full_name: string;
  class_name: string;
  grade?: number;
  nis?: string;
  nisn?: string;
  gender?: "L" | "P";
  email?: string;
};
type GeneratedAccess = { student_id: string; full_name: string; class_name: string; pin: string };
type ImportResult = {
  row_count: number;
  created: number;
  updated: number;
  skipped: number;
  errors?: Array<{ row?: number; message?: string }>;
  generated_access?: GeneratedAccess[];
};
type SchoolSettings = {
  school_name: string;
  platform_name: string;
  report_title: string;
  report_footer: string;
};

const DEFAULT_SETTINGS: SchoolSettings = {
  school_name: "Bina Insan Palu High School",
  platform_name: "Bina Insan LifeMap",
  report_title: "Laporan Pendampingan Siswa",
  report_footer: "Dokumen internal pendampingan BK. Gunakan sesuai kewenangan dan jaga kerahasiaan data siswa.",
};

const emptyStudent = { id: "", full_name: "", class_id: "", nis: "", nisn: "", gender: "", email: "", is_active: true };
const emptyClass = { id: "", name: "", grade: "10", slug: "" };

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "kelas";
}

export default function SystemManagementPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [settings, setSettings] = useState<SchoolSettings>(DEFAULT_SETTINGS);
  const [importJobs, setImportJobs] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [denied, setDenied] = useState(false);
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [showInactive, setShowInactive] = useState(false);

  const [studentForm, setStudentForm] = useState({ ...emptyStudent });
  const [classForm, setClassForm] = useState({ ...emptyClass });
  const [yearForm, setYearForm] = useState({ name: "", starts_on: "", ends_on: "" });
  const [generatedPin, setGeneratedPin] = useState<{ name: string; pin: string } | null>(null);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [generatedAccess, setGeneratedAccess] = useState<GeneratedAccess[]>([]);

  const [reportClass, setReportClass] = useState("all");
  const [reportMode, setReportMode] = useState<"summary"|"comprehensive">("summary");
  const [reporting, setReporting] = useState(false);
  const [reportProgress, setReportProgress] = useState("");

  useEffect(() => { void bootstrap(); }, []);

  async function bootstrap() {
    setLoading(true);
    setMessage("");
    setDenied(false);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setDenied(true);
        setMessage("Silakan masuk sebagai Guru BK/staff terlebih dahulu.");
        return;
      }
      const staff = await supabase.rpc("is_staff");
      if (staff.error || staff.data !== true) {
        setDenied(true);
        setMessage("Manajemen Sistem hanya tersedia untuk Guru BK/staff.");
        return;
      }
      await loadAll();
    } catch (error) {
      setMessage(toUserMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function loadAll() {
    setLoading(true);
    try {
      const [yearRes, classRes, studentRes, settingRes, jobsRes] = await Promise.all([
        supabase.from("academic_years").select("id,name,starts_on,ends_on,is_active").order("starts_on", { ascending: false }),
        supabase.from("classes").select("id,academic_year_id,name,grade,slug,is_active").order("grade").order("name"),
        supabase.from("students").select("id,class_id,nis,nisn,full_name,gender,email,is_active,classes(name,grade)").order("full_name"),
        supabase.from("system_settings").select("value").eq("key", "school_profile").maybeSingle(),
        supabase.from("student_import_jobs").select("id,file_name,file_type,status,row_count,created_count,updated_count,skipped_count,created_at").order("created_at", { ascending: false }).limit(12),
      ]);
      const err = yearRes.error || classRes.error || studentRes.error;
      if (err) throw err;
      setYears((yearRes.data ?? []) as AcademicYear[]);
      setClasses((classRes.data ?? []) as ClassRow[]);
      setStudents((studentRes.data ?? []) as unknown as StudentRow[]);
      const value = settingRes.data?.value;
      if (value && typeof value === "object") setSettings({ ...DEFAULT_SETTINGS, ...(value as Partial<SchoolSettings>) });
      setImportJobs((jobsRes.data ?? []) as Record<string, unknown>[]);
    } finally {
      setLoading(false);
    }
  }

  const activeYear = years.find((year) => year.is_active) ?? years[0];
  const activeClasses = useMemo(() => classes.filter((row) => row.academic_year_id === activeYear?.id && row.is_active !== false), [classes, activeYear]);
  const classCounts = useMemo(() => {
    const map = new Map<string, number>();
    students.filter((s) => s.is_active).forEach((s) => map.set(s.class_id, (map.get(s.class_id) ?? 0) + 1));
    return map;
  }, [students]);

  const filteredStudents = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return students.filter((student) => {
      if (!showInactive && !student.is_active) return false;
      if (classFilter !== "all" && student.class_id !== classFilter) return false;
      if (!needle) return true;
      return [student.full_name, student.nis, student.nisn, student.email, student.classes?.name]
        .some((value) => value?.toLowerCase().includes(needle));
    });
  }, [students, query, classFilter, showInactive]);

  const stats = useMemo(() => ({
    students: students.filter((s) => s.is_active).length,
    classes: activeClasses.length,
    inactive: students.filter((s) => !s.is_active).length,
    imports: importJobs.length,
  }), [students, activeClasses, importJobs]);

  async function saveStudent(event: FormEvent) {
    event.preventDefault();
    if (!studentForm.full_name.trim() || !studentForm.class_id) return setMessage("Nama dan kelas wajib diisi.");
    setSaving(true); setMessage(""); setGeneratedPin(null);
    try {
      const payload = {
        full_name: studentForm.full_name.trim(),
        class_id: studentForm.class_id,
        nis: studentForm.nis.trim() || null,
        nisn: studentForm.nisn.trim() || null,
        gender: studentForm.gender || null,
        email: studentForm.email.trim().toLowerCase() || null,
        is_active: true,
        updated_at: new Date().toISOString(),
      };
      let studentId = studentForm.id;
      let isNew = false;
      if (studentId) {
        const { error } = await supabase.from("students").update(payload).eq("id", studentId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("students").insert(payload).select("id").single();
        if (error) throw error;
        studentId = data.id;
        isNew = true;
      }

      if (activeYear?.id) {
        const { error } = await supabase.from("student_enrollments").upsert({
          student_id: studentId,
          academic_year_id: activeYear.id,
          class_id: studentForm.class_id,
          is_current: true,
          started_at: new Date().toISOString().slice(0, 10),
          updated_at: new Date().toISOString(),
        }, { onConflict: "student_id,academic_year_id" });
        if (error) throw error;
      }

      if (isNew) {
        const { data, error } = await supabase.rpc("admin_generate_student_pin", { p_student_id: studentId });
        if (error) throw error;
        setGeneratedPin({ name: studentForm.full_name.trim(), pin: String(data) });
      }

      setMessage(studentForm.id ? "Data siswa berhasil diperbarui." : "Siswa berhasil ditambahkan dan akses Portal Siswa dibuat.");
      setStudentForm({ ...emptyStudent });
      await loadAll();
    } catch (error) {
      setMessage(toUserMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function toggleStudent(student: StudentRow) {
    const next = !student.is_active;
    const label = next ? "aktifkan kembali" : "arsipkan";
    if (!window.confirm(`Yakin ingin ${label} ${student.full_name}?`)) return;
    setSaving(true); setMessage("");
    try {
      const { error } = await supabase.from("students").update({ is_active: next, updated_at: new Date().toISOString() }).eq("id", student.id);
      if (error) throw error;
      await supabase.from("student_access_credentials").update({ is_active: next, updated_at: new Date().toISOString() }).eq("student_id", student.id);
      if (!next) await supabase.from("student_auth_links").delete().eq("student_id", student.id);
      setMessage(next ? "Siswa diaktifkan kembali." : "Siswa diarsipkan. Riwayat asesmen dan pendampingan tetap tersimpan.");
      await loadAll();
    } catch (error) {
      setMessage(toUserMessage(error));
    } finally { setSaving(false); }
  }

  async function resetStudentPin(student: StudentRow) {
    if (!window.confirm(`Buat PIN baru untuk ${student.full_name}? Sesi Portal Siswa lama akan dilepas.`)) return;
    setSaving(true); setGeneratedPin(null); setMessage("");
    try {
      const { data, error } = await supabase.rpc("admin_generate_student_pin", { p_student_id: student.id });
      if (error) throw error;
      setGeneratedPin({ name: student.full_name, pin: String(data) });
      setMessage("PIN baru dibuat. Catat atau berikan ke siswa sekarang; PIN tidak disimpan sebagai teks biasa.");
    } catch (error) {
      setMessage(toUserMessage(error));
    } finally { setSaving(false); }
  }

  async function saveClass(event: FormEvent) {
    event.preventDefault();
    if (!activeYear?.id || !classForm.name.trim()) return setMessage("Tahun ajaran aktif dan nama kelas wajib tersedia.");
    setSaving(true); setMessage("");
    try {
      const payload = {
        academic_year_id: activeYear.id,
        name: classForm.name.trim(),
        grade: Number(classForm.grade),
        slug: classForm.slug.trim() || slugify(classForm.name),
        is_active: true,
        updated_at: new Date().toISOString(),
      };
      if (classForm.id) {
        const { error } = await supabase.from("classes").update(payload).eq("id", classForm.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("classes").insert(payload);
        if (error) throw error;
      }
      setMessage(classForm.id ? "Kelas berhasil diperbarui." : "Kelas baru berhasil ditambahkan.");
      setClassForm({ ...emptyClass });
      await loadAll();
    } catch (error) {
      setMessage(toUserMessage(error));
    } finally { setSaving(false); }
  }

  async function removeClass(row: ClassRow) {
    const count = classCounts.get(row.id) ?? 0;
    if (count > 0) return setMessage(`Kelas ${row.name} masih memiliki ${count} siswa aktif. Pindahkan atau arsipkan siswa terlebih dahulu.`);
    if (!window.confirm(`Hapus permanen kelas ${row.name}? Tindakan ini hanya diizinkan karena kelas tidak memiliki siswa aktif.`)) return;
    setSaving(true); setMessage("");
    try {
      const { error } = await supabase.from("classes").delete().eq("id", row.id);
      if (error) throw error;
      setMessage("Kelas berhasil dihapus.");
      await loadAll();
    } catch (error) {
      setMessage(toUserMessage(error));
    } finally { setSaving(false); }
  }

  async function createAcademicYear(event: FormEvent) {
    event.preventDefault();
    if (!yearForm.name.trim()) return setMessage("Nama tahun ajaran wajib diisi.");
    setSaving(true); setMessage("");
    try {
      const { error } = await supabase.from("academic_years").insert({
        name: yearForm.name.trim(),
        starts_on: yearForm.starts_on || null,
        ends_on: yearForm.ends_on || null,
        is_active: false,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      setYearForm({ name: "", starts_on: "", ends_on: "" });
      setMessage("Tahun ajaran baru berhasil ditambahkan.");
      await loadAll();
    } catch (error) {
      setMessage(toUserMessage(error));
    } finally { setSaving(false); }
  }

  async function setActiveYear(yearId: string) {
    if (!window.confirm("Jadikan tahun ajaran ini sebagai tahun ajaran aktif?")) return;
    setSaving(true); setMessage("");
    try {
      const off = await supabase.from("academic_years").update({ is_active: false, updated_at: new Date().toISOString() }).neq("id", yearId);
      if (off.error) throw off.error;
      const on = await supabase.from("academic_years").update({ is_active: true, updated_at: new Date().toISOString() }).eq("id", yearId);
      if (on.error) throw on.error;
      setMessage("Tahun ajaran aktif berhasil diperbarui.");
      await loadAll();
    } catch (error) {
      setMessage(toUserMessage(error));
    } finally { setSaving(false); }
  }

  async function previewImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;
    setImportFile(file); setImportRows([]); setImportWarnings([]); setGeneratedAccess([]); setMessage("");
    setImporting(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Sesi staff tidak tersedia.");
      const response = await fetch("/api/system/import-preview", { method: "POST", body: form, headers: { Authorization: `Bearer ${accessToken}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "File belum dapat dibaca.");
      setImportRows(data.rows ?? []);
      setImportWarnings(data.warnings ?? []);
      setMessage(`${data.rows?.length ?? 0} baris terbaca dari ${file.name}. Periksa preview sebelum menyimpan.`);
    } catch (error) {
      setMessage(toUserMessage(error));
    } finally { setImporting(false); }
  }

  async function commitImport() {
    if (!importRows.length || !importFile) return;
    if (!window.confirm(`Impor/update ${importRows.length} baris ke sistem? Data yang cocok akan diperbarui; data baru akan dibuat otomatis.`)) return;
    setImporting(true); setMessage(""); setGeneratedAccess([]);
    try {
      const { data, error } = await supabase.rpc("admin_import_students", {
        p_rows: importRows,
        p_file_name: importFile.name,
        p_file_type: importFile.type || importFile.name.split(".").pop() || "unknown",
      });
      if (error) throw error;
      const result = (data ?? {}) as ImportResult;
      setGeneratedAccess(result.generated_access ?? []);
      setMessage(`Import selesai: ${result.created ?? 0} siswa baru, ${result.updated ?? 0} diperbarui, ${result.skipped ?? 0} dilewati.`);
      setImportRows([]);
      setImportFile(null);
      await loadAll();
    } catch (error) {
      setMessage(toUserMessage(error));
    } finally { setImporting(false); }
  }

  function downloadGeneratedAccessCsv() {
    if (!generatedAccess.length) return;
    const rows = [["Nama", "Kelas", "PIN"], ...generatedAccess.map((x) => [x.full_name, x.class_name, x.pin])];
    const csv = rows.map((row) => row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `akses-siswa-baru-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  async function saveSettings() {
    setSaving(true); setMessage("");
    try {
      const { error } = await supabase.from("system_settings").upsert({
        key: "school_profile",
        value: settings,
        updated_at: new Date().toISOString(),
      }, { onConflict: "key" });
      if (error) throw error;
      setMessage("Pengaturan sekolah dan template laporan berhasil disimpan.");
    } catch (error) {
      setMessage(toUserMessage(error));
    } finally { setSaving(false); }
  }

  async function downloadStudentReport(student: StudentRow) {
    setReporting(true); setReportProgress(`Menyiapkan laporan ${student.full_name}...`); setMessage("");
    try {
      const bundle = await loadStudentReportBundle(supabase, student.id);
      await downloadStudentReportPdf(bundle, { reportTitle: settings.report_title, footer: settings.report_footer, includeDetailedAnswers: true });
      setMessage("PDF laporan siswa berhasil dibuat.");
    } catch (error) {
      setMessage(toUserMessage(error));
    } finally { setReporting(false); setReportProgress(""); }
  }

  async function downloadGroupReport() {
    const target = reportClass === "all"
      ? students.filter((s) => s.is_active)
      : students.filter((s) => s.is_active && s.class_id === reportClass);
    if (!target.length) return setMessage("Tidak ada siswa pada pilihan laporan.");
    setReporting(true); setMessage("");
    try {
      const className = reportClass === "all" ? "Seluruh Siswa" : classes.find((c) => c.id === reportClass)?.name ?? "Kelas";
      if (reportMode === "comprehensive") {
        setReportProgress(`Mengumpulkan data lengkap ${target.length} siswa...`);
        const bundles = await loadComprehensiveGroupBundles(supabase, target.map((s) => s.id));
        setReportProgress("Menyusun PDF komprehensif...");
        await downloadComprehensiveGroupPdf(bundles, `Laporan ${className}`, { footer: settings.report_footer, includeDetailedAnswers: true });
        setMessage("PDF komprehensif kelompok berhasil dibuat.");
      } else {
        setReportProgress(`Mengumpulkan ringkasan ${target.length} siswa...`);
        const summary = await loadGroupReportSummary(supabase, target.map((s) => s.id));
        setReportProgress("Menyusun PDF ringkasan...");
        await downloadGroupSummaryPdf(summary, `Laporan Ringkasan ${className}`, { footer: settings.report_footer });
        setMessage("PDF ringkasan kelompok berhasil dibuat.");
      }
    } catch (error) {
      setMessage(toUserMessage(error));
    } finally { setReporting(false); setReportProgress(""); }
  }

  if (loading && !students.length && !denied) return <main className="center-screen"><div className="loader"/></main>;

  return <main className="system-management-page">
    <header className="system-topbar">
      <Link href="/" className="back-link"><ArrowLeft size={18}/> Dashboard</Link>
      <div><span>ADMINISTRASI INTERNAL</span><strong>Manajemen Sistem</strong></div>
    </header>

    <section className="system-hero">
      <div>
        <p className="eyebrow">BINA INSAN LIFEMAP • SYSTEM MANAGEMENT</p>
        <h1>Atur data, akses, laporan, dan operasional dari satu tempat.</h1>
        <p>Kelola siswa dan kelas, sinkronkan roster dari Excel/PDF, lihat riwayat import, dan hasilkan laporan pendampingan untuk siswa, kelas, atau seluruh sekolah.</p>
      </div>
      <div className="system-hero-status"><ShieldCheck size={19}/><span>Staff only</span></div>
    </section>

    {message && <div className="workspace-message system-message">{message}</div>}
    {generatedPin && <div className="system-pin-reveal"><KeyRound size={20}/><div><strong>PIN baru untuk {generatedPin.name}</strong><span>{generatedPin.pin}</span><small>Catat sekarang. Sistem menyimpan hash, bukan PIN plaintext.</small></div></div>}
    {generatedAccess.length > 0 && <div className="system-pin-reveal"><KeyRound size={20}/><div><strong>{generatedAccess.length} akses siswa baru dibuat</strong><small>Unduh daftar sekali ini lalu simpan secara aman.</small><button onClick={downloadGeneratedAccessCsv}><Download size={15}/> Unduh CSV Akses Baru</button></div></div>}
    {reportProgress && <div className="system-progress"><Loader2 className="spin" size={18}/>{reportProgress}</div>}

    {denied ? <section className="system-empty"><ShieldCheck size={30}/><h2>Akses dibatasi</h2><p>{message}</p></section> : <>
      <nav className="system-tabs">
        <button className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}><Settings size={17}/> Ringkasan</button>
        <button className={tab === "students" ? "active" : ""} onClick={() => setTab("students")}><Users size={17}/> Siswa</button>
        <button className={tab === "classes" ? "active" : ""} onClick={() => setTab("classes")}><Building2 size={17}/> Kelas</button>
        <button className={tab === "import" ? "active" : ""} onClick={() => setTab("import")}><Upload size={17}/> Import Data</button>
        <button className={tab === "reports" ? "active" : ""} onClick={() => setTab("reports")}><FileText size={17}/> Laporan</button>
        <button className={tab === "settings" ? "active" : ""} onClick={() => setTab("settings")}><Settings size={17}/> Pengaturan</button>
      </nav>

      {tab === "overview" && <section className="system-content">
        <div className="system-stat-grid">
          <Metric label="Siswa aktif" value={stats.students} icon={<Users size={20}/>}/>
          <Metric label="Kelas aktif" value={stats.classes} icon={<Building2 size={20}/>}/>
          <Metric label="Siswa diarsipkan" value={stats.inactive} icon={<UserRound size={20}/>}/>
          <Metric label="Riwayat import" value={stats.imports} icon={<FileSpreadsheet size={20}/>}/>
        </div>
        <div className="system-grid two">
          <section className="system-card">
            <div className="system-card-head"><div><span>TAHUN AJARAN</span><h2>{activeYear?.name ?? "Belum ada tahun aktif"}</h2></div><GraduationCap size={23}/></div>
            <div className="system-list compact">{years.map((year) => <div key={year.id}><div><strong>{year.name}</strong><small>{year.starts_on ?? "-"} - {year.ends_on ?? "-"}</small></div>{year.is_active ? <span className="system-status active">Aktif</span> : <button onClick={() => setActiveYear(year.id)}>Jadikan aktif</button>}</div>)}</div>
          </section>
          <section className="system-card">
            <div className="system-card-head"><div><span>AKSES CEPAT</span><h2>Operasional BK</h2></div><ChevronRight size={23}/></div>
            <div className="system-quick-links">
              <Link href="/counseling/assessments">Jawaban & Review Asesmen <ChevronRight size={16}/></Link>
              <Link href="/counseling/student-access">Akses Siswa & PIN <ChevronRight size={16}/></Link>
              <Link href="/counseling">BK Control Center <ChevronRight size={16}/></Link>
              <Link href="/counseling/career-monitoring">Monitoring Karier <ChevronRight size={16}/></Link>
            </div>
          </section>
        </div>
        <section className="system-card">
          <div className="system-card-head"><div><span>IMPORT TERBARU</span><h2>Riwayat pembaruan roster</h2></div><RefreshCw size={20}/></div>
          <div className="system-list">{importJobs.length ? importJobs.map((job) => <div key={String(job.id)}><div><strong>{String(job.file_name ?? "Import")}</strong><small>{String(job.created_at ?? "")} • {String(job.row_count ?? 0)} baris</small></div><span className="system-status">{String(job.status ?? "-")}</span></div>) : <p className="muted">Belum ada import data.</p>}</div>
        </section>
      </section>}

      {tab === "students" && <section className="system-content">
        <div className="system-grid student-admin-grid">
          <section className="system-card">
            <div className="system-card-head"><div><span>{studentForm.id ? "EDIT SISWA" : "SISWA BARU"}</span><h2>{studentForm.id ? "Perbarui data siswa" : "Tambah siswa"}</h2></div><UserRound size={22}/></div>
            <form className="system-form" onSubmit={saveStudent}>
              <Field label="Nama lengkap" value={studentForm.full_name} onChange={(v) => setStudentForm({ ...studentForm, full_name: v })}/>
              <label><span>Kelas</span><select value={studentForm.class_id} onChange={(e) => setStudentForm({ ...studentForm, class_id: e.target.value })} required><option value="">Pilih kelas</option>{activeClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
              <div className="system-form-row"><Field label="NIS" value={studentForm.nis} onChange={(v) => setStudentForm({ ...studentForm, nis: v })}/><Field label="NISN" value={studentForm.nisn} onChange={(v) => setStudentForm({ ...studentForm, nisn: v })}/></div>
              <div className="system-form-row"><label><span>Jenis kelamin</span><select value={studentForm.gender} onChange={(e) => setStudentForm({ ...studentForm, gender: e.target.value })}><option value="">-</option><option value="L">Laki-laki</option><option value="P">Perempuan</option></select></label><Field label="Email" value={studentForm.email} onChange={(v) => setStudentForm({ ...studentForm, email: v })}/></div>
              <div className="system-form-actions"><button type="button" className="system-secondary" onClick={() => setStudentForm({ ...emptyStudent })}>Bersihkan</button><button className="system-primary" disabled={saving}><Save size={16}/>{studentForm.id ? "Simpan perubahan" : "Tambah siswa"}</button></div>
            </form>
          </section>

          <section className="system-card system-table-card">
            <div className="system-card-head"><div><span>DATABASE SISWA</span><h2>{filteredStudents.length} siswa ditampilkan</h2></div><Users size={22}/></div>
            <div className="system-toolbar">
              <div className="system-search"><Search size={17}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari nama, NIS, NISN, email..."/></div>
              <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}><option value="all">Semua kelas</option>{activeClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
              <label className="system-check"><input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)}/> Tampilkan arsip</label>
            </div>
            <div className="system-student-list">{filteredStudents.map((student) => <article key={student.id} className={!student.is_active ? "archived" : ""}>
              <div className="system-avatar">{student.full_name.slice(0, 2).toUpperCase()}</div>
              <div className="system-student-main"><strong>{student.full_name}</strong><span>{student.classes?.name ?? "-"} • NIS {student.nis ?? "-"} • NISN {student.nisn ?? "-"}</span></div>
              <div className="system-row-actions">
                <Link href={`/students/${student.id}`} title="Buka Student 360"><ChevronRight size={17}/></Link>
                <button title="Edit" onClick={() => setStudentForm({ id: student.id, full_name: student.full_name, class_id: student.class_id, nis: student.nis ?? "", nisn: student.nisn ?? "", gender: student.gender ?? "", email: student.email ?? "", is_active: student.is_active })}>Edit</button>
                <button title="PDF laporan" onClick={() => downloadStudentReport(student)} disabled={reporting}><Download size={15}/></button>
                {student.is_active && <button title="Reset PIN" onClick={() => resetStudentPin(student)}><KeyRound size={15}/></button>}
                <button className={student.is_active ? "danger" : "restore"} onClick={() => toggleStudent(student)}>{student.is_active ? "Arsipkan" : "Aktifkan"}</button>
              </div>
            </article>)}</div>
          </section>
        </div>
      </section>}

      {tab === "classes" && <section className="system-content">
        <div className="system-grid two">
          <section className="system-card">
            <div className="system-card-head"><div><span>{classForm.id ? "EDIT KELAS" : "KELAS BARU"}</span><h2>Manajemen rombel</h2></div><Building2 size={22}/></div>
            <form className="system-form" onSubmit={saveClass}>
              <Field label="Nama kelas" value={classForm.name} onChange={(v) => setClassForm({ ...classForm, name: v, slug: classForm.id ? classForm.slug : slugify(v) })}/>
              <label><span>Tingkat</span><select value={classForm.grade} onChange={(e) => setClassForm({ ...classForm, grade: e.target.value })}><option value="10">Kelas X</option><option value="11">Kelas XI</option><option value="12">Kelas XII</option></select></label>
              <Field label="Slug" value={classForm.slug} onChange={(v) => setClassForm({ ...classForm, slug: slugify(v) })}/>
              <div className="system-form-actions"><button type="button" className="system-secondary" onClick={() => setClassForm({ ...emptyClass })}>Bersihkan</button><button className="system-primary" disabled={saving}><Save size={16}/>{classForm.id ? "Simpan kelas" : "Tambah kelas"}</button></div>
            </form>
          </section>
          <section className="system-card">
            <div className="system-card-head"><div><span>{activeYear?.name ?? "TAHUN AKTIF"}</span><h2>{activeClasses.length} kelas aktif</h2></div><GraduationCap size={22}/></div>
            <div className="class-admin-list">{activeClasses.map((row) => <div key={row.id}>
              <div><strong>{row.name}</strong><span>Kelas {row.grade} • {classCounts.get(row.id) ?? 0} siswa aktif</span></div>
              <div><button onClick={() => setClassForm({ id: row.id, name: row.name, grade: String(row.grade), slug: row.slug })}>Edit</button><button className="danger" disabled={(classCounts.get(row.id) ?? 0) > 0} onClick={() => removeClass(row)}><Trash2 size={14}/> Hapus</button></div>
            </div>)}</div>
          </section>
        </div>
      </section>}

      {tab === "import" && <section className="system-content">
        <section className="system-card import-card">
          <div className="system-card-head"><div><span>UPDATE DATA SISWA</span><h2>Import Excel, CSV, atau PDF</h2></div><FileSpreadsheet size={24}/></div>
          <p className="system-copy">Excel/CSV adalah format paling presisi. PDF tetap didukung sebagai pembacaan heuristik dan wajib diperiksa lewat preview sebelum disimpan. Sistem akan mencocokkan NISN, NIS, atau nama+kelas untuk update; siswa/kelas baru dibuat otomatis.</p>
          <label className="import-drop">
            <Upload size={26}/>
            <strong>{importFile ? importFile.name : "Pilih file roster siswa"}</strong>
            <span>XLSX, XLS, CSV, TSV, atau PDF • maksimal 15 MB</span>
            <input type="file" accept=".xlsx,.xls,.csv,.tsv,.pdf" onChange={previewImport} disabled={importing}/>
          </label>
          {importWarnings.length > 0 && <div className="import-warnings">{importWarnings.map((warning) => <p key={warning}>{warning}</p>)}</div>}
          {importRows.length > 0 && <>
            <div className="import-summary"><span>{importRows.length} baris siap</span><span>{new Set(importRows.map((r) => r.class_name)).size} kelas terdeteksi</span></div>
            <div className="import-preview"><div className="import-head"><span>Nama</span><span>Kelas</span><span>NIS</span><span>NISN</span></div>{importRows.slice(0, 60).map((row, index) => <div key={index}><span>{row.full_name}</span><span>{row.class_name}</span><span>{row.nis ?? "-"}</span><span>{row.nisn ?? "-"}</span></div>)}</div>
            {importRows.length > 60 && <p className="muted">Preview menampilkan 60 baris pertama dari {importRows.length} baris.</p>}
            <div className="system-form-actions"><button className="system-secondary" onClick={() => { setImportRows([]); setImportFile(null); }}>Batalkan</button><button className="system-primary" onClick={commitImport} disabled={importing}>{importing ? <Loader2 className="spin" size={16}/> : <CheckCircle2 size={16}/>} Import & Sinkronkan</button></div>
          </>}
        </section>
      </section>}

      {tab === "reports" && <section className="system-content">
        <div className="system-grid two">
          <section className="system-card">
            <div className="system-card-head"><div><span>LAPORAN SISWA</span><h2>PDF komprehensif per siswa</h2></div><FileText size={22}/></div>
            <p className="system-copy">Mencakup identitas, Life & Career Profile, Life Map, milestone, roadmap, semua jawaban asesmen per soal, review Guru BK, Action Plan, BK Karier, konseling, follow-up, outcome, dan need signal.</p>
            <div className="report-student-list">{students.filter((s) => s.is_active).slice(0, 116).map((student) => <div key={student.id}><div><strong>{student.full_name}</strong><span>{student.classes?.name ?? "-"}</span></div><button onClick={() => downloadStudentReport(student)} disabled={reporting}><Download size={15}/> PDF</button></div>)}</div>
          </section>
          <section className="system-card">
            <div className="system-card-head"><div><span>LAPORAN KELOMPOK</span><h2>Kelas / seluruh sekolah</h2></div><Users size={22}/></div>
            <p className="system-copy">Ringkasan kelompok dibuat lebih aman untuk monitoring kelas: status asesmen, Action Plan, arah karier, konseling, dan follow-up. Jawaban sensitif tetap berada pada laporan individual.</p>
            <label className="system-report-select"><span>Cakupan laporan</span><select value={reportClass} onChange={(e) => setReportClass(e.target.value)}><option value="all">Seluruh siswa aktif</option>{activeClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label className="system-report-select"><span>Jenis laporan</span><select value={reportMode} onChange={(e) => setReportMode(e.target.value as "summary"|"comprehensive")}><option value="summary">Ringkasan monitoring</option><option value="comprehensive">Komprehensif + jawaban asesmen per soal</option></select></label>
            {reportMode==="comprehensive"&&<p className="system-report-warning">Mode komprehensif dapat menghasilkan PDF yang sangat panjang, terutama jika memilih seluruh siswa.</p>}
            <button className="system-primary wide" onClick={downloadGroupReport} disabled={reporting}><Download size={16}/>{reporting ? "Menyiapkan..." : reportMode==="comprehensive"?"Download PDF Komprehensif":"Download PDF Ringkasan"}</button>
          </section>
        </div>
      </section>}

      {tab === "settings" && <section className="system-content">
        <div className="system-grid two">
          <section className="system-card">
            <div className="system-card-head"><div><span>IDENTITAS SISTEM</span><h2>Pengaturan sekolah</h2></div><Settings size={22}/></div>
            <div className="system-form">
              <Field label="Nama sekolah" value={settings.school_name} onChange={(v) => setSettings({ ...settings, school_name: v })}/>
              <Field label="Nama platform" value={settings.platform_name} onChange={(v) => setSettings({ ...settings, platform_name: v })}/>
              <Field label="Judul laporan PDF" value={settings.report_title} onChange={(v) => setSettings({ ...settings, report_title: v })}/>
              <label><span>Footer laporan</span><textarea rows={4} value={settings.report_footer} onChange={(e) => setSettings({ ...settings, report_footer: e.target.value })}/></label>
              <button className="system-primary" onClick={saveSettings} disabled={saving}><Save size={16}/> Simpan pengaturan</button>
            </div>
          </section>
          <section className="system-card">
            <div className="system-card-head"><div><span>TAHUN AJARAN</span><h2>Periode & aktivasi</h2></div><GraduationCap size={22}/></div>
            <form className="system-form compact-year-form" onSubmit={createAcademicYear}>
              <Field label="Nama tahun ajaran" value={yearForm.name} onChange={(v) => setYearForm({ ...yearForm, name: v })}/>
              <div className="system-form-row"><label><span>Mulai</span><input type="date" value={yearForm.starts_on} onChange={(e) => setYearForm({ ...yearForm, starts_on: e.target.value })}/></label><label><span>Selesai</span><input type="date" value={yearForm.ends_on} onChange={(e) => setYearForm({ ...yearForm, ends_on: e.target.value })}/></label></div>
              <button className="system-secondary" disabled={saving}><Plus size={15}/> Tambah tahun ajaran</button>
            </form>
            <div className="system-list year-list">{years.map((year) => <div key={year.id}><div><strong>{year.name}</strong><small>{year.starts_on ?? "-"} - {year.ends_on ?? "-"}</small></div>{year.is_active ? <span className="system-status active">Aktif</span> : <button onClick={() => setActiveYear(year.id)}>Aktifkan</button>}</div>)}</div>
            <p className="system-copy">Perubahan tahun aktif tidak menghapus riwayat enrollment. Data siswa lama tetap dapat dilacak.</p>
          </section>
        </div>
      </section>}
    </>}
  </main>;
}

function Metric({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return <div className="system-stat"><div>{icon}</div><span>{label}</span><strong>{value}</strong></div>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label><span>{label}</span><input value={value} onChange={(event) => onChange(event.target.value)}/></label>;
}
