"use client";

export function AssessmentProgress({ current, total }: { current: number; total: number }) {
  const percent = total > 0 ? Math.round(((current + 1) / total) * 100) : 0;
  return (
    <div className="assessment-progress" aria-label={`Bagian ${current + 1} dari ${total}`}>
      <div><span>Bagian {current + 1} dari {total}</span><strong>{percent}%</strong></div>
      <div className="assessment-progress-track"><span style={{ width: `${percent}%` }}/></div>
    </div>
  );
}
