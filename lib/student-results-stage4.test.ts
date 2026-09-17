import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSafeAssessmentSummary,
  buildHelpRequestPayload,
  rankBkQueueItem,
} from "./student-results-stage4.ts";

test("safe summary exposes actionable fields but not sensitive narrative", () => {
  const summary = buildSafeAssessmentSummary("personal", {
    priority_1: "Mengelola stres",
    priority_2: "Mengatur kebiasaan",
    plan_target: "Tidur lebih teratur",
    plan_step: "Matikan HP pukul 22.00",
    plan_support: "Orang tua",
    plan_review: "2026-10-01",
    family_q1: "narasi keluarga sensitif",
    no_self_harm: "no",
  });

  assert.equal(summary.title, "Ringkasan Pribadimu");
  assert.deepEqual(summary.focusAreas, ["Mengelola stres", "Mengatur kebiasaan"]);
  assert.equal(summary.goal, "Tidur lebih teratur");
  assert.equal(summary.smallStep, "Matikan HP pukul 22.00");
  assert.equal(summary.support, "Orang tua");
  assert.equal(summary.reviewDate, "2026-10-01");
  assert.equal(JSON.stringify(summary).includes("narasi keluarga sensitif"), false);
  assert.equal(JSON.stringify(summary).includes("no_self_harm"), false);
});

test("help request payload is private, requested-help only, and scoped to student attempt", () => {
  const payload = buildHelpRequestPayload({
    studentId: "student-1",
    attemptId: "attempt-1",
    domain: "learning",
  });

  assert.deepEqual(payload.consultation, {
    student_id: "student-1",
    source_attempt_id: "attempt-1",
    domain: "learning",
    urgency: "soon",
    status: "requested",
    note: "Siswa meminta berbicara dengan Guru BK dari halaman hasil asesmen.",
  });
  assert.deepEqual(payload.signal, {
    student_id: "student-1",
    source_attempt_id: "attempt-1",
    domain: "learning",
    kind: "requested_help",
    severity: "attention",
    private: true,
    status: "open",
  });
});

test("BK queue prioritizes safety before requested help and never ranks students", () => {
  assert.equal(rankBkQueueItem({ kind: "safety", due: false, highNeed: false, stalled: false }), 1);
  assert.equal(rankBkQueueItem({ kind: "requested_help", due: false, highNeed: false, stalled: false }), 2);
  assert.equal(rankBkQueueItem({ kind: "follow_up", due: true, highNeed: false, stalled: false }), 3);
  assert.equal(rankBkQueueItem({ kind: "other", due: false, highNeed: true, stalled: false }), 4);
  assert.equal(rankBkQueueItem({ kind: "other", due: false, highNeed: false, stalled: true }), 5);
  assert.equal(rankBkQueueItem({ kind: "coverage", due: false, highNeed: false, stalled: false }), 6);
});
