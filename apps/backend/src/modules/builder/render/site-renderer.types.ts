export interface SiteRenderSite {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  faviconUrl: string | null;
}

export interface SiteRenderTaxonomyItem {
  name: string;
  slug: string;
}

export interface SiteRenderNewsItem {
  title: string;
  slug: string;
  excerpt: string | null;
  bodyMarkdown: string;
  publishedAt: Date | null;
  categories: SiteRenderTaxonomyItem[];
  tags: SiteRenderTaxonomyItem[];
}

export interface SiteRenderPageItem {
  title: string;
  slug: string;
  bodyMarkdown: string;
  isHomepage: boolean;
}

export interface SiteRenderFormField {
  key: string;
  label: string;
  type: 'text' | 'email' | 'number' | 'textarea' | 'select' | 'checkbox';
  required?: boolean;
  placeholder?: string;
  /** Comma-separated option labels; only meaningful when `type` is `select`. */
  options?: string;
}

/** A form-builder plugin form, as needed to expand a `cms-form` embed into real markup. */
export interface SiteRenderForm {
  id: string;
  title: string;
  fields: SiteRenderFormField[];
  submitLabel: string;
  successMessage: string;
}

export interface SiteRenderMenuItem {
  label: string;
  url: string;
  newTab: boolean;
  /** false = renders as plain text, purely a dropdown trigger for its children (see modules/menus/). */
  clickable: boolean;
  children: SiteRenderMenuItem[];
}

export interface SiteRenderData {
  site: SiteRenderSite;
  themeId: string;
  /** Per-site overrides of the active theme's settings (see modules/themes/themes.service.ts) — merged over each field's schema default. */
  themeSettings?: Record<string, unknown>;
  /** Per-theme-location resolved nav trees (see modules/menus/) — keyed by the theme's own MenuLocationID, e.g. `menus.primary`. */
  menus?: Record<string, SiteRenderMenuItem[]>;
  /** Browser-facing base URL of this API — see AppConfigService.apiPublicUrl. */
  apiBaseUrl: string;
  news: SiteRenderNewsItem[];
  pages: SiteRenderPageItem[];
  forms: SiteRenderForm[];
}

export interface SiteRenderer {
  render(outputDir: string, data: SiteRenderData): Promise<void>;
}
