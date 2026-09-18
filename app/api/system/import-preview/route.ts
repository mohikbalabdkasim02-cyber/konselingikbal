import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { normalizeRosterObjects, parseDelimitedRosterText, parsePdfRosterText } from "@/lib/roster-import";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "File belum dipilih." }, { status: 400 });
    if (file.size > 15 * 1024 * 1024) return NextResponse.json({ error: "Ukuran file maksimal 15 MB." }, { status: 413 });

    const name = file.name.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());

    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) return NextResponse.json({ error: "Workbook tidak memiliki sheet." }, { status: 400 });
      const objects = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], { defval: "" });
      return NextResponse.json({ ...normalizeRosterObjects(objects), source: "excel", sheet: sheetName });
    }

    if (name.endsWith(".csv") || name.endsWith(".tsv") || file.type.startsWith("text/")) {
      return NextResponse.json({ ...parseDelimitedRosterText(buffer.toString("utf8")), source: "text" });
    }

    if (name.endsWith(".pdf") || file.type === "application/pdf") {
      const mod = await import("pdf-parse");
      const parse = mod.default;
      const result = await parse(buffer);
      return NextResponse.json({ ...parsePdfRosterText(result.text ?? ""), source: "pdf" });
    }

    return NextResponse.json({ error: "Format belum didukung. Gunakan XLSX, XLS, CSV, TSV, atau PDF." }, { status: 415 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "File belum dapat diproses." }, { status: 500 });
  }
}
