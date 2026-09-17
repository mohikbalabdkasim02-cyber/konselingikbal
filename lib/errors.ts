export function toUserMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const message = raw.toLowerCase();

  if (!raw) return "Terjadi kendala. Silakan coba lagi.";
  if (message.includes("failed to fetch") || message.includes("networkerror") || message.includes("network request failed")) {
    return "Koneksi ke server terputus. Periksa internet lalu coba lagi.";
  }
  if (message.includes("timeout") || message.includes("timed out")) {
    return "Proses terlalu lama dan dihentikan. Silakan coba lagi.";
  }
  if (message.includes("payload too large") || message.includes("file size") || message.includes("too large")) {
    return "Ukuran file terlalu besar. Maksimal 20 MB.";
  }
  if (message.includes("mime") || message.includes("content type") || message.includes("format")) {
    return "Format file tidak didukung. Gunakan PDF, DOCX, atau DOC.";
  }
  if (message.includes("row-level security") || message.includes("permission") || message.includes("not authorized") || message.includes("unauthorized")) {
    return "Akses ditolak. Silakan masuk ulang atau hubungi admin BK.";
  }
  if (message.includes("storage") || message.includes("bucket") || message.includes("object")) {
    return "File belum berhasil disimpan. Silakan coba unggah kembali.";
  }

  return raw.length > 180 ? "Terjadi kendala saat memproses data. Silakan coba lagi." : raw;
}
