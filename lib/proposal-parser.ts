export type ProposalProfileExtraction = {
  expertise?: string;
  career_direction?: string;
  education_target?: string;
  role_model?: string;
  personal_brand?: string;
  major_target?: string;
  campus_target?: string;
  mentor?: string;
  summary_notes?: string;
};

export type ProposalLifeAspect = {
  category: string;
  content: string;
};

export type ProposalExtraction = {
  profile: ProposalProfileExtraction;
  lifeAspects: ProposalLifeAspect[];
  milestones: string[];
  roadmap: string[];
  found: string[];
  needsReview: string[];
  textLength: number;
};

type Heading = { key: string; patterns: RegExp[] };

const LIFE_HEADINGS: Heading[] = [
  { key: "spiritual", patterns: [/spiritual/i, /tazkiyat/i] },
  { key: "islamic_studies", patterns: [/islamic\s*stud/i, /studi\s*islam/i] },
  { key: "ibadah", patterns: [/\bibadah\b/i] },
  { key: "leadership", patterns: [/leadership/i, /citizenship/i, /kepemimpinan/i] },
  { key: "health", patterns: [/\bhealth\b/i, /kesehatan/i] },
  { key: "knowledge", patterns: [/knowledge/i, /science/i, /pengetahuan/i, /keilmuan/i] },
  { key: "social", patterns: [/social/i, /environment/i, /lingkungan/i, /pelayanan\s*sosial/i] },
  { key: "entrepreneurship", patterns: [/entrepreneur/i, /wirausaha/i, /kewirausahaan/i] },
  { key: "career", patterns: [/\bwork\b/i, /career/i, /karier/i, /pekerjaan/i] },
  { key: "education", patterns: [/\beducation\b/i, /pendidikan/i] },
  { key: "finance", patterns: [/finance/i, /keuangan/i] },
  { key: "transport", patterns: [/transport/i, /kendaraan/i] },
  { key: "family", patterns: [/family/i, /friend/i, /keluarga/i, /teman/i] },
  { key: "leisure", patterns: [/leisure/i, /respite/i, /rekreasi/i, /hiburan/i] },
];

const MAJOR_SECTION_PATTERNS = [
  /role\s*model/i,
  /inspiras/i,
  /prestasi/i,
  /personal\s*brand/i,
  /my\s*brand/i,
  /expertise/i,
  /keahlian/i,
  /100\s*mimpi/i,
  /life\s*aspect/i,
  /jurusanku/i,
  /kampus\s*impi/i,
  /milestone/i,
  /roadmap/i,
  /mimpi\s*[1-6]/i,
  /rundown/i,
  ...LIFE_HEADINGS.flatMap((h) => h.patterns),
];

function cleanLine(value: string) {
  return value
    .replace(/[\u2022•▪◦]/g, " ")
    .replace(/^\s*[-–—]\s*/, "")
    .replace(/^\s*\d+[.)]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function linesFrom(text: string) {
  return text
    .replace(/\r/g, "\n")
    .replace(/\t/g, "\n")
    .split(/\n+/)
    .map(cleanLine)
    .filter(Boolean);
}

function matchesAny(line: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(line));
}

function isLikelyPrompt(line: string) {
  const lower = line.toLowerCase();
  return (
    line.endsWith("?") ||
    /^(siapa|apa|mengapa|kenapa|bagaimana|sebutkan|jelaskan|ceritakan|tuliskan|isilah|target|contoh)\b/i.test(lower) ||
    lower.length < 2
  );
}

function findHeadingIndex(lines: string[], patterns: RegExp[], from = 0) {
  for (let i = from; i < lines.length; i += 1) {
    if (matchesAny(lines[i], patterns)) return i;
  }
  return -1;
}

function nextMajorHeading(lines: string[], from: number) {
  for (let i = from; i < lines.length; i += 1) {
    if (matchesAny(lines[i], MAJOR_SECTION_PATTERNS)) return i;
  }
  return lines.length;
}

function blockAfter(lines: string[], patterns: RegExp[], maxLines = 14) {
  const start = findHeadingIndex(lines, patterns);
  if (start < 0) return "";
  const end = Math.min(nextMajorHeading(lines, start + 1), start + 1 + maxLines);
  const selected = lines
    .slice(start + 1, end)
    .filter((line) => !isLikelyPrompt(line))
    .filter((line) => !matchesAny(line, MAJOR_SECTION_PATTERNS));
  return selected.join(" · ").trim();
}

function firstUseful(value: string, max = 340) {
  if (!value) return "";
  const cleaned = value.replace(/\s*·\s*/g, " · ").trim();
  return cleaned.length > max ? `${cleaned.slice(0, max).trim()}…` : cleaned;
}

function extractByInlinePattern(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const value = match?.[1]?.trim();
    if (value && value.length >= 2) return firstUseful(value, 180);
  }
  return "";
}

function extractLifeAspects(lines: string[]) {
  const result: ProposalLifeAspect[] = [];
  for (const heading of LIFE_HEADINGS) {
    const start = findHeadingIndex(lines, heading.patterns);
    if (start < 0) continue;
    let end = lines.length;
    for (let i = start + 1; i < lines.length; i += 1) {
      const hitsOtherLifeHeading = LIFE_HEADINGS.some((other) => other.key !== heading.key && matchesAny(lines[i], other.patterns));
      const hitsMajor = matchesAny(lines[i], [/jurusanku/i, /kampus\s*impi/i, /milestone/i, /roadmap/i, /mimpi\s*[1-6]/i, /rundown/i]);
      if (hitsOtherLifeHeading || hitsMajor) {
        end = i;
        break;
      }
    }
    const content = lines
      .slice(start + 1, Math.min(end, start + 18))
      .filter((line) => !isLikelyPrompt(line))
      .filter((line) => !matchesAny(line, MAJOR_SECTION_PATTERNS))
      .join(" · ")
      .trim();
    if (content.length >= 3) result.push({ category: heading.key, content: firstUseful(content, 700) });
  }
  return result;
}

function extractRoadmap(lines: string[]) {
  const items: string[] = [];
  for (let number = 1; number <= 6; number += 1) {
    const pattern = new RegExp(`mimpi\\s*${number}\\b`, "i");
    const index = lines.findIndex((line) => pattern.test(line));
    if (index < 0) continue;
    const inline = cleanLine(lines[index].replace(pattern, "").replace(/^[:\-–—]+/, ""));
    let value = inline;
    if (!value || value.length < 3) {
      value = lines.slice(index + 1, index + 5).find((line) => !isLikelyPrompt(line) && !matchesAny(line, MAJOR_SECTION_PATTERNS)) ?? "";
    }
    if (value && value.length >= 3) items.push(firstUseful(value, 220));
  }
  return [...new Set(items)];
}

function extractMilestones(lines: string[]) {
  const start = findHeadingIndex(lines, [/milestone/i, /jurusanku.*kampus/i]);
  if (start < 0) return [];
  const end = Math.min(nextMajorHeading(lines, start + 1), start + 18);
  return [...new Set(
    lines
      .slice(start + 1, end)
      .filter((line) => !isLikelyPrompt(line))
      .filter((line) => line.length >= 4 && line.length <= 180)
      .filter((line) => !matchesAny(line, MAJOR_SECTION_PATTERNS))
      .slice(0, 8),
  )];
}

function detectCareer(text: string, lines: string[]) {
  const inline = extractByInlinePattern(text, [
    /(?:cita[- ]?cita(?:ku)?|target\s*karier|arah\s*karier|ingin\s*menjadi|profesi\s*(?:yang\s*)?diinginkan)\s*[:\-–—]?\s*([^\n]{2,120})/i,
  ]);
  if (inline) return inline;

  const careerBlock = blockAfter(lines, [/career/i, /karier/i, /pekerjaan/i, /cita[- ]?cita/i], 8);
  if (careerBlock) return firstUseful(careerBlock, 180);

  const known = text.match(/\b(PNS|ASN|dokter|guru|dosen|polisi|TNI|tentara|pengusaha|wirausaha|programmer|developer|arsitek|apoteker|perawat|psikolog|akuntan|pengacara)\b/i);
  return known?.[1] ?? "";
}

export function parseProposalText(rawText: string): ProposalExtraction {
  const text = rawText.replace(/\u00a0/g, " ").replace(/\r/g, "\n");
  const lines = linesFrom(text);
  const profile: ProposalProfileExtraction = {};
  const found: string[] = [];
  const needsReview: string[] = [];

  const expertise = firstUseful(blockAfter(lines, [/expertise/i, /keahlian/i, /bidang.*ahli/i], 12), 360);
  if (expertise) { profile.expertise = expertise; found.push("Expertise"); }

  const roleModel = firstUseful(blockAfter(lines, [/role\s*model/i, /tokoh.*inspir/i, /inspiras/i], 10), 320);
  if (roleModel) { profile.role_model = roleModel; found.push("Role Model"); }

  const personalBrand = firstUseful(blockAfter(lines, [/prestasi/i, /personal\s*brand/i, /my\s*brand/i], 14), 520);
  if (personalBrand) { profile.personal_brand = personalBrand; found.push("Prestasi / Personal Brand"); }

  const career = detectCareer(text, lines);
  if (career) { profile.career_direction = career; found.push("Arah Karier"); }

  const educationTarget = extractByInlinePattern(text, [
    /(?:target\s*pendidikan|pendidikan\s*impian|jenjang\s*pendidikan)\s*[:\-–—]?\s*([^\n]{2,120})/i,
  ]) || firstUseful(blockAfter(lines, [/target\s*pendidikan/i, /pendidikan\s*impian/i], 7), 180);
  if (educationTarget) { profile.education_target = educationTarget; found.push("Target Pendidikan"); }

  const majorTarget = extractByInlinePattern(text, [
    /(?:target\s*jurusan|jurusan(?:ku)?(?:\s*impian)?)\s*[:\-–—]?\s*([^\n]{2,120})/i,
  ]);
  if (majorTarget && !/kampus/i.test(majorTarget)) { profile.major_target = majorTarget; found.push("Target Jurusan"); }

  const campusTarget = extractByInlinePattern(text, [
    /(?:target\s*kampus|kampus\s*impian(?:ku)?)\s*[:\-–—]?\s*([^\n]{2,120})/i,
  ]);
  if (campusTarget) { profile.campus_target = campusTarget; found.push("Target Kampus"); }

  const mentor = extractByInlinePattern(text, [/(?:mentor(?:ku)?)\s*[:\-–—]\s*([^\n]{2,120})/i]);
  if (mentor) { profile.mentor = mentor; found.push("Mentor"); }

  const lifeAspects = extractLifeAspects(lines);
  if (lifeAspects.length) found.push(`${lifeAspects.length} aspek Life Map`);

  const milestones = extractMilestones(lines);
  if (milestones.length) found.push(`${milestones.length} milestone`);

  const roadmap = extractRoadmap(lines);
  if (roadmap.length) found.push(`${roadmap.length} item roadmap`);

  if (!profile.expertise) needsReview.push("Expertise belum ditemukan jelas");
  if (!profile.career_direction) needsReview.push("Arah karier belum ditemukan jelas");
  if (!profile.campus_target) needsReview.push("Target kampus belum ditemukan / belum diisi");
  if (!profile.major_target) needsReview.push("Target jurusan belum ditemukan / belum diisi");
  if (!milestones.length) needsReview.push("Milestone belum terisi jelas");
  if (!roadmap.length) needsReview.push("Roadmap belum terisi jelas");

  profile.summary_notes = `Smart Proposal Reader membaca ${found.length} kelompok data dari dokumen. ${needsReview.length ? `${needsReview.length} bagian perlu dicek.` : "Semua bagian utama terdeteksi."}`;

  return {
    profile,
    lifeAspects,
    milestones,
    roadmap,
    found,
    needsReview,
    textLength: text.length,
  };
}
