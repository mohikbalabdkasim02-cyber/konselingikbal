import test from "node:test";
import assert from "node:assert/strict";
import { CANONICAL_LIFE_CATEGORIES, normalizeLifeAspectRows } from "./lifemap.ts";

test("canonical proposal Life Map contains exactly 14 categories", () => {
  assert.equal(CANONICAL_LIFE_CATEGORIES.length, 14);
  assert.equal(CANONICAL_LIFE_CATEGORIES.some(([key]) => key === "transport"), true);
  assert.equal(CANONICAL_LIFE_CATEGORIES.some(([key]) => key === "leisure"), true);
  assert.equal(CANONICAL_LIFE_CATEGORIES.some(([key]) => key === "personal"), false);
});

test("normalization preserves a legacy Personal Life row only when it already exists", () => {
  const rows = normalizeLifeAspectRows([{ category: "personal", content: "Catatan lama", status: "filled", sort_order: 99 }]);
  assert.equal(rows.length, 15);
  assert.equal(rows.at(-1)?.category, "personal");
  assert.equal(rows.at(-1)?.content, "Catatan lama");
  const empty = normalizeLifeAspectRows([]);
  assert.equal(empty.length, 14);
  assert.equal(empty.some((item) => item.category === "personal"), false);
});
