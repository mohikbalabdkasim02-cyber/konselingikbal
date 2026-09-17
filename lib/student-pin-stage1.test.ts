import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const migrationPath = path.join(process.cwd(), "supabase/migrations/202609170008_student_pin_access.sql");

function migrationSql() {
  assert.equal(fs.existsSync(migrationPath), true, "student PIN migration must exist");
  return fs.readFileSync(migrationPath, "utf8");
}

test("stage 1 creates a dedicated student credential table with lock metadata", () => {
  const sql = migrationSql();
  assert.match(sql, /create table if not exists public\.student_access_credentials/i);
  assert.match(sql, /student_id\s+uuid\s+primary key/i);
  assert.match(sql, /pin_hash\s+text\s+not\s+null/i);
  assert.match(sql, /failed_attempts\s+integer/i);
  assert.match(sql, /locked_until\s+timestamptz/i);
  assert.match(sql, /last_login_at\s+timestamptz/i);
  assert.match(sql, /is_active\s+boolean/i);
});

test("stage 1 hashes PINs with pgcrypto and exposes staff-only reset foundation", () => {
  const sql = migrationSql();
  assert.match(sql, /crypt\(.*gen_salt\('bf'/s);
  assert.match(sql, /create or replace function public\.set_student_pin/i);
  assert.match(sql, /assessment_is_staff\(\)/i);
  assert.match(sql, /PIN_FORMAT_INVALID/);
});

test("public repository migration never contains initial student names or plaintext PINs", () => {
  const sql = migrationSql();
  assert.doesNotMatch(sql, /260001|260024|260116/);
  assert.doesNotMatch(sql, /Oryza Rizqiqah Azzahra|Abid Khalish|Aisyah Afiqah Inaswaty|Abdul Hafiiz/);
});
