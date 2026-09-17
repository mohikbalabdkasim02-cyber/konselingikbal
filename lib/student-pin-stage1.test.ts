import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const migrationPath = path.join(process.cwd(), "supabase/migrations/202609170008_student_pin_access.sql");

test("stage 1 migration contains exactly 116 unique initial PIN mappings", () => {
  assert.equal(fs.existsSync(migrationPath), true, "student PIN migration must exist");
  const sql = fs.readFileSync(migrationPath, "utf8");
  const pins = [...sql.matchAll(/'((?:260)\d{3})'/g)].map((match) => match[1]);
  const rosterPins = pins.filter((pin) => Number(pin) >= 260001 && Number(pin) <= 260116);
  assert.equal(rosterPins.length, 116);
  assert.equal(new Set(rosterPins).size, 116);
  assert.equal(rosterPins[0], "260001");
  assert.equal(rosterPins.at(-1), "260116");
});

test("stage 1 migration preserves agreed control mappings", () => {
  assert.equal(fs.existsSync(migrationPath), true, "student PIN migration must exist");
  const sql = fs.readFileSync(migrationPath, "utf8");
  assert.match(sql, /'X Abu Bakar',\s*'Oryza Rizqiqah Azzahra',\s*'260024'/);
  assert.match(sql, /'X Umar Bin Khattab',\s*'Abid Khalish',\s*'260028'/);
  assert.match(sql, /'XI Utsmaniyyah',\s*'Aisyah Afiqah Inaswaty',\s*'260053'/);
  assert.match(sql, /'XII Abbasiyah',\s*'Abdul Hafiiz',\s*'260089'/);
});

test("stage 1 migration stores PINs as bcrypt hashes, not plaintext credentials", () => {
  assert.equal(fs.existsSync(migrationPath), true, "student PIN migration must exist");
  const sql = fs.readFileSync(migrationPath, "utf8");
  assert.match(sql, /crypt\(.*gen_salt\('bf'/s);
  assert.match(sql, /pin_hash\s+text\s+not\s+null/i);
});
