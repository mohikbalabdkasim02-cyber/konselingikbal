import { NextResponse } from "next/server";

const SUPABASE_STORAGE_HOST = "pmfmrybzdkfmmmsdlddj.supabase.co";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const PDF_MIME = "application/pdf";
const PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

function decodeXml(value: string) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

async function extractPptx(buffer: Buffer) {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(buffer);
  const slideNames = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => {
      const an = Number(a.match(/slide(\d+)\.xml/i)?.[1] ?? 0);
      const bn = Number(b.match(/slide(\d+)\.xml/i)?.[1] ?? 0);
      return an - bn;
    });

  const slides: string[] = [];
  for (const name of slideNames) {
    const xml = await zip.file(name)?.async("string");
    if (!xml) continue;
    const chunks = [...xml.matchAll(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/gi)]
      .map((match) => decodeXml(match[1]).trim())
      .filter(Boolean);
    if (chunks.length) slides.push(chunks.join("\n"));
  }
  return slides.join("\n\n");
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { url?: string; mimeType?: string; fileName?: string };
    if (!body.url || !body.mimeType) {
      return NextResponse.json({ error: "URL dan tipe file wajib tersedia." }, { status: 400 });
    }

    const url = new URL(body.url);
    if (url.protocol !== "https:" || url.hostname !== SUPABASE_STORAGE_HOST) {
      return NextResponse.json({ error: "Sumber dokumen tidak diizinkan." }, { status: 400 });
    }

    if (![PDF_MIME, DOCX_MIME, PPTX_MIME].includes(body.mimeType)) {
      return NextResponse.json({
        error: "Format lama DOC/PPT tetap dapat disimpan, tetapi pembacaan otomatis hanya mendukung PDF, DOCX, dan PPTX."
      }, { status: 415 });
    }

    const response = await fetch(url.toString(), { cache: "no-store" });
    if (!response.ok) {
      return NextResponse.json({ error: "Dokumen tidak dapat diambil dari penyimpanan." }, { status: 502 });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    let text = "";

    if (body.mimeType === DOCX_MIME) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (body.mimeType === PDF_MIME) {
      const pdfParse = (await import("pdf-parse")).default;
      const result = await pdfParse(buffer);
      text = result.text;
    } else if (body.mimeType === PPTX_MIME) {
      text = await extractPptx(buffer);
    }

    const normalized = text.replace(/\u0000/g, "").trim();
    if (normalized.length < 10) {
      return NextResponse.json({ error: "Teks proposal belum dapat dibaca dengan cukup jelas dari dokumen ini." }, { status: 422 });
    }

    return NextResponse.json({
      text: normalized.slice(0, 350000),
      textLength: normalized.length,
      fileName: body.fileName ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal membaca dokumen.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
