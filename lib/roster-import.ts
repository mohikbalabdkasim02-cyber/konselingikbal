export type NormalizedRosterRow = {
  full_name: string;
  class_name: string;
  grade?: number;
  nis?: string;
  nisn?: string;
  gender?: "L" | "P";
  email?: string;
};

const HEADER_ALIASES: Record<string, keyof NormalizedRosterRow> = {
  nama: "full_name",
  nama_siswa: "full_name",
  namasiswa: "full_name",
  full_name: "full_name",
  fullname: "full_name",
  siswa: "full_name",
  kelas: "class_name",
  rombel: "class_name",
  class: "class_name",
  class_name: "class_name",
  classname: "class_name",
  tingkat: "grade",
  grade: "grade",
  nis: "nis",
  nisn: "nisn",
  jk: "gender",
  gender: "gender",
  jenis_kelamin: "gender",
  jeniskelamin: "gender",
  email: "email",
  surel: "email",
};

export function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s./-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

export function inferGrade(className: string) {
  const name = className.trim().toUpperCase();
  if (/^XII([^I]|$)/.test(name)) return 12;
  if (/^XI([^I]|$)/.test(name)) return 11;
  if (/^X([^I]|$)/.test(name)) return 10;
  return undefined;
}

export function normalizeGender(value: unknown): "L" | "P" | undefined {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return undefined;
  if (["l", "lk", "laki-laki", "laki laki", "male", "m"].includes(raw)) return "L";
  if (["p", "pr", "perempuan", "female", "f"].includes(raw)) return "P";
  return undefined;
}

export function normalizeRosterObjects(input: Record<string, unknown>[]) {
  const rows: NormalizedRosterRow[] = [];
  const warnings: string[] = [];

  input.forEach((raw, index) => {
    const mapped: Record<string, unknown> = {};
    Object.entries(raw).forEach(([key, value]) => {
      const alias = HEADER_ALIASES[normalizeHeader(key)];
      if (alias) mapped[alias] = value;
    });

    const fullName = String(mapped.full_name ?? "").trim();
    const className = String(mapped.class_name ?? "").trim();
    if (!fullName && !className) return;
    if (!fullName || !className) {
      warnings.push(`Baris ${index + 2}: nama siswa atau kelas kosong.`);
      return;
    }

    const gradeValue = Number(mapped.grade);
    const grade = [10, 11, 12].includes(gradeValue) ? gradeValue : inferGrade(className);
    const row: NormalizedRosterRow = {
      full_name: fullName.replace(/\s+/g, " "),
      class_name: className.replace(/\s+/g, " "),
      ...(grade ? { grade } : {}),
    };

    const nis = String(mapped.nis ?? "").trim();
    const nisn = String(mapped.nisn ?? "").trim();
    const email = String(mapped.email ?? "").trim().toLowerCase();
    const gender = normalizeGender(mapped.gender);
    if (nis) row.nis = nis;
    if (nisn) row.nisn = nisn;
    if (email) row.email = email;
    if (gender) row.gender = gender;
    rows.push(row);
  });

  return { rows, warnings };
}

function splitDelimitedLine(line: string, delimiter: string) {
  if (delimiter !== ",") return line.split(delimiter).map((part) => part.trim());
  const out: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else quoted = !quoted;
    } else if (char === "," && !quoted) {
      out.push(current.trim());
      current = "";
    } else current += char;
  }
  out.push(current.trim());
  return out;
}

export function parseDelimitedRosterText(text: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return { rows: [] as NormalizedRosterRow[], warnings: ["File kosong."] };

  const delimiter = lines[0].includes("\t") ? "\t" : lines[0].includes(";") ? ";" : ",";
  const rawHeaders = splitDelimitedLine(lines[0], delimiter);
  const normalized = rawHeaders.map(normalizeHeader);
  const objects = lines.slice(1).map((line) => {
    const cells = splitDelimitedLine(line, delimiter);
    return Object.fromEntries(normalized.map((header, index) => [header, cells[index] ?? ""]));
  });
  return normalizeRosterObjects(objects);
}

export function parsePdfRosterText(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const rows: NormalizedRosterRow[] = [];
  const warnings: string[] = [];
  let currentClass = "";

  for (const raw of lines) {
    const classOnly = raw.match(/^(XII|XI|X)\s+[A-Za-z].{1,50}$/i);
    if (classOnly && !/\d{4,}/.test(raw)) {
      currentClass = raw;
      continue;
    }

    const columns = raw.split(/\s{2,}|\t|\s*\|\s*/).filter(Boolean);
    if (columns.length >= 2) {
      const maybeClass = columns.find((cell) => /^(XII|XI|X)\b/i.test(cell.trim()));
      const maybeName = columns.find((cell) => /[A-Za-z]{2}/.test(cell) && !/^(XII|XI|X)\b/i.test(cell.trim()));
      if (maybeClass && maybeName) {
        rows.push({
          full_name: maybeName.trim(),
          class_name: maybeClass.trim(),
          grade: inferGrade(maybeClass),
        });
        currentClass = maybeClass.trim();
        continue;
      }
    }

    if (currentClass) {
      const cleaned = raw.replace(/^\d+[.)\-]?\s*/, "").trim();
      if (/^[A-Za-zÀ-ÿ.'’\- ]{3,80}$/.test(cleaned) && !/^(nama|kelas|nis|nisn|no\.?)/i.test(cleaned)) {
        rows.push({ full_name: cleaned, class_name: currentClass, grade: inferGrade(currentClass) });
      }
    }
  }

  if (!rows.length) warnings.push("Teks PDF terbaca, tetapi pola nama/kelas belum dikenali. Gunakan Excel/CSV untuk hasil paling presisi.");
  else warnings.push("Import PDF memakai pembacaan heuristik. Periksa preview sebelum menyimpan.");

  return { rows, warnings };
}
