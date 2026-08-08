/**
 * DTOs hand-maintained against the real `unej-cms` backend (`d:\nest-js\unej-cms`) —
 * there is no OpenAPI/Swagger spec (PRD gap #5), so these were verified directly
 * against the NestJS controllers/Zod DTOs/Drizzle schema rather than guessed from
 * PRD prose alone. The setup DTO below follows the nested admin/site transaction
 * described by the admin PRD because the attached source does not include the backend
 * DTO file. Reconcile it if the backend uses different property names.
 */

export interface SetupStatus {
	needsSetup: boolean;
}

export interface SetupInitInput {
	admin: {
		name: string;
		email: string;
		password: string;
	};
	site: {
		name: string;
		slug: string;
		domain?: string;
	};
}

export type SiteRole = 'site_admin' | 'editor' | 'reviewer' | 'author';

export const SITE_ROLES: SiteRole[] = ['site_admin', 'editor', 'reviewer', 'author'];

export type ContentStatus =
	| 'draft'
	| 'in_review'
	| 'approved'
	| 'scheduled'
	| 'published'
	| 'archived'
	| 'trashed';

/** Statuses a user may pick manually from the status dropdown (PRD §9.6) — `published` is set only via the Publish action. */
export const MANUAL_CONTENT_STATUSES: ContentStatus[] = [
	'draft',
	'in_review',
	'approved',
	'scheduled',
	'archived',
	'trashed'
];

/**
 * Backend accepts any status via generic PATCH (no state-machine validation), so the
 * UI is responsible for only offering sensible next steps (PRD §9.6). `published` is
 * never offered here — it's only reachable via the dedicated Publish action.
 */
const STATUS_TRANSITIONS: Record<ContentStatus, ContentStatus[]> = {
	draft: ['draft', 'in_review', 'archived', 'trashed'],
	in_review: ['in_review', 'approved', 'draft', 'archived', 'trashed'],
	approved: ['approved', 'scheduled', 'draft', 'archived', 'trashed'],
	scheduled: ['scheduled', 'approved', 'archived', 'trashed'],
	published: ['published', 'archived', 'trashed'],
	archived: ['archived', 'draft', 'trashed'],
	trashed: ['trashed', 'draft']
};

export function allowedStatusTransitions(current: ContentStatus): ContentStatus[] {
	return STATUS_TRANSITIONS[current] ?? MANUAL_CONTENT_STATUSES;
}

export interface User {
	id: string;
	email: string;
	name: string;
	isSuperAdmin: boolean;
	createdAt: string;
	updatedAt: string;
}

/**
 * `GET /auth/me` and `POST /auth/login` both respond `{ user: AuthUser }`.
 * Confirmed against `AuthenticatedUser` in auth.service.ts — it is exactly `User`,
 * with NO per-site role info. There is no endpoint anywhere that exposes which
 * role (site_admin/editor/reviewer/author) the current user holds on a given site,
 * so the UI cannot distinguish role tiers client-side — only membership (via
 * `GET /sites`, which the backend already filters to accessible sites) is knowable.
 * See `isSiteMember` in `$lib/permissions.ts`.
 */
export type AuthUser = User;

export interface Site {
	id: string;
	slug: string;
	name: string;
	domain: string | null;
	logoUrl: string | null;
	faviconUrl: string | null;
	themeId: string;
	createdAt: string;
	updatedAt: string;
}

/**
 * `POST /sites/:id/members` body: `{ userId, roleSlug }` (NOT `role` — confirmed
 * against assign-member.dto.ts). There is no `GET /sites/:id/members` — the backend
 * genuinely has no endpoint to list a site's current members (confirmed: only
 * add/remove exist on SitesController). This is a real gap beyond PRD §13's
 * documented list; see the members page for how the UI degrades honestly.
 */
export interface AddSiteMemberInput {
	userId: string;
	roleSlug: SiteRole;
}

export interface NewsItem {
	id: string;
	siteId: string;
	title: string;
	slug: string;
	excerpt: string | null;
	bodyMarkdown: string;
	featuredImageUrl: string | null;
	status: ContentStatus;
	authorId: string;
	authorName?: string;
	createdAt: string;
	updatedAt: string;
	publishedAt?: string | null;
}

export interface PageItem {
	id: string;
	siteId: string;
	title: string;
	slug: string;
	bodyMarkdown: string;
	parentId: string | null;
	isHomepage: boolean;
	order: number;
	status: ContentStatus;
	authorId: string;
	authorName?: string;
	createdAt: string;
	updatedAt: string;
	publishedAt?: string | null;
}

export interface SessionInfo {
	id: string;
	userAgent: string | null;
	ip: string | null;
	createdAt: string;
	expiresAt: string;
}

/** 400 Zod validation error shape (PRD §11). */
export interface ApiFieldError {
	path: string;
	message: string;
}

/** 401/403 error shape (PRD §11). */
export interface ApiErrorBody {
	message: string;
	error: string;
	statusCode: number;
}

/**
 * Media Library entity (docs/media_guide.md §7) — backend module `src/modules/media/`.
 * `width`/`height` are `null` for non-image files or images the backend couldn't read
 * dimensions from (e.g. some SVGs); `objectKey`/`uploadedById` are secondary/read-only info.
 */
export interface Media {
	id: string;
	siteId: string;
	uploadedById: string;
	objectKey: string;
	originalName: string;
	mimeType: string;
	size: number;
	url: string;
	altText: string | null;
	caption: string | null;
	width: number | null;
	height: number | null;
	createdAt: string;
	updatedAt: string;
}

export interface MediaListResult {
	items: Media[];
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}

export type MediaTypeFilter = 'image' | 'document';

/** Mirrors backend `ALLOWED_MIME_TYPES` (media_guide.md §7, `media.constants.ts`) — validate client-side first, backend re-validates regardless. */
export const MEDIA_ALLOWED_MIME_TYPES = [
	'image/jpeg',
	'image/png',
	'image/gif',
	'image/webp',
	'image/svg+xml',
	'application/pdf'
] as const;

export const MEDIA_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export const MEDIA_ACCEPT_ATTR = MEDIA_ALLOWED_MIME_TYPES.join(',');

/**
 * Official plugin, catalog + per-site activation state combined
 * (backend `src/modules/plugins/`, `GET /sites/:siteId/plugins`). There is no
 * marketplace/upload — the catalog is a hardcoded list shipped by the CMS team.
 */
export interface SitePlugin {
	slug: string;
	name: string;
	description: string;
	version: string;
	isActive: boolean;
	activatedAt: string | null;
	deactivatedAt: string | null;
}

/** Mirrors @unej-cms/sdk-ui's PropertyFieldSchema/PropertySchema — drives the dynamic theme settings form. */
interface PropertyFieldBase {
	label: string;
	description?: string;
	required?: boolean;
}

export interface StringField extends PropertyFieldBase {
	type: 'string';
	default?: string;
	placeholder?: string;
}

export interface NumberField extends PropertyFieldBase {
	type: 'number';
	default?: number;
	min?: number;
	max?: number;
	step?: number;
}

export interface BooleanField extends PropertyFieldBase {
	type: 'boolean';
	default?: boolean;
}

export interface SelectField extends PropertyFieldBase {
	type: 'select';
	options: { label: string; value: string }[];
	default?: string;
}

export interface ColorField extends PropertyFieldBase {
	type: 'color';
	default?: string;
}

export interface MediaField extends PropertyFieldBase {
	type: 'media';
	accept?: string[];
}

export interface RichTextField extends PropertyFieldBase {
	type: 'richtext';
	default?: string;
}

export interface ArrayField extends PropertyFieldBase {
	type: 'array';
	items: PropertySchema;
}

export interface ObjectField extends PropertyFieldBase {
	type: 'object';
	properties: PropertySchema;
}

export type PropertyFieldSchema =
	| StringField
	| NumberField
	| BooleanField
	| SelectField
	| ColorField
	| MediaField
	| RichTextField
	| ArrayField
	| ObjectField;

export type PropertySchema = Record<string, PropertyFieldSchema>;

/** A named nav slot a theme declares (e.g. "primary", "footer") — mirrors @unej-cms/sdk-theme's MenuLocationDefinition. */
export interface MenuLocation {
	id: string;
	label: string;
	description?: string;
}

/**
 * Official theme catalog entry (backend `src/modules/themes/`, `GET /themes`).
 * Same "official only, ship code, no marketplace" model as plugins — `id`
 * matches a `Site.themeId` value once applied via `PATCH /sites/:id/theme`.
 */
export interface Theme {
	id: string;
	name: string;
	description: string;
	version: string;
	author: string;
	screenshot?: string;
	/** Configurable options this theme declares — empty/absent means nothing to configure. */
	settings?: PropertySchema;
	/** Nav slots this theme renders — empty/absent means no menu can be assigned. */
	menuLocations?: MenuLocation[];
}

/** `GET /sites/:siteId/theme/settings` response — schema of the active theme plus its current (default-merged) values. */
export interface ThemeSettings {
	themeId: string;
	schema: PropertySchema;
	values: Record<string, unknown>;
}

/** Mirrors backend `src/modules/menus/` — a saved custom navigation menu. */
export interface Menu {
	id: string;
	siteId: string;
	name: string;
	locationId: string | null;
	createdAt: string;
	updatedAt: string;
}

export type MenuItemType = 'page' | 'custom';

/** A node in a menu's item tree, as returned by `GET /sites/:siteId/menus/:menuId`. */
export interface MenuItem {
	id: string;
	parentId: string | null;
	order: number;
	type: MenuItemType;
	label: string;
	pageId: string | null;
	url: string | null;
	newTab: boolean;
	/** false = renders as plain text, purely a dropdown trigger for its children. */
	clickable: boolean;
	children: MenuItem[];
}

export interface MenuWithItems extends Menu {
	items: MenuItem[];
}

/**
 * What the dashboard's menu editor sends to `PUT /sites/:siteId/menus/:menuId/items`.
 * New items have no database id yet, so items reference each other by a
 * client-generated `tempId`/`parentTempId` pair instead of a nested tree —
 * see backend `dto/replace-menu-items.dto.ts` for why.
 */
export interface MenuItemInput {
	tempId: string;
	parentTempId: string | null;
	order: number;
	type: MenuItemType;
	label: string;
	pageId?: string | null;
	url?: string | null;
	newTab?: boolean;
	clickable?: boolean;
}

/** Mirrors @unej-cms/plugin-form-builder's FormFieldConfig (backend `src/modules/forms/`). */
export type FormFieldType = 'text' | 'email' | 'number' | 'textarea' | 'select' | 'checkbox';

export const FORM_FIELD_TYPES: { value: FormFieldType; label: string }[] = [
	{ value: 'text', label: 'Teks' },
	{ value: 'email', label: 'Email' },
	{ value: 'number', label: 'Angka' },
	{ value: 'textarea', label: 'Teks Panjang' },
	{ value: 'select', label: 'Pilihan' },
	{ value: 'checkbox', label: 'Centang' }
];

export interface FormField {
	key: string;
	label: string;
	type: FormFieldType;
	required?: boolean;
	placeholder?: string;
	/** Comma-separated option labels; only meaningful when `type` is `select`. */
	options?: string;
}

/**
 * A form-builder form (`GET/POST /sites/:siteId/forms`) — only reachable
 * when the `unej.form-builder` plugin is active for the site (backend
 * PluginActiveGuard); see $lib/permissions or the Plugins page to activate it.
 */
export interface CmsForm {
	id: string;
	siteId: string;
	title: string;
	fields: FormField[];
	submitLabel: string;
	successMessage: string;
	createdAt: string;
	updatedAt: string;
}

export interface FormSubmission {
	id: string;
	formId: string;
	siteId: string;
	data: Record<string, string | number | boolean | null>;
	createdAt: string;
}
