import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import { normalizeRosterObjects, parseDelimitedRosterText, parsePdfRosterText } from "@/lib/roster-import";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) return NextResponse.json({ error: "Akses staff diperlukan." }, { status: 401 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return NextResponse.json({ error: "Konfigurasi server belum lengkap." }, { status: 500 });

    const authClient = createClient(url, key, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData.user) return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });
    const staff = await authClient.rpc("is_staff");
    if (staff.error || staff.data !== true) return NextResponse.json({ error: "Akses hanya untuk Guru BK/staff." }, { status: 403 });

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
