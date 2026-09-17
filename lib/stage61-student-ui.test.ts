import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

test("student login uses official Bina Insan branding and Stage 6.1 form shell", () => {
  const page = read("app/student/login/page.tsx");
  assert.match(page, /BrandLogo/);
  assert.match(page, /student-login-stage61/);
  assert.match(page, /Portal Siswa/);
  assert.doesNotMatch(page, /GraduationCap/);
});

test("student portal header uses the same official brand family", () => {
  const page = read("app/student/page.tsx");
  assert.match(page, /BrandLogo/);
  assert.match(page, /student-portal-brandbar/);
  assert.match(page, /Bina Insan LifeMap/);
  assert.match(page, /Portal Siswa/);
});

test("Stage 6.1 normalizes student login controls without nested borders", () => {
  const css = read("app/stage6.css");
  assert.match(css, /\.student-login-stage61/);
  assert.match(css, /\.student-login-control/);
  assert.match(css, /\.student-login-control\s*>\s*select/);
  assert.match(css, /border:\s*0/);
  assert.match(css, /appearance:\s*none/);
  assert.match(css, /\.student-session-notice/);
});
