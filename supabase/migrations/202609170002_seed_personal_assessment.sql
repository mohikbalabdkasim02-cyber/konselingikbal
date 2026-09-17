insert into public.assessment_definitions (slug, domain, version, title, subtitle, intro, is_active)
values (
  'pribadi',
  'personal',
  1,
  'Asesmen Kebutuhan Bimbingan Pribadi',
  'Kenali Diri • Kelola Emosi • Bangun Kebiasaan • Tumbuh dengan Nilai',
  'Asesmen ini membantu siswa mengenali kebutuhan pribadi yang sedang mengganggu kenyamanan, perkembangan, ibadah, relasi, atau proses belajar. Hasil asesmen bukan label kepribadian dan bukan diagnosis klinis.',
  true
)
on conflict (slug, version) do update set
  title = excluded.title,
  subtitle = excluded.subtitle,
  intro = excluded.intro,
  is_active = true;
