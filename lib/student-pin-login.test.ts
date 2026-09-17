// Stage 2 student login TDD contract.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const migrationPath = path.join(process.cwd(), "supabase/migrations/202609170009_student_pin_login.sql");
const edgePath = path.join(process.cwd(), "supabase/functions/student-pin-login/index.ts");
const loginPagePath = path.join(process.cwd(), "app/student/login/page.tsx");
const studentHomePath = path.join(process.cwd(), "app/student/page.tsx");

function readRequired(filePath: string, message: string) {
  assert.equal(fs.existsSync(filePath), true, message);
  return fs.readFileSync(filePath, "utf8");
}

test("stage 2 exposes only the active class/name roster before login", () => {
  const sql = readRequired(migrationPath, "student PIN login migration must exist");
  assert.match(sql, /create or replace function public\.student_login_roster\(\)/i);
  assert.match(sql, /returns table\s*\([\s\S]*student_id uuid[\s\S]*full_name text[\s\S]*class_name text/i);
  assert.match(sql, /grant execute on function public\.student_login_roster\(\) to anon/i);
  assert.doesNotMatch(sql, /select\s+[^;]*pin_hash[^;]*from\s+public\.student_access_credentials/i);
});

test("stage 2 verifies PIN server-side with lockout and service-role-only execution", () => {
  const sql = readRequired(migrationPath, "student PIN login migration must exist");
  assert.match(sql, /create or replace function public\.verify_student_pin_login/i);
  assert.match(sql, /crypt\(p_pin,\s*v_pin_hash\)\s*<>\s*v_pin_hash/i);
  assert.match(sql, /failed_attempts/i);
  assert.match(sql, /locked_until/i);
  assert.match(sql, /interval\s+'15 minutes'/i);
  assert.match(sql, /grant execute on function public\.verify_student_pin_login\(uuid, text\) to service_role/i);
  assert.match(sql, /revoke all on function public\.verify_student_pin_login\(uuid, text\) from anon/i);
  assert.match(sql, /revoke all on function public\.verify_student_pin_login\(uuid, text\) from authenticated/i);
});

test("student login edge function creates a Supabase session only after PIN verification", () => {
  const edge = readRequired(edgePath, "student-pin-login edge function must exist");
  assert.match(edge, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(edge, /verify_student_pin_login/);
  assert.match(edge, /admin\.createUser|admin\.updateUserById/);
  assert.match(edge, /student_auth_links/);
  assert.match(edge, /signInWithPassword/);
  assert.match(edge, /access_token/);
  assert.match(edge, /refresh_token/);
});

test("student login UI uses class, name, and six-digit PIN without email activation", () => {
  const page = readRequired(loginPagePath, "student login page must exist");
  assert.match(page, /student_login_roster/);
  assert.match(page, /student-pin-login/);
  assert.match(page, /setSession/);
  assert.match(page, /Pilih kelas|Pilih Kelas/i);
  assert.match(page, /Cari nama|Pilih nama|Nama siswa/i);
  assert.doesNotMatch(page, /signUp\(/);
  assert.doesNotMatch(page, /type="email"/);
  assert.doesNotMatch(page, /Aktifkan Akun Siswa/);
});

test("student home trusts the PIN-authenticated link and does not fall back to email claim", () => {
  const page = readRequired(studentHomePath, "student home page must exist");
  assert.match(page, /student_auth_links/);
  assert.doesNotMatch(page, /claim_student_account/);
});
