import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/202609170011_stage4_help_request_invoker.sql",
);

test("stage 5 keeps request_bk_help under caller RLS", () => {
  assert.equal(fs.existsSync(migrationPath), true, "stage 5 hardening migration must exist");
  const sql = fs.readFileSync(migrationPath, "utf8");

  assert.match(sql, /alter function public\.request_bk_help\(uuid\) security invoker/i);
  assert.match(sql, /revoke all on function public\.request_bk_help\(uuid\) from anon/i);
  assert.match(sql, /grant execute on function public\.request_bk_help\(uuid\) to authenticated/i);
  assert.doesNotMatch(sql, /security definer/i);
});

test("stage 5 cumulative student and BK routes exist", () => {
  const requiredRoutes = [
    "app/student/login/page.tsx",
    "app/student/page.tsx",
    "app/student/assessments/[slug]/page.tsx",
    "app/counseling/requests/page.tsx",
  ];

  for (const route of requiredRoutes) {
    assert.equal(fs.existsSync(path.join(process.cwd(), route)), true, `${route} must exist`);
  }
});
