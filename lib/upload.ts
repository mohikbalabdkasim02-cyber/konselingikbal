import type { SupabaseClient } from "@supabase/supabase-js";

export const MAX_PROPOSAL_BYTES = 20 * 1024 * 1024;
export const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export const PDF_MIME = "application/pdf";
export const DOC_MIME = "application/msword";

const SUPABASE_URL = "https://pmfmrybzdkfmmmsdlddj.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_a953yOUs9wPEmE_6L0q2mA_8kyqflUn";
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

function encodeStoragePath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function getFreshAccessToken(supabase: SupabaseClient) {
  let { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;

  const expiresSoon = Boolean(session?.expires_at && session.expires_at * 1000 <= Date.now() + 60_000);
  if (expiresSoon) {
    const refreshed = await supabase.auth.refreshSession();
    if (refreshed.error) throw refreshed.error;
    session = refreshed.data.session;
  }

  if (!session?.access_token) {
    throw new Error("Unauthorized: sesi login tidak tersedia. Silakan masuk ulang.");
  }
  return session.access_token;
}

async function uploadOnce(args: {
  token: string;
  bucket: string;
  path: string;
  file: File;
  mimeType: string;
}) {
  const { token, bucket, path, file, mimeType } = args;
  const endpoint = `${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(bucket)}/${encodeStoragePath(path)}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": mimeType,
      "cache-control": "3600",
      "x-upsert": "true",
    },
    body: file,
  });

  if (response.ok) return;

  let detail = "";
  try {
    detail = await response.text();
  } catch {
    detail = "";
  }
  throw new Error(`Storage upload gagal (${response.status}). ${detail || response.statusText}`);
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
  let token = await getFreshAccessToken(supabase);

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await uploadOnce({ token, bucket, path, file, mimeType });
      return;
    } catch (error) {
      lastError = error;

      // Refresh once if the server reports an authentication failure.
      const message = error instanceof Error ? error.message : "";
      if ((message.includes("(401)") || message.includes("(403)")) && attempt < attempts) {
        token = await getFreshAccessToken(supabase);
      }

      if (attempt < attempts) await wait(700 * attempt);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Upload file gagal setelah beberapa percobaan.");
}

export function safeStorageFileName(name: string) {
  return name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
}
