# Bina Insan LifeMap

Dashboard pemantauan siswa, arah karier, dan pendampingan BK untuk SMA Islam Terpadu Bina Insan Palu.

## Status

**Tahap 1 — Foundation** sudah diimplementasikan:

- Next.js + TypeScript
- UI dominan putih dengan aksen deep emerald
- Supabase Auth
- PostgreSQL + Row Level Security
- Tahun ajaran 2026/2027
- Kelas X Abu Bakar dan X Umar Bin Khattab
- 52 data siswa awal
- Student directory, pencarian, filter kelas, dan quick detail drawer

## Environment

Salin `.env.example` menjadi `.env.local`, lalu isi publishable key Supabase.

```bash
npm install
npm run dev
```

## Supabase

Project ref: `pmfmrybzdkfmmmsdlddj`

Data siswa menggunakan UUID internal sebagai primary key. NIS/NISN dari sumber tetap disimpan apa adanya agar data administratif yang belum valid tidak mengganggu relasi aplikasi.

## Tahapan berikutnya

Tahap 2 akan menambahkan proposal Word/PDF, document viewer, versioning, Life Map, Career Map, milestone, dan roadmap.

Tahap 3 akan menambahkan counseling workspace, follow-up, analytics, report, audit trail, dan deployment production Vercel.
