import { defineMenuLocation } from "@unej-cms/sdk-theme";

export const primaryMenuLocation = defineMenuLocation({
  id: "primary",
  label: "Navigasi Utama",
  description: "Menu di header (region \"header\").",
});

export const footerMenuLocation = defineMenuLocation({
  id: "footer",
  label: "Tautan Footer",
  description: "Daftar tautan pada kolom \"Tautan Cepat\" di footer (region \"footer\").",
});
