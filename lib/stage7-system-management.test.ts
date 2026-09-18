import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

test("Stage 7 system management routes and migration are present", () => {
  const page = read("app/system-management/page.tsx");
  const migration = read("supabase/migrations/202609180004_stage7_system_management.sql");
  assert.match(page, /Manajemen Sistem/);
  assert.match(page, /Import Excel, CSV, atau PDF/);
  assert.match(page, /PDF komprehensif per siswa/);
  assert.match(migration, /admin_import_students/);
  assert.match(migration, /admin_generate_student_pin/);
  assert.match(migration, /system_settings/);
});

test("Stage 7 exposes detailed per-question assessment review without changing source assessments", () => {
  const review = read("app/counseling/assessments/[attemptId]/page.tsx");
  const registry = read("lib/assessments/registry.ts");
  assert.match(review, /soal terjawab/);
  assert.match(review, /Belum dijawab/);
  assert.match(review, /Download PDF Siswa/);
  assert.match(registry, /personalAssessmentV1/);
  assert.match(registry, /learningAssessmentV1/);
  assert.match(registry, /socialAssessmentV1/);
});

test("Stage 7 Student 360 links assessment history and comprehensive PDF", () => {
  const page = read("app/students/[id]/page.tsx");
  assert.match(page, /Asesmen/);
  assert.match(page, /Jawaban per soal/);
  assert.match(page, /Download Laporan PDF/);
  assert.match(page, /counseling\/assessments/);
});

test("Stage 7 keeps class and student destructive actions conservative", () => {
  const page = read("app/system-management/page.tsx");
  assert.match(page, /Arsipkan/);
  assert.match(page, /Riwayat asesmen dan pendampingan tetap tersimpan/);
  assert.match(page, /masih memiliki .* siswa/);
});
