export interface PageBuilderPatternBlock {
  readonly type: string;
  readonly props?: Readonly<Record<string, unknown>>;
}

export interface PageBuilderPattern {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: "landing" | "profile" | "content";
  readonly blocks: readonly PageBuilderPatternBlock[];
}

/** Serializable pattern metadata. The Dashboard materialises fresh block IDs on insert. */
export const PAGE_BUILDER_PATTERNS: readonly PageBuilderPattern[] = [
  {
    id: "landing",
    name: "Landing Page",
    description: "Hero, keunggulan, statistik, dan ajakan bertindak.",
    category: "landing",
    blocks: [
      {
        type: "hero",
        props: {
          eyebrow: "Selamat datang",
          text: "Bangun masa depan bersama kami",
          body: "Sampaikan nilai utama institusi Anda secara singkat, jelas, dan meyakinkan.",
          label: "Pelajari Selengkapnya",
          url: "#tentang",
          tone: "primary",
          align: "center",
        },
      },
      { type: "heading", props: { text: "Mengapa memilih kami?", level: 2 } },
      {
        type: "cards",
        props: {
          text: "Mengapa memilih kami?",
          columnCount: 3,
          cards: [
            { title: "Berkualitas", text: "Program yang relevan dan berstandar tinggi." },
            { title: "Kolaboratif", text: "Ekosistem yang membuka ruang untuk bertumbuh." },
            { title: "Berdampak", text: "Pengetahuan yang memberi manfaat nyata." },
          ],
        },
      },
      {
        type: "stats",
        props: {
          text: "Capaian kami",
          stats: [
            { value: "15.000+", label: "Mahasiswa" },
            { value: "100+", label: "Program" },
            { value: "50+", label: "Mitra" },
          ],
        },
      },
      {
        type: "callout",
        props: {
          text: "Siap mengambil langkah berikutnya?",
          body: "Temukan program dan layanan yang paling sesuai untuk Anda.",
          label: "Mulai Sekarang",
          url: "/kontak/",
          tone: "soft",
          align: "center",
        },
      },
    ],
  },
  {
    id: "profile",
    name: "Profil Institusi",
    description: "Pembuka, cerita singkat, nilai utama, dan capaian.",
    category: "profile",
    blocks: [
      {
        type: "hero",
        props: {
          eyebrow: "Tentang kami",
          text: "Bertumbuh melalui pendidikan dan inovasi",
          body: "Perkenalkan sejarah, visi, dan kontribusi institusi Anda.",
          tone: "dark",
          align: "left",
        },
      },
      { type: "heading", props: { text: "Cerita Kami", level: 2 } },
      {
        type: "paragraph",
        props: { text: "Tuliskan perjalanan institusi, tonggak penting, serta komitmen untuk masa depan." },
      },
      {
        type: "cards",
        props: {
          text: "Nilai utama",
          columnCount: 3,
          cards: [
            { title: "Visi", text: "Arah besar yang ingin diwujudkan." },
            { title: "Misi", text: "Langkah nyata untuk mencapai visi." },
            { title: "Nilai", text: "Prinsip yang memandu setiap keputusan." },
          ],
        },
      },
    ],
  },
  {
    id: "faq",
    name: "FAQ & Bantuan",
    description: "Judul, pengantar, daftar pertanyaan, dan kontak bantuan.",
    category: "content",
    blocks: [
      { type: "heading", props: { text: "Pertanyaan yang Sering Diajukan", level: 2 } },
      {
        type: "paragraph",
        props: { text: "Temukan jawaban cepat untuk pertanyaan yang paling sering diajukan." },
      },
      {
        type: "faq",
        props: {
          text: "Pertanyaan populer",
          faqs: [
            { question: "Bagaimana cara memulai?", answer: "Ikuti petunjuk pada halaman layanan terkait." },
            { question: "Di mana saya bisa meminta bantuan?", answer: "Hubungi tim kami melalui halaman kontak." },
          ],
        },
      },
      {
        type: "callout",
        props: {
          text: "Masih membutuhkan bantuan?",
          body: "Tim kami siap membantu Anda.",
          label: "Hubungi Kami",
          url: "/kontak/",
          tone: "info",
          align: "left",
        },
      },
    ],
  },
];
