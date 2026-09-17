import type { AssessmentDefinition } from "./types";

const impact5 = [
  { value: "1", label: "1 · Tidak terasa", score: 1 },
  { value: "2", label: "2 · Ringan", score: 2 },
  { value: "3", label: "3 · Sedang", score: 3 },
  { value: "4", label: "4 · Berat", score: 4 },
  { value: "5", label: "5 · Sangat berat", score: 5 },
];
const yesNo = [{ value: "yes", label: "Ya" }, { value: "no", label: "Tidak" }];
const multi = (labels: string[]) => labels.map((label, index) => ({ value: `o${index + 1}`, label }));

export const socialAssessmentV1: AssessmentDefinition = {
  slug: "sosial",
  version: 1,
  domain: "social",
  title: "Asesmen Sosial",
  subtitle: "Sekolah • Kelas • Guru • Teman",
  intro: "Memahami masalah sosial bukan untuk mencari siapa yang salah, tetapi untuk menemukan cara yang aman, adil, beradab, dan membangun. Hasil digunakan sebagai bahan percakapan dan pendampingan Guru BK, bukan sebagai alat menghukum atau memberi label.",
  sections: [
    {
      id: "initial_map",
      title: "Peta Masalah Awal",
      description: "Jawab berdasarkan pengalaman nyata. Anda boleh melewati pertanyaan yang membuat tidak nyaman dan membahasnya langsung dengan Guru BK.",
      items: [
        { id: "social_initial_areas", prompt: "Area masalah yang sedang saya alami", type: "multi", options: multi([
          "Masalah di lingkungan sekolah",
          "Masalah di dalam kelas",
          "Masalah dengan guru",
          "Masalah dengan teman",
          "Belum yakin / ingin dibantu mengidentifikasi",
        ]) },
      ],
    },
    {
      id: "school",
      title: "Pilar 1 • Masalah di Lingkungan Sekolah",
      description: "Apakah lingkungan sekolah membuat saya merasa aman, dihargai, diterima, dan mampu menjalani kegiatan sekolah dengan nyaman?",
      items: [
        { id: "school_issues", prompt: "A. Apa yang sedang terjadi?", type: "multi", options: multi([
          "Saya merasa tidak nyaman berada di sekolah.",
          "Saya takut berada di tempat tertentu di sekolah.",
          "Saya merasa diperlakukan tidak adil oleh lingkungan sekolah.",
          "Saya sulit menyesuaikan diri dengan aturan/kebiasaan sekolah.",
          "Saya merasa tidak diterima atau tersisih.",
          "Saya mengalami ejekan, intimidasi, ancaman, atau perundungan.",
          "Saya merasa terlalu banyak tekanan dari kegiatan sekolah.",
          "Saya mengalami konflik dengan kakak kelas/adik kelas.",
          "Saya merasa ruang/fasilitas tertentu tidak aman/nyaman.",
        ]) },
        { id: "school_issue_other", prompt: "Lainnya", type: "text" },
        { id: "school_facts", prompt: "B. Jelaskan fakta yang terjadi — Apa yang terjadi? Di mana? Kapan? Siapa yang terlibat? Apa yang benar-benar Anda lihat/dengar/alami?", type: "textarea", sensitive: true },
        { id: "school_impact", prompt: "C. Seberapa besar dampaknya?", type: "likert", options: impact5 },
        { id: "school_impact_areas", prompt: "Dampak yang saya rasakan", type: "multi", options: multi([
          "Sulit konsentrasi belajar", "Enggan masuk sekolah", "Takut/gelisah", "Sedih/marah", "Prestasi menurun", "Menarik diri", "Konflik semakin luas", "Tidak berdampak besar",
        ]) },
        { id: "school_done", prompt: "D. Apa yang sudah saya lakukan?", type: "textarea" },
        { id: "school_needs", prompt: "E. Apa yang saya butuhkan dari sekolah?", type: "multi", options: multi([
          "Didengarkan tanpa dihakimi", "Mediasi yang aman", "Perlindungan dari intimidasi", "Penjelasan aturan", "Dukungan Guru BK", "Pendampingan wali kelas", "Komunikasi dengan orang tua", "Penanganan khusus sesuai prosedur sekolah",
        ]) },
      ],
    },
    {
      id: "classroom",
      title: "Pilar 2 • Masalah di Dalam Kelas",
      description: "Apakah suasana kelas membantu saya belajar, berinteraksi, menyampaikan pendapat, dan menjadi bagian dari kelompok secara sehat?",
      items: [
        { id: "class_issues", prompt: "A. Masalah yang saya rasakan di kelas", type: "multi", options: multi([
          "Kelas terlalu gaduh sehingga sulit belajar.", "Ada kelompok/geng yang membuat siswa lain tersisih.", "Saya sulit bekerja dalam kelompok.", "Saya sering diejek atau dipermalukan di kelas.", "Pendapat saya tidak dihargai.", "Saya sering berkonflik dengan teman sekelas.", "Saya merasa tidak punya teman dekat di kelas.", "Ada persaingan yang tidak sehat.", "Saya takut berbicara/presentasi karena respons teman.", "Pembagian tugas kelompok terasa tidak adil.", "Ada candaan yang melewati batas.",
        ]) },
        { id: "class_issue_other", prompt: "Lainnya", type: "text" },
        { id: "class_triggers", prompt: "B. Situasi pemicu", type: "multi", options: multi([
          "Saat pelajaran", "Saat kerja kelompok", "Saat istirahat", "Saat presentasi", "Di grup kelas/WhatsApp", "Saat piket/kegiatan kelas", "Saat guru tidak ada",
        ]) },
        { id: "class_trigger_other", prompt: "Lainnya", type: "text" },
        { id: "class_feelings", prompt: "C. Apa yang saya rasakan dan pikirkan?", type: "textarea", sensitive: true },
        { id: "class_change", prompt: "D. Apa yang saya inginkan berubah?", type: "textarea" },
        { id: "class_solutions", prompt: "E. Solusi yang menurut saya aman dan realistis", type: "multi", options: multi([
          "Bicara empat mata dengan teman", "Minta fasilitasi wali kelas", "Konsultasi Guru BK", "Perbaiki pembagian peran kelompok", "Buat kesepakatan kelas", "Batasi candaan yang menyakiti", "Minta dukungan teman tepercaya", "Saya belum tahu dan perlu dibantu",
        ]) },
      ],
    },
    {
      id: "teacher",
      title: "Pilar 3 • Masalah dengan Guru",
      description: "Apakah saya dapat berkomunikasi dengan guru secara hormat dan aman, serta memahami masalahnya tanpa langsung menyimpulkan niat atau karakter guru?",
      items: [
        { id: "teacher_issues", prompt: "A. Masalah yang saya alami", type: "multi", options: multi([
          "Saya takut bertanya kepada guru.", "Saya merasa sulit dipahami oleh guru.", "Saya merasa pernah dipermalukan/ditegur di depan kelas.", "Saya merasa penilaian atau perlakuan kurang adil.", "Saya sulit mengikuti cara mengajar guru.", "Saya pernah salah paham dengan guru.", "Saya merasa guru terlalu keras terhadap saya.", "Saya merasa komunikasi saya dengan guru kurang baik.", "Saya pernah bereaksi tidak sopan dan ingin memperbaikinya.", "Saya takut menyampaikan keberatan secara baik.",
        ]) },
        { id: "teacher_issue_other", prompt: "Lainnya", type: "text" },
        { id: "teacher_facts", prompt: "B. Fakta yang terjadi", type: "textarea", sensitive: true },
        { id: "teacher_interpretation", prompt: "B. Pikiran/interpretasi saya", type: "textarea", sensitive: true },
        { id: "teacher_message", prompt: "C. Jika saya berbicara dengan guru, apa yang ingin saya sampaikan? Rumus: Ketika ___ terjadi, saya merasa ___ karena ___. Saya berharap/ingin meminta ___. Saya tetap menghormati Bapak/Ibu dan ingin mencari solusi yang baik.", type: "textarea" },
        { id: "teacher_help", prompt: "D. Bantuan yang saya butuhkan", type: "multi", options: multi([
          "Latihan cara bicara yang sopan dan jelas", "Guru BK mendampingi komunikasi", "Wali kelas membantu klarifikasi", "Saya ingin memperbaiki kesalahan saya", "Saya ingin didengarkan lebih dulu", "Perlu pertemuan terstruktur dengan guru",
        ]) },
        { id: "teacher_help_other", prompt: "Lainnya", type: "text" },
      ],
    },
    {
      id: "friends",
      title: "Pilar 4 • Masalah dengan Teman",
      description: "Apakah hubungan pertemanan saya saling menghargai, aman, tidak memaksa, tidak merendahkan, dan memberi ruang bagi masing-masing pihak untuk memiliki batas?",
      items: [
        { id: "friend_issues", prompt: "A. Situasi pertemanan yang sedang saya hadapi", type: "multi", options: multi([
          "Bertengkar/salah paham.", "Merasa diabaikan/dikucilkan.", "Diejek atau dijadikan bahan bercanda.", "Digosipkan/fitnah.", "Dipaksa mengikuti sesuatu.", "Takut kehilangan teman jika menolak.", "Teman terlalu mengontrol.", "Rahasia saya disebarkan.", "Konflik di media sosial/grup chat.", "Persaingan/cemburu.", "Perundungan berulang.", "Ancaman/pemerasan.", "Teman mengajak pada perilaku yang saya anggap salah.",
        ]) },
        { id: "friend_issue_other", prompt: "Lainnya", type: "text" },
        { id: "friend_healthy_1", prompt: "B. Saya dapat berkata ‘tidak’ tanpa takut diancam.", type: "yes_no", options: yesNo },
        { id: "friend_healthy_2", prompt: "B. Teman menghargai batas pribadi saya.", type: "yes_no", options: yesNo },
        { id: "friend_healthy_3", prompt: "B. Kami dapat berbeda pendapat tanpa menghina.", type: "yes_no", options: yesNo },
        { id: "friend_healthy_4", prompt: "B. Kesalahan dapat dibicarakan, bukan disebarkan.", type: "yes_no", options: yesNo },
        { id: "friend_healthy_5", prompt: "B. Saya tidak dipaksa memberikan uang/barang/jawaban tugas.", type: "yes_no", options: yesNo },
        { id: "friend_healthy_6", prompt: "B. Saya tidak takut bertemu dengannya.", type: "yes_no", options: yesNo },
        { id: "friend_healthy_7", prompt: "B. Pertemanan ini membuat saya bertumbuh, bukan terus tertekan.", type: "yes_no", options: yesNo },
        { id: "friend_boundary", prompt: "C. Apa batas yang ingin saya tetapkan?", type: "textarea" },
        { id: "friend_actions", prompt: "D. Apa pilihan tindakan saya?", type: "multi", options: multi([
          "Bicara langsung dengan tenang", "Minta maaf jika saya salah", "Menjaga jarak sementara", "Batasi interaksi digital", "Cari saksi/dukungan teman tepercaya", "Laporkan perundungan kepada guru/BK", "Minta mediasi", "Hubungi orang tua/orang dewasa tepercaya", "Saya belum tahu dan perlu dibantu",
        ]) },
      ],
    },
    {
      id: "safety",
      title: "Triase Keamanan • Kapan Harus Segera Minta Bantuan?",
      description: "Jangan tangani sendiri jika ada risiko keselamatan. Jika ada ancaman, kekerasan fisik, pemerasan, pelecehan seksual, penyebaran konten intim, stalking, perundungan berat/berulang, atau Anda takut datang ke sekolah, segera hubungi orang dewasa tepercaya/Guru BK sesuai prosedur sekolah.",
      items: [
        { id: "safety_threat", prompt: "Ada ancaman menyakiti saya/orang lain.", type: "yes_no", sensitive: true, options: [{value:"yes",label:"Ya",signal:{kind:"social_safety_threat",severity:"urgent",private:true}},{value:"no",label:"Tidak"}] },
        { id: "safety_violence", prompt: "Ada kekerasan fisik atau upaya kekerasan.", type: "yes_no", sensitive: true, options: [{value:"yes",label:"Ya",signal:{kind:"social_safety_violence",severity:"urgent",private:true}},{value:"no",label:"Tidak"}] },
        { id: "safety_sexual", prompt: "Ada sentuhan/komentar seksual yang tidak diinginkan.", type: "yes_no", sensitive: true, options: [{value:"yes",label:"Ya",signal:{kind:"social_safety_sexual",severity:"urgent",private:true}},{value:"no",label:"Tidak"}] },
        { id: "safety_extortion", prompt: "Ada pemerasan atau pengambilan uang/barang.", type: "yes_no", sensitive: true, options: [{value:"yes",label:"Ya",signal:{kind:"social_safety_extortion",severity:"urgent",private:true}},{value:"no",label:"Tidak"}] },
        { id: "safety_private_content", prompt: "Ada penyebaran foto/video/pesan pribadi tanpa izin.", type: "yes_no", sensitive: true, options: [{value:"yes",label:"Ya",signal:{kind:"social_safety_private_content",severity:"urgent",private:true}},{value:"no",label:"Tidak"}] },
        { id: "safety_bullying", prompt: "Perundungan terjadi berulang dan sulit dihentikan.", type: "yes_no", sensitive: true, options: [{value:"yes",label:"Ya",signal:{kind:"social_safety_bullying",severity:"urgent",private:true}},{value:"no",label:"Tidak"}] },
        { id: "safety_school_fear", prompt: "Saya sangat takut datang ke sekolah.", type: "yes_no", sensitive: true, options: [{value:"yes",label:"Ya",signal:{kind:"social_safety_school_fear",severity:"urgent",private:true}},{value:"no",label:"Tidak"}] },
        { id: "safety_self_harm", prompt: "Saya merasa tertekan sampai ingin menyakiti diri/putus asa.", type: "yes_no", sensitive: true, options: [{value:"yes",label:"Ya",signal:{kind:"social_safety_self_harm",severity:"urgent",private:true}},{value:"no",label:"Tidak"}] },
        { id: "safety_help_now", prompt: "Saya membutuhkan bantuan segera.", type: "yes_no", sensitive: true, options: [{value:"yes",label:"Ya",signal:{kind:"social_help_now",severity:"urgent",private:true}},{value:"no",label:"Tidak"}] },
        { id: "safety_talk_bk", prompt: "Saya ingin berbicara pribadi dengan Guru BK.", type: "yes_no", sensitive: true, options: [{value:"yes",label:"Ya",signal:{kind:"social_private_bk_request",severity:"attention",private:true}},{value:"no",label:"Tidak"}] },
      ],
    },
    {
      id: "analysis",
      title: "Analisis Masalah Sosial Saya",
      items: [
        { id: "analysis_area", prompt: "1. Masalah utama saya saat ini", type: "multi", options: multi(["Sekolah","Kelas","Guru","Teman","Lebih dari satu area"]) },
        { id: "analysis_main", prompt: "Masalah yang paling mengganggu saya adalah:", type: "textarea", sensitive: true },
        { id: "analysis_what", prompt: "2. Apa yang terjadi?", type: "textarea", sensitive: true },
        { id: "analysis_frequency", prompt: "Seberapa sering?", type: "single", options: multi(["Sekali","Kadang","Sering","Hampir setiap hari"]) },
        { id: "analysis_who", prompt: "Siapa yang terlibat?", type: "textarea", sensitive: true },
        { id: "analysis_trigger", prompt: "Apa pemicunya?", type: "textarea" },
        { id: "analysis_impact", prompt: "Apa dampaknya pada belajar/emosi?", type: "textarea" },
        { id: "analysis_tried", prompt: "Apa yang sudah saya coba?", type: "textarea" },
        { id: "analysis_need", prompt: "Apa yang saya butuhkan sekarang?", type: "textarea" },
        { id: "analysis_impact_score", prompt: "3. Tingkat dampak keseluruhan", type: "likert", options: impact5 },
        { id: "analysis_impact_reason", prompt: "Alasan", type: "textarea" },
      ],
    },
    {
      id: "action_plan",
      title: "Social Action Plan • Rencana Perbaikan",
      description: "Saya tidak harus menyelesaikan semua masalah sekaligus. Pilih satu perubahan kecil yang aman, realistis, dan dapat dilakukan dalam 7–14 hari.",
      items: [
        { id: "social_plan_problem", prompt: "Masalah prioritas", type: "text" },
        { id: "social_plan_goal", prompt: "Tujuan saya", type: "textarea" },
        { id: "social_plan_first_step", prompt: "Langkah pertama", type: "textarea" },
        { id: "social_plan_support_person", prompt: "Orang yang akan saya minta bantuannya", type: "text" },
        { id: "social_plan_sentence", prompt: "Kalimat yang akan saya gunakan", type: "textarea" },
        { id: "social_plan_boundary", prompt: "Batas yang perlu saya tetapkan", type: "textarea" },
        { id: "social_plan_review_date", prompt: "Tanggal evaluasi", type: "text" },
        { id: "social_support", prompt: "Pilihan dukungan", type: "multi", options: multi(["Guru BK","Wali kelas","Guru mata pelajaran","Orang tua/wali","Teman tepercaya","Pimpinan sekolah","Pendamping lain sesuai prosedur sekolah"]) },
      ],
    },
  ],
};
