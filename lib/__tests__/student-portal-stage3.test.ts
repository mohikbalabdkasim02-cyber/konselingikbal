import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const portalPath = path.join(process.cwd(), "app/student/page.tsx");
const statusPath = path.join(process.cwd(), "lib/student-assessment-status.ts");

function readRequired(filePath: string, message: string) {
  assert.equal(fs.existsSync(filePath), true, message);
  return fs.readFileSync(filePath, "utf8");
}

test("stage 3 student portal derives assessment and career progress", () => {
  const page = readRequired(portalPath, "student portal page must exist");
  const status = readRequired(statusPath, "student assessment status helper must exist");

  assert.match(page, /assessment_attempts/);
  assert.match(page, /assessment_answers/);
  assert.match(page, /career_self_profiles/);
  assert.match(page, /student_career_choices/);
  assert.match(page, /deriveAssessmentStatus/);
  assert.match(page, /deriveCareerStatus/);

  assert.match(status, /Belum mulai/);
  assert.match(status, /Sedang diisi/);
  assert.match(status, /Selesai/);
  assert.match(status, /Sedang dieksplorasi/);
});

test("stage 3 keeps exact existing assessment routes and does not invent a career assessment", () => {
  const page = readRequired(portalPath, "student portal page must exist");

  assert.match(page, /\/student\/assessments\/pribadi/);
  assert.match(page, /\/student\/assessments\/belajar/);
  assert.match(page, /\/student\/assessments\/sosial/);
  assert.match(page, /\/student\/career/);
  assert.doesNotMatch(page, /\/student\/assessments\/karier/);
});
