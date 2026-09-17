import test from "node:test";
import assert from "node:assert/strict";
import { toggleComparisonSelection, comparisonIsReady, toPortfolioPayload } from "./career-planning.ts";

test("comparison selection supports up to four careers", () => {
  let selected: string[] = [];
  selected = toggleComparisonSelection(selected, "a");
  selected = toggleComparisonSelection(selected, "b");
  selected = toggleComparisonSelection(selected, "c");
  selected = toggleComparisonSelection(selected, "d");
  selected = toggleComparisonSelection(selected, "e");
  assert.deepEqual(selected, ["a", "b", "c", "d"]);
});

test("comparison is ready only for two through four choices", () => {
  assert.equal(comparisonIsReady([]), false);
  assert.equal(comparisonIsReady(["a"]), false);
  assert.equal(comparisonIsReady(["a", "b"]), true);
  assert.equal(comparisonIsReady(["a", "b", "c", "d"]), true);
  assert.equal(comparisonIsReady(["a", "b", "c", "d", "e"]), false);
});

test("portfolio payload trims text and nulls empty optional fields", () => {
  assert.deepEqual(toPortfolioPayload("student-1", {
    title: "  Proyek robotik  ",
    category: "project",
    evidence_url: "  https://example.com/bukti  ",
    reflection: "  Saya belajar kolaborasi  ",
    occurred_at: "",
  }), {
    student_id: "student-1",
    title: "Proyek robotik",
    category: "project",
    evidence_url: "https://example.com/bukti",
    reflection: "Saya belajar kolaborasi",
    occurred_at: null,
    status: "active",
  });
});
