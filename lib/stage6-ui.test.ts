import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

test("stage 6 dashboard uses official branding and clear navigation", () => {
  const page = read("app/page.tsx");
  assert.match(page, /BrandLogo/);
  assert.match(page, /stage6-sidebar/);
  assert.match(page, /Portal Siswa/);
  assert.match(page, /BK Control Center/);
  assert.match(page, /Total siswa/);
  assert.match(page, /Proposal masuk/);
  assert.match(page, /Sudah dipetakan/);
});

test("stage 6 visual layer stays clean and avoids decorative gradients", () => {
  const css = read("app/stage6.css");
  assert.match(css, /--stage6-navy:/);
  assert.match(css, /\.stage6-shell/);
  assert.match(css, /@media\s*\(max-width:\s*900px\)/);
  assert.doesNotMatch(css, /linear-gradient|radial-gradient/);
});

test("stage 6 keeps core student and BK routes present", () => {
  const routes = [
    "app/student/login/page.tsx",
    "app/student/page.tsx",
    "app/student/assessments/[slug]/page.tsx",
    "app/students/[id]/page.tsx",
    "app/counseling/requests/page.tsx",
  ];
  for (const route of routes) {
    assert.equal(fs.existsSync(path.join(root, route)), true, `${route} must still exist`);
  }
});
