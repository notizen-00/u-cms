import { defineRegion } from "@unej-cms/sdk-theme";

export const headerRegion = defineRegion({
  id: "header",
  label: "Header",
  description: "Header sticky di atas konten — logo, nama site, dan navigasi.",
});

export const footerRegion = defineRegion({
  id: "footer",
  label: "Footer",
  description: "Footer multi-kolom di bawah konten.",
  multiple: true,
});
