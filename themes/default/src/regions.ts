import { defineRegion } from "@unej-cms/sdk-theme";

export const headerRegion = defineRegion({
  id: "header",
  label: "Header",
  description: "Area di atas konten utama — logo, nama site, dan navigasi.",
});

export const footerRegion = defineRegion({
  id: "footer",
  label: "Footer",
  description: "Area di bawah konten utama.",
});
