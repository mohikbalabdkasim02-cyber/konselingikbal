import type { SupabaseClient } from "@supabase/supabase-js";

export const MAX_PROPOSAL_BYTES = 20 * 1024 * 1024;
export const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export const PDF_MIME = "application/pdf";
export const DOC_MIME = "application/msword";

const ALLOWED_EXTENSIONS = ["pdf", "docx", "doc"] as const;
const ALLOWED_MIMES = [PDF_MIME, DOCX_MIME, DOC_MIME];

export type UploadPhase = "idle" | "validating" | "uploading" | "recording" | "complete" | "error";

export function inferMimeType(file: Pick<File, "name" | "type">): string {
  if (file.type && ALLOWED_MIMES.includes(file.type)) return file.type;
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "pdf") return PDF_MIME;
  if (extension === "docx") return DOCX_MIME;
  if (extension === "doc") return DOC_MIME;
  return file.type || "application/octet-stream";
}

export function validateProposalFile(file: Pick<File, "name" | "type" | "size">): { mimeType: string } {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXTENSIONS.includes(extension as (typeof ALLOWED_EXTENSIONS)[number])) {
    throw new Error("Format file tidak didukung. Gunakan PDF, DOCX, atau DOC.");
  }
  const mimeType = inferMimeType(file);
  if (!ALLOWED_MIMES.includes(mimeType)) {
    throw new Error("Format file tidak didukung. Gunakan PDF, DOCX, atau DOC.");
  }
  if (file.size <= 0) throw new Error("File kosong dan tidak dapat diunggah.");
  if (file.size > MAX_PROPOSAL_BYTES) throw new Error("Ukuran file terlalu besar. Maksimal 20 MB.");
  return { mimeType };
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function uploadStorageWithRetry(args: {
  supabase: SupabaseClient;
  bucket: string;
  path: string;
  file: File;
  mimeType: string;
  attempts?: number;
}): Promise<void> {
  const { supabase, bucket, path, file, mimeType, attempts = 3 } = args;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const { error } = await supabase.storage.from(bucket).upload(path, file, {
        contentType: mimeType,
        cacheControl: "3600",
        upsert: true,
      });
      if (error) throw error;
      return;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await wait(650 * attempt);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Upload file gagal setelah beberapa percobaan.");
}

export function safeStorageFileName(name: string) {
  return name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
}
