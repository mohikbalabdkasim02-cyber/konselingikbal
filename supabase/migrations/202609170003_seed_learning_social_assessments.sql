insert into public.assessment_definitions (slug, domain, version, title, subtitle, intro, is_active)
values
(
  'belajar',
  'learning',
  1,
  'Asesmen Bimbingan Belajar',
  'Masalah Belajar • Penyebab • Dampak • Kebutuhan & Aksi',
  'Asesmen ini membantu siswa dan Guru BK memahami kondisi belajar secara lebih mendalam. Hasilnya bukan label rajin atau malas, melainkan bahan refleksi untuk menentukan dukungan yang paling dibutuhkan.',
  true
),
(
  'sosial',
  'social',
  1,
  'Asesmen Sosial',
  'Sekolah • Kelas • Guru • Teman',
  'Asesmen ini membantu siswa mengenali masalah sosial yang dialami di lingkungan sekolah, memahami dampaknya, memilih respons yang lebih sehat, dan menentukan kapan perlu meminta bantuan. Hasil digunakan sebagai bahan percakapan antara siswa dan Guru BK, bukan sebagai alat menghukum atau memberi label.',
  true
)
on conflict (slug, version) do update set
  title = excluded.title,
  subtitle = excluded.subtitle,
  intro = excluded.intro,
  is_active = true;
