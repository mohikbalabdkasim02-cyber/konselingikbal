import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";

export default function OfflinePage() {
  return (
    <main className="stage6-offline">
      <section className="stage6-offline-card">
        <BrandLogo />
        <p className="stage6-kicker">MODE OFFLINE</p>
        <h1>Koneksi internet sedang tidak tersedia.</h1>
        <p>
          LifeMap menjaga data siswa tetap aman dengan tidak menyimpan asesmen, hasil konseling,
          atau respons Supabase ke cache perangkat. Sambungkan kembali internet untuk melanjutkan.
        </p>
        <Link href="/" className="stage6-primary-link">Coba lagi</Link>
      </section>
    </main>
  );
}
