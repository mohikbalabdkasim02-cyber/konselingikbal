import test from "node:test";
import assert from "node:assert/strict";
import { summarizeCareerStudent } from "./career-monitoring.ts";

test("marks student as belum mulai when no career activity exists", () => {
  const result = summarizeCareerStudent({ hasSelfProfile:false, planCount:0, comparisonCount:0, portfolioCount:0, reviewDates:[] }, new Date("2026-09-17T00:00:00Z"));
  assert.equal(result.stage, "belum_mulai");
  assert.equal(result.needsAttention, true);
});

test("marks student as perlu review when a plan review date is overdue", () => {
  const result = summarizeCareerStudent({ hasSelfProfile:true, planCount:3, comparisonCount:1, portfolioCount:2, reviewDates:["2026-09-01","2026-10-01"] }, new Date("2026-09-17T00:00:00Z"));
  assert.equal(result.stage, "perlu_review");
  assert.equal(result.needsAttention, true);
});

test("marks student as punya rencana when profile and plans are active", () => {
  const result = summarizeCareerStudent({ hasSelfProfile:true, planCount:2, comparisonCount:1, portfolioCount:1, reviewDates:["2026-10-01"] }, new Date("2026-09-17T00:00:00Z"));
  assert.equal(result.stage, "punya_rencana");
  assert.equal(result.needsAttention, false);
  assert.equal(result.activityScore, 5);
});
