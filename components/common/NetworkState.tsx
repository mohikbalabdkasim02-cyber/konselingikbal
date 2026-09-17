"use client";

import { CheckCircle2, Loader2, UploadCloud, WifiOff } from "lucide-react";
import type { UploadPhase } from "@/lib/upload";

const LABELS: Record<UploadPhase, string> = {
  idle: "",
  validating: "Memeriksa file…",
  uploading: "Mengunggah proposal…",
  recording: "Menyimpan versi dokumen…",
  complete: "Upload selesai",
  error: "Upload terhenti",
};

export function NetworkState({ phase, detail, onRetry }: { phase: UploadPhase; detail?: string; onRetry?: () => void }) {
  if (phase === "idle") return null;
  const Icon = phase === "error" ? WifiOff : phase === "complete" ? CheckCircle2 : phase === "uploading" ? UploadCloud : Loader2;
  return (
    <div className={`network-state ${phase}`} aria-live="polite">
      <Icon size={18} className={phase === "validating" || phase === "uploading" || phase === "recording" ? "spin-soft" : ""}/>
      <div><strong>{LABELS[phase]}</strong>{detail && <span>{detail}</span>}</div>
      {phase === "error" && onRetry && <button type="button" onClick={onRetry}>Coba Lagi</button>}
    </div>
  );
}
