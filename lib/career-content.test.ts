import test from "node:test";
import assert from "node:assert/strict";
import { buildCareerProfilePayload, careerProfilePublicationReady, slugifyCareerName } from "./career-content.ts";

test("slugifyCareerName creates stable lowercase slugs", () => {
  assert.equal(slugifyCareerName("  Data Scientist & AI Engineer  "), "data-scientist-ai-engineer");
});

test("careerProfilePublicationReady requires core Career 360 content", () => {
  const base = {
    name: "Dokter",
    summary: "Melayani kesehatan pasien.",
    activities: "Memeriksa dan menangani pasien.",
    competencies: "Sains, komunikasi, ketelitian.",
    education_path: "Pendidikan kedokteran dan profesi.",
    challenges: "Jam kerja dan tanggung jawab tinggi.",
    start_now: "Perkuat sains dan eksplorasi profesi.",
  };
  assert.equal(careerProfilePublicationReady(base), true);
  assert.equal(careerProfilePublicationReady({ ...base, education_path: "" }), false);
});

test("buildCareerProfilePayload trims text and parses aliases, questions, and sources by line", () => {
  const payload = buildCareerProfilePayload({
    name: "  Guru Bahasa Inggris ",
    slug: "",
    category: " Pendidikan ",
    aliasesText: "English Teacher\nGuru Inggris\n",
    summary: " Mengajar bahasa Inggris. ",
    activities: " Menyiapkan dan melaksanakan pembelajaran. ",
    contribution: " Membantu siswa berkomunikasi. ",
    good_values: " Integritas dan sabar. ",
    supporting_profile: " Senang belajar dan berkomunikasi. ",
    competencies: " Bahasa, pedagogi, komunikasi. ",
    education_path: " S1 Pendidikan Bahasa Inggris. ",
    challenges: " Adaptasi kebutuhan siswa. ",
    difficulty_factors: " Kurang praktik. ",
    risk_mitigation: " Mentoring dan latihan. ",
    prospects: " Sekolah dan pendidikan nonformal. ",
    alternatives: " Trainer, translator. ",
    start_now: " Latihan mengajar mini. ",
    reflectionQuestionsText: "Apakah saya menikmati mengajar?\nApakah saya suka bahasa?",
    sourcesText: "https://example.com/1\nhttps://example.com/2",
    content_owner: " Tim BK ",
  });
  assert.equal(payload.name, "Guru Bahasa Inggris");
  assert.equal(payload.slug, "guru-bahasa-inggris");
  assert.deepEqual(payload.aliases, ["English Teacher", "Guru Inggris"]);
  assert.deepEqual(payload.reflection_questions, ["Apakah saya menikmati mengajar?", "Apakah saya suka bahasa?"]);
  assert.deepEqual(payload.sources, ["https://example.com/1", "https://example.com/2"]);
  assert.equal(payload.content_owner, "Tim BK");
});
