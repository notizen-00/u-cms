import { defineRegion } from "@unej-cms/sdk-theme";

export const headerRegion = defineRegion({
  id: "header",
  label: "Header",
  description: "Header gelap dengan navigasi utama dan tombol aksi.",
});

export const footerRegion = defineRegion({
  id: "footer",
  label: "Footer",
  description: "Footer multi-kolom: brand, tautan cepat, dan sosial media.",
  multiple: true,
});
