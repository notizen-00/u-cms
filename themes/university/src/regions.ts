import { defineRegion } from "@unej-cms/sdk-theme";

export const headerRegion = defineRegion({
  id: "header",
  label: "Header",
  description: "Header dengan logo institusi dan navigasi utama.",
});

export const footerRegion = defineRegion({
  id: "footer",
  label: "Footer",
  description: "Footer multi-kolom: kontak, tautan cepat, dan sosial media.",
  multiple: true,
});
