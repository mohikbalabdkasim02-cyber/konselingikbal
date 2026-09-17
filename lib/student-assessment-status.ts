export type PortalProgress = {
  status: "not_started" | "in_progress" | "completed" | "exploring";
  label: "Belum mulai" | "Sedang diisi" | "Selesai" | "Sedang dieksplorasi";
  actionLabel: string;
  progress: number | null;
  detail: string;
};

export function deriveAssessmentStatus({
  attemptStatus,
  answeredCount = 0,
  totalItems,
}: {
  attemptStatus?: string | null;
  answeredCount?: number;
  totalItems: number;
}): PortalProgress {
  if (attemptStatus === "submitted") {
    return {
      status: "completed",
      label: "Selesai",
      actionLabel: "Lihat status",
      progress: 100,
      detail: "Jawaban sudah dikirim ke sistem BK.",
    };
  }

  if (attemptStatus === "draft") {
    const safeTotal = Math.max(totalItems, 1);
    const progress = Math.min(99, Math.round((Math.max(answeredCount, 0) / safeTotal) * 100));
    return {
      status: "in_progress",
      label: "Sedang diisi",
      actionLabel: "Lanjutkan",
      progress,
      detail: answeredCount > 0 ? `${answeredCount} jawaban sudah tersimpan.` : "Draft sudah dibuat dan dapat dilanjutkan.",
    };
  }

  return {
    status: "not_started",
    label: "Belum mulai",
    actionLabel: "Mulai",
    progress: 0,
    detail: "Belum ada pengisian untuk asesmen ini.",
  };
}

export function deriveCareerStatus({
  profileFilledCount = 0,
  choiceCount = 0,
  portfolioCount = 0,
}: {
  profileFilledCount?: number;
  choiceCount?: number;
  portfolioCount?: number;
}): PortalProgress {
  const activityCount = Math.max(profileFilledCount, 0) + Math.max(choiceCount, 0) + Math.max(portfolioCount, 0);
  if (activityCount === 0) {
    return {
      status: "not_started",
      label: "Belum mulai",
      actionLabel: "Mulai eksplorasi",
      progress: null,
      detail: "Mulai dari Kenali Diriku lalu lanjutkan eksplorasi karier.",
    };
  }

  return {
    status: "exploring",
    label: "Sedang dieksplorasi",
    actionLabel: "Lanjutkan",
    progress: null,
    detail: "BK Karier bersifat perjalanan berulang, bukan asesmen sekali submit.",
  };
}
