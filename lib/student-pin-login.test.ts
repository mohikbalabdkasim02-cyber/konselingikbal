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

  const rosterStart = sql.search(/create or replace function public\.student_login_roster\(\)/i);
  const verifyStart = sql.search(/create or replace function public\.verify_student_pin_login/i);
  assert.ok(rosterStart >= 0 && verifyStart > rosterStart, "roster function must appear before PIN verifier");
  const rosterSql = sql.slice(rosterStart, verifyStart);
  assert.doesNotMatch(rosterSql, /pin_hash/i);
  assert.doesNotMatch(rosterSql, /student_access_credentials/i);
});

test("stage 2 verifies PIN inside an authenticated anonymous session and binds exactly one student", () => {
  const sql = readRequired(migrationPath, "student PIN login migration must exist");
  assert.match(sql, /create or replace function public\.verify_student_pin_login/i);
  assert.match(sql, /auth\.uid\(\)\s+is\s+null/i);
  assert.match(sql, /crypt\(p_pin,\s*v_pin_hash\)\s*<>\s*v_pin_hash/i);
  assert.match(sql, /failed_attempts/i);
  assert.match(sql, /locked_until/i);
  assert.match(sql, /interval\s+'15 minutes'/i);
  assert.match(sql, /student_auth_links/i);
  assert.match(sql, /auth_user_id\s*=\s*auth\.uid\(\)/i);
  assert.match(sql, /on conflict\s*\(student_id\)\s*do update/i);
  assert.match(sql, /grant execute on function public\.verify_student_pin_login\(uuid, text\) to authenticated/i);
  assert.match(sql, /revoke all on function public\.verify_student_pin_login\(uuid, text\) from anon/i);
  assert.doesNotMatch(sql, /grant execute on function public\.verify_student_pin_login\(uuid, text\) to service_role/i);
});

test("stage 2 no longer needs a custom service-role Edge Function", () => {
  assert.equal(fs.existsSync(edgePath), false, "student PIN login must not depend on a service-role Edge Function");
});

test("student login UI uses anonymous auth, class, name, and six-digit PIN", () => {
  const page = readRequired(loginPagePath, "student login page must exist");
  assert.match(page, /student_login_roster/);
  assert.match(page, /signInAnonymously\(/);
  assert.match(page, /verify_student_pin_login/);
  assert.match(page, /Pilih kelas|Pilih Kelas/i);
  assert.match(page, /Cari nama|Pilih nama|Nama siswa/i);
  assert.doesNotMatch(page, /functions\.invoke\(/);
  assert.doesNotMatch(page, /setSession\(/);
  assert.doesNotMatch(page, /signUp\(/);
  assert.doesNotMatch(page, /type="email"/);
  assert.doesNotMatch(page, /Aktifkan Akun Siswa/);
});

test("student home trusts the PIN-authenticated link and does not fall back to email claim", () => {
  const page = readRequired(studentHomePath, "student home page must exist");
  assert.match(page, /student_auth_links/);
  assert.doesNotMatch(page, /claim_student_account/);
});
