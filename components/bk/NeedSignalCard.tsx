import Link from "next/link";
import { AlertTriangle, ChevronRight, ShieldAlert } from "lucide-react";

type NeedSignal = {
  id: string;
  student_id: string;
  domain: string;
  kind: string;
  severity: "info" | "attention" | "urgent";
  status: string;
  created_at: string;
  students?: { full_name?: string | null; classes?: { name?: string | null } | null } | null;
};

const DOMAIN: Record<string,string> = { personal:"Pribadi", learning:"Belajar", social:"Sosial", career:"Karier" };

function signalLabel(kind: string) {
  if (kind.includes("self_harm")) return "Perlu pemeriksaan keselamatan segera";
  if (kind.includes("violence")) return "Indikator kekerasan / keselamatan";
  if (kind.includes("sexual")) return "Indikator keselamatan sensitif";
  if (kind.includes("extortion")) return "Indikator pemerasan / keselamatan";
  if (kind.includes("bullying")) return "Perundungan berulang perlu ditindaklanjuti";
  if (kind.includes("threat")) return "Indikator ancaman keselamatan";
  if (kind.includes("help_now")) return "Siswa meminta bantuan segera";
  if (kind.includes("request")) return "Siswa meminta berbicara dengan Guru BK";
  return "Hasil asesmen membutuhkan perhatian Guru BK";
}

export function NeedSignalCard({ signal, onReview }:{ signal: NeedSignal; onReview?: (id:string)=>void }) {
  const urgent = signal.severity === "urgent";
  return <article className={`need-signal-card ${urgent ? "urgent" : signal.severity}`}>
    <div className="need-signal-icon">{urgent ? <ShieldAlert size={19}/> : <AlertTriangle size={19}/>}</div>
    <div className="need-signal-copy">
      <div className="need-signal-meta"><span>{DOMAIN[signal.domain] ?? signal.domain}</span><span>{urgent ? "SEGERA" : "PERLU PERHATIAN"}</span></div>
      <strong>{signal.students?.full_name ?? "Siswa"}</strong>
      <small>{signal.students?.classes?.name ?? "Kelas belum tersedia"}</small>
      <p>{signalLabel(signal.kind)}</p>
      <span className="need-signal-privacy">Isi jawaban sensitif tidak ditampilkan di antrean umum.</span>
    </div>
    <div className="need-signal-actions">
      <Link href={`/students/${signal.student_id}`}>Buka Student 360 <ChevronRight size={15}/></Link>
      {signal.status === "open" && onReview && <button onClick={()=>onReview(signal.id)}>Tandai ditinjau</button>}
    </div>
  </article>;
}
