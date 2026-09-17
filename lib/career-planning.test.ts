import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizePlanChoices,
  toCareerChoicePayloads,
  toggleComparisonSelection,
  portfolioItemIsMeaningful,
} from "./career-planning.ts";

test("normalizePlanChoices always returns ordered Plan A, B, and C", () => {
  const result = normalizePlanChoices([
    { id: "b1", position: "B", custom_name: "Arsitek", reason: "Suka desain", review_date: null, status: "active" },
    { id: "a1", position: "A", custom_name: "Dokter", reason: null, review_date: "2026-10-01", status: "active" },
  ]);

  assert.deepEqual(result.map((item) => item.position), ["A", "B", "C"]);
  assert.equal(result[0].custom_name, "Dokter");
  assert.equal(result[1].custom_name, "Arsitek");
  assert.equal(result[2].custom_name, "");
});

test("toCareerChoicePayloads trims content and omits empty plans", () => {
  const payloads = toCareerChoicePayloads("student-1", [
    { position: "A", custom_name: "  Dokter  ", reason: "  membantu orang  ", review_date: "2026-10-01", status: "active" },
    { position: "B", custom_name: "   ", reason: "abaikan", review_date: "", status: "active" },
    { position: "C", custom_name: "Psikolog", reason: "", review_date: "", status: "active" },
  ]);

  assert.equal(payloads.length, 2);
  assert.deepEqual(payloads[0], {
    student_id: "student-1",
    position: "A",
    custom_name: "Dokter",
    reason: "membantu orang",
    review_date: "2026-10-01",
    status: "active",
  });
  assert.equal(payloads[1].review_date, null);
  assert.equal(payloads[1].reason, null);
});

test("toggleComparisonSelection limits compare mode to four unique careers", () => {
  let selected: string[] = [];
  selected = toggleComparisonSelection(selected, "a");
  selected = toggleComparisonSelection(selected, "b");
  selected = toggleComparisonSelection(selected, "c");
  selected = toggleComparisonSelection(selected, "d");
  selected = toggleComparisonSelection(selected, "e");
  assert.deepEqual(selected, ["a", "b", "c", "d"]);

  selected = toggleComparisonSelection(selected, "b");
  assert.deepEqual(selected, ["a", "c", "d"]);
});

test("portfolioItemIsMeaningful requires a non-empty title", () => {
  assert.equal(portfolioItemIsMeaningful({ title: "", category: "project" }), false);
  assert.equal(portfolioItemIsMeaningful({ title: "  Proyek robotik  ", category: "project" }), true);
});
