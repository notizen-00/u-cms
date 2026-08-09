/**
 * Gutenberg-like editor state stored inside the existing `bodyMarkdown` column.
 *
 * Rich blocks use a versioned, percent-encoded marker followed by their public
 * HTML fallback. A closing marker gives the parser a reliable boundary even
 * when the rendered HTML contains blank lines:
 *
 *   <!-- cms:v2:hero %7B...%7D -->
 *   <section class="cms-pb-hero">...</section>
 *   <!-- /cms:v2:hero -->
 *
 * Legacy `<!-- cms:type {...} -->` markers remain readable.
 */

export type BlockType =
	| 'heading'
	| 'paragraph'
	| 'image'
	| 'quote'
	| 'list'
	| 'code'
	| 'divider'
	| 'table'
	| 'columns'
	| 'button'
	| 'embed'
	| 'calendar'
	| 'html'
	| 'form'
	| 'hero'
	| 'callout'
	| 'cards'
	| 'gallery'
	| 'stats'
	| 'faq'
	| 'spacer';

export const PAGE_BUILDER_TONES = [
	'default',
	'primary',
	'dark',
	'soft',
	'info',
	'success',
	'warning'
] as const;
export type PageBuilderTone = (typeof PAGE_BUILDER_TONES)[number];

export const PAGE_BUILDER_ALIGNS = ['left', 'center'] as const;
export type PageBuilderAlign = (typeof PAGE_BUILDER_ALIGNS)[number];

export const PAGE_BUILDER_COLUMNS = [2, 3, 4] as const;
export type PageBuilderColumns = (typeof PAGE_BUILDER_COLUMNS)[number];

export const PAGE_BUILDER_SPACES = ['sm', 'md', 'lg'] as const;
export type PageBuilderSpace = (typeof PAGE_BUILDER_SPACES)[number];

export const PAGE_BUILDER_RICH_TYPES = [
	'hero', 'callout', 'cards', 'gallery', 'stats', 'faq', 'spacer'
] as const satisfies readonly BlockType[];

export interface CardItem {
	id: string;
	title: string;
	text: string;
	url: string;
	label: string;
	imageUrl: string;
	imageAlt: string;
}

export interface GalleryItem {
	id: string;
	url: string;
	alt: string;
	caption: string;
}

export interface StatItem {
	id: string;
	value: string;
	label: string;
}

export interface FaqItem {
	id: string;
	question: string;
	answer: string;
}

export interface Block {
	id: string;
	type: BlockType;
	/** Main text/title, or raw markup for `html`. */
	text: string;
	/** Supporting copy for rich Page Builder blocks. */
	body: string;
	eyebrow: string;
	level: number;
	items: string[];
	url: string;
	alt: string;
	imageUrl: string;
	imageAlt: string;
	label: string;
	rows: string[][];
	columns: string[];
	month: string;
	ordered: boolean;
	formId: string;
	formTitle: string;
	tone: PageBuilderTone;
	align: PageBuilderAlign;
	columnCount: PageBuilderColumns;
	space: PageBuilderSpace;
	cards: CardItem[];
	gallery: GalleryItem[];
	stats: StatItem[];
	faqs: FaqItem[];
}

export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
	heading: 'Heading',
	paragraph: 'Paragraf',
	image: 'Gambar',
	quote: 'Kutipan',
	list: 'Daftar',
	code: 'Kode',
	divider: 'Pemisah',
	table: 'Tabel',
	columns: 'Kolom',
	button: 'Tombol',
	embed: 'Embed / Video',
	calendar: 'Kalender',
	html: 'HTML Kustom',
	form: 'Form',
	hero: 'Hero',
	callout: 'Callout',
	cards: 'Kartu',
	gallery: 'Galeri',
	stats: 'Statistik',
	faq: 'FAQ',
	spacer: 'Jarak'
};

export const BLOCK_CATEGORIES: { label: string; types: BlockType[] }[] = [
	{ label: 'Teks', types: ['paragraph', 'heading', 'list', 'quote', 'code'] },
	{ label: 'Media', types: ['image', 'gallery', 'embed'] },
	{ label: 'Desain', types: ['hero', 'callout', 'cards', 'stats', 'columns', 'button', 'divider', 'spacer'] },
	{ label: 'Widget', types: ['faq', 'table', 'calendar', 'html', 'form'] }
];

export const OVERLAY_EDITED_TYPES: BlockType[] = [
	'table',
	'columns',
	'button',
	'embed',
	'calendar',
	'html',
	'image',
	'form',
	'hero',
	'callout',
	'cards',
	'gallery',
	'stats',
	'faq',
	'spacer'
];

export type PageBuilderPatternId = 'landing' | 'profile' | 'faq';

export interface PageBuilderPattern {
	id: PageBuilderPatternId;
	name: string;
	description: string;
	blockCount: number;
}

export const PAGE_BUILDER_PATTERNS: readonly PageBuilderPattern[] = [
	{
		id: 'landing',
		name: 'Landing Page',
		description: 'Hero, statistik, layanan, dan ajakan bertindak.',
		blockCount: 4
	},
	{
		id: 'profile',
		name: 'Profil Institusi',
		description: 'Pembuka, nilai utama, capaian, dan informasi lanjutan.',
		blockCount: 4
	},
	{
		id: 'faq',
		name: 'Pusat Bantuan',
		description: 'Pembuka, daftar pertanyaan, dan callout kontak.',
		blockCount: 3
	}
] as const;

function uuid(): string {
	return crypto.randomUUID();
}

function currentMonth(): string {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function createCardItem(): CardItem {
	return { id: uuid(), title: '', text: '', url: '', label: 'Selengkapnya', imageUrl: '', imageAlt: '' };
}

export function createGalleryItem(): GalleryItem {
	return { id: uuid(), url: '', alt: '', caption: '' };
}

export function createStatItem(): StatItem {
	return { id: uuid(), value: '', label: '' };
}

export function createFaqItem(): FaqItem {
	return { id: uuid(), question: '', answer: '' };
}

export function createBlock(type: BlockType): Block {
	return {
		id: uuid(),
		type,
		text: '',
		body: '',
		eyebrow: '',
		level: 2,
		items: type === 'list' ? [''] : [],
		url: '',
		alt: '',
		imageUrl: '',
		imageAlt: '',
		label: type === 'button' || type === 'hero' || type === 'callout' ? 'Selengkapnya' : '',
		rows:
			type === 'table'
				? [
						['Kolom 1', 'Kolom 2'],
						['', '']
					]
				: [],
		columns: type === 'columns' ? ['', ''] : [],
		month: type === 'calendar' ? currentMonth() : '',
		ordered: false,
		formId: '',
		formTitle: '',
		tone: type === 'hero' ? 'primary' : type === 'callout' ? 'soft' : 'default',
		align: 'left',
		columnCount: 3,
		space: 'md',
		cards: type === 'cards' ? [createCardItem(), createCardItem(), createCardItem()] : [],
		gallery: type === 'gallery' ? [createGalleryItem(), createGalleryItem(), createGalleryItem()] : [],
		stats: type === 'stats' ? [createStatItem(), createStatItem(), createStatItem()] : [],
		faqs: type === 'faq' ? [createFaqItem()] : []
	};
}

export function duplicateBlock(block: Block): Block {
	return {
		...block,
		id: uuid(),
		items: [...block.items],
		rows: block.rows.map((row) => [...row]),
		columns: [...block.columns],
		cards: block.cards.map((item) => ({ ...item, id: uuid() })),
		gallery: block.gallery.map((item) => ({ ...item, id: uuid() })),
		stats: block.stats.map((item) => ({ ...item, id: uuid() })),
		faqs: block.faqs.map((item) => ({ ...item, id: uuid() }))
	};
}

function withValues(type: BlockType, values: Partial<Block>): Block {
	return { ...createBlock(type), ...values };
}

export function createPatternBlocks(patternId: PageBuilderPatternId): Block[] {
	if (patternId === 'landing') {
		return [
			withValues('hero', {
				eyebrow: 'Selamat datang',
				text: 'Membangun masa depan melalui pendidikan dan inovasi',
				body: 'Kenalkan institusi, layanan, atau program unggulan Anda dengan pesan yang singkat dan kuat.',
				label: 'Jelajahi layanan',
				url: '#layanan',
				tone: 'primary',
				align: 'left'
			}),
			withValues('stats', {
				text: 'Capaian kami',
				tone: 'soft',
				stats: [
					{ id: uuid(), value: '25+', label: 'Tahun pengalaman' },
					{ id: uuid(), value: '10K+', label: 'Alumni' },
					{ id: uuid(), value: '50+', label: 'Program unggulan' }
				]
			}),
			withValues('cards', {
				text: 'Layanan unggulan',
				body: 'Temukan layanan yang paling sesuai dengan kebutuhan Anda.',
				cards: [
					{ ...createCardItem(), title: 'Pendidikan', text: 'Program berkualitas untuk membangun kompetensi masa depan.' },
					{ ...createCardItem(), title: 'Riset', text: 'Kolaborasi riset yang memberi dampak nyata bagi masyarakat.' },
					{ ...createCardItem(), title: 'Pengabdian', text: 'Solusi dan pendampingan untuk kemajuan bersama.' }
				]
			}),
			withValues('callout', {
				text: 'Siap memulai?',
				body: 'Hubungi tim kami untuk mendapatkan informasi dan bantuan lebih lanjut.',
				label: 'Hubungi kami',
				url: '/kontak',
				tone: 'dark',
				align: 'center'
			})
		];
	}

	if (patternId === 'profile') {
		return [
			withValues('hero', {
				eyebrow: 'Tentang kami',
				text: 'Institusi yang tumbuh bersama masyarakat',
				body: 'Tuliskan gambaran singkat mengenai sejarah, mandat, dan dampak institusi Anda.',
				tone: 'soft'
			}),
			withValues('cards', {
				text: 'Nilai utama',
				columnCount: 3,
				cards: [
					{ ...createCardItem(), title: 'Integritas', text: 'Bekerja terbuka, bertanggung jawab, dan dapat dipercaya.' },
					{ ...createCardItem(), title: 'Inovasi', text: 'Terus belajar dan menciptakan cara yang lebih baik.' },
					{ ...createCardItem(), title: 'Kolaborasi', text: 'Menghasilkan dampak melalui kerja bersama.' }
				]
			}),
			withValues('stats', {
				text: 'Jejak perjalanan',
				tone: 'primary',
				stats: [
					{ id: uuid(), value: '19XX', label: 'Tahun berdiri' },
					{ id: uuid(), value: '100+', label: 'Mitra aktif' },
					{ id: uuid(), value: '20+', label: 'Wilayah dampingan' }
				]
			}),
			withValues('callout', {
				text: 'Kenali perjalanan kami lebih dekat',
				body: 'Tambahkan tautan menuju sejarah, struktur organisasi, atau laporan tahunan.',
				label: 'Pelajari lebih lanjut',
				url: '#',
				tone: 'info'
			})
		];
	}

	return [
		withValues('hero', {
			eyebrow: 'Pusat bantuan',
			text: 'Apa yang bisa kami bantu?',
			body: 'Temukan jawaban untuk pertanyaan yang paling sering diajukan.',
			tone: 'soft',
			align: 'center'
		}),
		withValues('faq', {
			text: 'Pertanyaan populer',
			faqs: [
				{ id: uuid(), question: 'Bagaimana cara mendapatkan layanan?', answer: 'Jelaskan alur layanan secara singkat di sini.' },
				{ id: uuid(), question: 'Berapa lama prosesnya?', answer: 'Tuliskan estimasi waktu dan faktor yang memengaruhinya.' },
				{ id: uuid(), question: 'Siapa yang dapat saya hubungi?', answer: 'Tambahkan kanal kontak resmi yang dapat dihubungi.' }
			]
		}),
		withValues('callout', {
			text: 'Masih membutuhkan bantuan?',
			body: 'Tim kami siap membantu menjawab pertanyaan Anda.',
			label: 'Hubungi dukungan',
			url: '/kontak',
			tone: 'primary',
			align: 'center'
		})
	];
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function textTag(tag: 'p' | 'h2' | 'h3' | 'dt' | 'dd', className: string, value: string): string {
	return value.trim() ? `<${tag} class="${className}">${escapeHtml(value)}</${tag}>` : '';
}

function classNames(block: Block, base: string, includeColumns = false): string {
	return [
		base,
		`cms-pb-tone-${normalizeTone(block.tone)}`,
		`cms-pb-align-${normalizeAlign(block.align)}`,
		includeColumns ? `cms-pb-cols-${normalizeColumns(block.columnCount)}` : ''
	]
		.filter(Boolean)
		.join(' ');
}

export function toEmbedUrl(url: string): string {
	const youtube = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{6,})/);
	if (youtube) return `https://www.youtube.com/embed/${youtube[1]}`;
	const vimeo = url.match(/vimeo\.com\/(\d+)/);
	if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
	return url;
}

const DAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const MONTH_LABELS = [
	'Januari',
	'Februari',
	'Maret',
	'April',
	'Mei',
	'Juni',
	'Juli',
	'Agustus',
	'September',
	'Oktober',
	'November',
	'Desember'
];

export function calendarTitle(month: string): string {
	const [year, monthNumber] = month.split('-').map(Number);
	if (!year || !monthNumber) return '';
	return `${MONTH_LABELS[monthNumber - 1] ?? ''} ${year}`;
}

export function calendarHtml(month: string): string {
	const [year, monthNumber] = month.split('-').map(Number);
	if (!year || !monthNumber || monthNumber < 1 || monthNumber > 12) return '';
	const daysInMonth = new Date(year, monthNumber, 0).getDate();
	const leading = (new Date(year, monthNumber - 1, 1).getDay() + 6) % 7;
	const cells: string[] = Array(leading).fill('');
	for (let day = 1; day <= daysInMonth; day += 1) cells.push(String(day));
	while (cells.length % 7 !== 0) cells.push('');
	const weeks: string[] = [];
	for (let i = 0; i < cells.length; i += 7) {
		weeks.push(`<tr>${cells.slice(i, i + 7).map((cell) => `<td>${cell}</td>`).join('')}</tr>`);
	}
	return [
		'<table class="cms-calendar">',
		`<caption>${escapeHtml(calendarTitle(month))}</caption>`,
		`<thead><tr>${DAY_LABELS.map((day) => `<th>${day}</th>`).join('')}</tr></thead>`,
		`<tbody>${weeks.join('')}</tbody>`,
		'</table>'
	].join('');
}

function normalizeTone(value: unknown): PageBuilderTone {
	return PAGE_BUILDER_TONES.includes(value as PageBuilderTone) ? (value as PageBuilderTone) : 'default';
}

function normalizeAlign(value: unknown): PageBuilderAlign {
	return PAGE_BUILDER_ALIGNS.includes(value as PageBuilderAlign) ? (value as PageBuilderAlign) : 'left';
}

function normalizeColumns(value: unknown): PageBuilderColumns {
	const number = Number(value);
	return PAGE_BUILDER_COLUMNS.includes(number as PageBuilderColumns) ? (number as PageBuilderColumns) : 3;
}

function normalizeSpace(value: unknown): PageBuilderSpace {
	return PAGE_BUILDER_SPACES.includes(value as PageBuilderSpace) ? (value as PageBuilderSpace) : 'md';
}

function markerV2(type: BlockType, payload: Record<string, unknown>, html: string): string {
	const encoded = encodeURIComponent(JSON.stringify(payload));
	return `<!-- cms:v2:${type} ${encoded} -->\n${html}\n<!-- /cms:v2:${type} -->`;
}

/** Prevent authored HTML comments from impersonating this editor's reserved boundaries. */
function neutralizeCmsMarkers(html: string): string {
	return html.replace(/<!--(\s*\/?\s*cms:)/gi, '<!-- user$1');
}

function richPayload(block: Block): Record<string, unknown> {
	const common = {
		id: block.id,
		text: block.text,
		body: block.body,
		eyebrow: block.eyebrow,
		url: block.url,
		alt: block.alt,
		imageUrl: block.imageUrl,
		imageAlt: block.imageAlt,
		label: block.label,
		tone: normalizeTone(block.tone),
		align: normalizeAlign(block.align),
		columnCount: normalizeColumns(block.columnCount),
		space: normalizeSpace(block.space)
	};
	if (block.type === 'cards') return { ...common, cards: block.cards };
	if (block.type === 'gallery') return { ...common, gallery: block.gallery };
	if (block.type === 'stats') return { ...common, stats: block.stats };
	if (block.type === 'faq') return { ...common, faqs: block.faqs };
	return common;
}

function renderHero(block: Block): string {
	const content = [
		textTag('p', 'cms-pb-hero__eyebrow', block.eyebrow),
		textTag('h2', 'cms-pb-hero__title', block.text),
		textTag('p', 'cms-pb-hero__text', block.body),
		block.url && block.label
			? `<a class="cms-button" href="${escapeHtml(block.url)}">${escapeHtml(block.label)}</a>`
			: ''
	].filter(Boolean).join('');
	const image = block.imageUrl
		? `<figure class="cms-pb-hero__media"><img src="${escapeHtml(block.imageUrl)}" alt="${escapeHtml(block.imageAlt)}" loading="lazy"></figure>`
		: '';
	const rootClass = block.imageUrl ? 'cms-pb-hero' : 'cms-pb-hero cms-pb-hero--no-media';
	return `<section class="${classNames(block, rootClass)}"><div class="cms-pb-hero__content">${content}</div>${image}</section>`;
}

function renderCallout(block: Block): string {
	const button = block.url && block.label
		? `<a class="cms-button" href="${escapeHtml(block.url)}">${escapeHtml(block.label)}</a>`
		: '';
	return `<aside class="${classNames(block, 'cms-pb-callout')}">${textTag('h2', 'cms-pb-callout__title', block.text)}${textTag('p', 'cms-pb-callout__text', block.body)}${button}</aside>`;
}

function renderCards(block: Block): string {
	const cards = block.cards.map((item) => {
		const media = item.imageUrl
			? `<figure class="cms-pb-card__media"><img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.imageAlt)}" loading="lazy"></figure>`
			: '';
		const link = item.url && item.label
			? `<a class="cms-pb-card__link" href="${escapeHtml(item.url)}">${escapeHtml(item.label)}</a>`
			: '';
		return `<article class="cms-pb-card">${media}<div class="cms-pb-card__body">${textTag('h3', 'cms-pb-card__title', item.title)}${textTag('p', 'cms-pb-card__text', item.text)}${link}</div></article>`;
	}).join('');
	return `<section class="${classNames(block, 'cms-pb-card-grid', true)}">${textTag('h2', 'cms-pb-card-grid__title', block.text)}${textTag('p', 'cms-pb-card-grid__text', block.body)}${cards}</section>`;
}

function renderGallery(block: Block): string {
	const items = block.gallery.filter((item) => item.url).map((item) =>
		`<figure class="cms-pb-gallery__item"><img class="cms-pb-gallery__image" src="${escapeHtml(item.url)}" alt="${escapeHtml(item.alt)}" loading="lazy">${item.caption ? `<figcaption class="cms-pb-gallery__caption">${escapeHtml(item.caption)}</figcaption>` : ''}</figure>`
	).join('');
	return `<section class="${classNames(block, 'cms-pb-gallery', true)}">${textTag('h2', 'cms-pb-gallery__title', block.text)}${items}</section>`;
}

function renderStats(block: Block): string {
	const items = block.stats.map((item) =>
		`<div class="cms-pb-stat">${textTag('dt', 'cms-pb-stat__value', item.value)}${textTag('dd', 'cms-pb-stat__label', item.label)}</div>`
	).join('');
	return `<section class="${classNames(block, 'cms-pb-stats', true)}">${textTag('h2', 'cms-pb-stats__title', block.text)}<dl class="cms-pb-stats__list">${items}</dl></section>`;
}

function renderFaq(block: Block): string {
	const items = block.faqs.map((item) =>
		`<details class="cms-pb-faq__item"><summary class="cms-pb-faq__question">${escapeHtml(item.question)}</summary><div class="cms-pb-faq__answer"><p>${escapeHtml(item.answer)}</p></div></details>`
	).join('');
	return `<section class="${classNames(block, 'cms-pb-faq')}">${textTag('h2', 'cms-pb-faq__title', block.text)}${items}</section>`;
}

function renderSpacer(block: Block): string {
	return `<div class="cms-pb-spacer cms-pb-space-${normalizeSpace(block.space)}"></div>`;
}

function tableToMarkdown(rows: string[][]): string {
	if (rows.length === 0) return '';
	const width = Math.max(...rows.map((row) => row.length));
	const cell = (value: string) => (value ?? '').replace(/\|/g, '\\|').trim() || ' ';
	const line = (row: string[]) => `| ${Array.from({ length: width }, (_, i) => cell(row[i] ?? '')).join(' | ')} |`;
	const [header, ...body] = rows;
	return [line(header), `| ${Array(width).fill('---').join(' | ')} |`, ...body.map(line)].join('\n');
}

export function blocksToMarkdown(blocks: Block[]): string {
	return blocks.map((block) => {
		switch (block.type) {
			case 'heading':
				return block.text ? `${'#'.repeat(block.level)} ${block.text}` : '';
			case 'paragraph':
				return block.text;
			case 'quote':
				return block.text ? block.text.split('\n').map((line) => `> ${line}`).join('\n') : '';
			case 'list': {
				const items = block.items.filter((item) => item.trim());
				return items.map((item, index) => block.ordered ? `${index + 1}. ${item}` : `- ${item}`).join('\n');
			}
			case 'code':
				return block.text
					? markerV2(
						'code',
						{ id: block.id, text: block.text },
						`<pre><code>${escapeHtml(block.text)}</code></pre>`
					)
					: '';
			case 'image':
				return block.url ? `![${block.alt}](${block.url})` : '';
			case 'divider':
				return '---';
			case 'table':
				return tableToMarkdown(block.rows);
			case 'button':
				return block.url ? markerV2('button', { id: block.id, url: block.url, label: block.label }, `<a class="cms-button" href="${escapeHtml(block.url)}">${escapeHtml(block.label)}</a>`) : '';
			case 'embed': {
				if (!block.url) return '';
				const src = toEmbedUrl(block.url);
				return markerV2('embed', { id: block.id, url: block.url }, `<div class="cms-embed"><iframe src="${escapeHtml(src)}" loading="lazy" allowfullscreen title="Embed"></iframe></div>`);
			}
			case 'calendar':
				return markerV2('calendar', { id: block.id, month: block.month }, calendarHtml(block.month));
			case 'columns':
				return block.columns.some((column) => column.trim())
					? markerV2('columns', { id: block.id, columns: block.columns }, `<div class="cms-columns">${block.columns.map((column) => `<div class="cms-column">${escapeHtml(column)}</div>`).join('')}</div>`)
					: '';
			case 'html':
				return block.text ? markerV2('html', { id: block.id, text: block.text }, neutralizeCmsMarkers(block.text)) : '';
			case 'form':
				return block.formId ? markerV2('form', { id: block.id, formId: block.formId, formTitle: block.formTitle }, `<div class="cms-form" data-form-id="${escapeHtml(block.formId)}">${escapeHtml(block.formTitle || 'Form')}</div>`) : '';
			case 'hero':
				return markerV2('hero', richPayload(block), renderHero(block));
			case 'callout':
				return markerV2('callout', richPayload(block), renderCallout(block));
			case 'cards':
				return markerV2('cards', richPayload(block), renderCards(block));
			case 'gallery':
				return markerV2('gallery', richPayload(block), renderGallery(block));
			case 'stats':
				return markerV2('stats', richPayload(block), renderStats(block));
			case 'faq':
				return markerV2('faq', richPayload(block), renderFaq(block));
			case 'spacer':
				return markerV2('spacer', richPayload(block), renderSpacer(block));
			default:
				// Stored content can be edited in Code mode. Never let a forged or
				// future block discriminator crash the complete visual editor.
				return '';
		}
	}).filter((chunk) => chunk.trim()).join('\n\n');
}

// Reserved block markers must occupy complete lines. Besides making the
// storage grammar unambiguous, this prevents examples embedded in prose from
// unexpectedly becoming live editor blocks.
const V2_BLOCK_RE = /^<!--[ \t]*cms:v2:([\w-]+)[ \t]+(\S+)[ \t]*-->[ \t]*\r?\n([\s\S]*?)^<!--[ \t]*\/cms:v2:\1[ \t]*-->[ \t]*(?=\r?$)/gm;
const FENCE_LINE_RE = /^( {0,3})(`{3,}|~{3,})([^\r\n]*)\r?$/gm;
const LEGACY_MARKER_RE = /^<!--\s*cms:(\w+)\s+(\{[\s\S]*?\})\s*-->/;
const IMAGE_RE = /^!\[([^\]]*)\]\(([^)]+)\)$/;
const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const DIVIDER_RE = /^(-{3,}|\*{3,})$/;
const UNORDERED_ITEM_RE = /^[-*]\s+/;
const ORDERED_ITEM_RE = /^\d+\.\s+/;
const QUOTE_LINE_RE = /^>\s?/;
const TABLE_DIVIDER_RE = /^\|[\s:|-]+\|$/;

function splitTableRow(line: string): string[] {
	return line.replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map((cell) => cell.replace(/\\\|/g, '|').trim());
}

function stringValue(value: unknown): string {
	return typeof value === 'string' ? value : '';
}

function validId(value: unknown): string {
	return typeof value === 'string' && /^[\w-]{8,}$/.test(value) ? value : uuid();
}

function cardItems(value: unknown): CardItem[] {
	if (!Array.isArray(value)) return [];
	return value.map((item): CardItem => {
		const entry = item && typeof item === 'object' ? item as Record<string, unknown> : {};
		return {
			id: validId(entry.id),
			title: stringValue(entry.title),
			text: stringValue(entry.text),
			url: stringValue(entry.url),
			label: stringValue(entry.label),
			imageUrl: stringValue(entry.imageUrl),
			imageAlt: stringValue(entry.imageAlt)
		};
	});
}

function galleryItems(value: unknown): GalleryItem[] {
	if (!Array.isArray(value)) return [];
	return value.map((item): GalleryItem => {
		const entry = item && typeof item === 'object' ? item as Record<string, unknown> : {};
		return { id: validId(entry.id), url: stringValue(entry.url), alt: stringValue(entry.alt), caption: stringValue(entry.caption) };
	});
}

function statItems(value: unknown): StatItem[] {
	if (!Array.isArray(value)) return [];
	return value.map((item): StatItem => {
		const entry = item && typeof item === 'object' ? item as Record<string, unknown> : {};
		return { id: validId(entry.id), value: stringValue(entry.value), label: stringValue(entry.label) };
	});
}

function faqItems(value: unknown): FaqItem[] {
	if (!Array.isArray(value)) return [];
	return value.map((item): FaqItem => {
		const entry = item && typeof item === 'object' ? item as Record<string, unknown> : {};
		return { id: validId(entry.id), question: stringValue(entry.question), answer: stringValue(entry.answer) };
	});
}

function blockFromPayload(type: BlockType, payload: Record<string, unknown>): Block {
	const block = createBlock(type);
	block.id = validId(payload.id);
	block.text = stringValue(payload.text);
	block.body = stringValue(payload.body);
	block.eyebrow = stringValue(payload.eyebrow);
	block.url = stringValue(payload.url);
	block.alt = stringValue(payload.alt);
	block.imageUrl = stringValue(payload.imageUrl);
	block.imageAlt = stringValue(payload.imageAlt);
	block.label = stringValue(payload.label);
	block.month = stringValue(payload.month);
	block.formId = stringValue(payload.formId);
	block.formTitle = stringValue(payload.formTitle);
	block.tone = normalizeTone(payload.tone);
	block.align = normalizeAlign(payload.align);
	block.columnCount = normalizeColumns(payload.columnCount);
	block.space = normalizeSpace(payload.space);
	if (Array.isArray(payload.columns)) block.columns = payload.columns.map(String);
	if (type === 'cards') block.cards = cardItems(payload.cards);
	if (type === 'gallery') block.gallery = galleryItems(payload.gallery);
	if (type === 'stats') block.stats = statItems(payload.stats);
	if (type === 'faq') block.faqs = faqItems(payload.faqs);
	return block;
}

function parseV2(typeValue: string, encoded: string): Block | null {
	if (!Object.hasOwn(BLOCK_TYPE_LABELS, typeValue)) return null;
	try {
		const payload = JSON.parse(decodeURIComponent(encoded));
		if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
		return blockFromPayload(typeValue as BlockType, payload as Record<string, unknown>);
	} catch {
		return null;
	}
}

function parseLegacyMarker(chunk: string): Block | null {
	const match = chunk.match(LEGACY_MARKER_RE);
	if (!match || !Object.hasOwn(BLOCK_TYPE_LABELS, match[1])) return null;
	try {
		const payload = JSON.parse(match[2]) as Record<string, unknown>;
		const block = blockFromPayload(match[1] as BlockType, payload);
		if (block.type === 'html') block.text = chunk.replace(LEGACY_MARKER_RE, '').trim();
		return block;
	} catch {
		return null;
	}
}

function parseBasicMarkdown(markdown: string): Block[] {
	const chunks = markdown.split(/\n{2,}/).map((chunk) => chunk.trim()).filter(Boolean);
	return chunks.map((chunk): Block => {
		const marked = parseLegacyMarker(chunk);
		if (marked) return marked;
		const headingMatch = chunk.match(HEADING_RE);
		if (headingMatch) return { ...createBlock('heading'), level: Math.min(headingMatch[1].length, 4), text: headingMatch[2] };
		const imageMatch = chunk.match(IMAGE_RE);
		if (imageMatch) return { ...createBlock('image'), alt: imageMatch[1], url: imageMatch[2] };
		if (chunk.startsWith('```') && chunk.endsWith('```')) return { ...createBlock('code'), text: chunk.replace(/^```[a-zA-Z0-9]*\n?/, '').replace(/```$/, '') };
		if (DIVIDER_RE.test(chunk)) return createBlock('divider');
		const lines = chunk.split('\n').map((line) => line.trim());
		if (lines.length >= 2 && lines[0].startsWith('|') && TABLE_DIVIDER_RE.test(lines[1])) return { ...createBlock('table'), rows: [splitTableRow(lines[0]), ...lines.slice(2).map(splitTableRow)] };
		if (lines.every((line) => UNORDERED_ITEM_RE.test(line))) return { ...createBlock('list'), items: lines.map((line) => line.replace(UNORDERED_ITEM_RE, '')) };
		if (lines.every((line) => ORDERED_ITEM_RE.test(line))) return { ...createBlock('list'), ordered: true, items: lines.map((line) => line.replace(ORDERED_ITEM_RE, '')) };
		if (lines.every((line) => QUOTE_LINE_RE.test(line))) return { ...createBlock('quote'), text: lines.map((line) => line.replace(QUOTE_LINE_RE, '')).join('\n') };
		return { ...createBlock('paragraph'), text: chunk };
	});
}

function ensureUniqueIds(blocks: Block[]): Block[] {
	const used = new Set<string>();
	const claim = (current: string): string => {
		if (!used.has(current)) {
			used.add(current);
			return current;
		}
		let replacement = uuid();
		while (used.has(replacement)) replacement = uuid();
		used.add(replacement);
		return replacement;
	};

	for (const block of blocks) {
		block.id = claim(block.id);
		for (const item of [...block.cards, ...block.gallery, ...block.stats, ...block.faqs]) {
			item.id = claim(item.id);
		}
	}
	return blocks;
}

interface TextRange {
	start: number;
	end: number;
}

/** Locate CommonMark-style fenced code so CMS marker examples stay inert. */
function fencedCodeRanges(markdown: string): TextRange[] {
	const ranges: TextRange[] = [];
	let open: { start: number; character: string; length: number } | null = null;
	FENCE_LINE_RE.lastIndex = 0;

	for (const match of markdown.matchAll(FENCE_LINE_RE)) {
		const fence = match[2];
		if (!open) {
			open = { start: match.index ?? 0, character: fence[0], length: fence.length };
			continue;
		}

		const isClosing =
			fence[0] === open.character &&
			fence.length >= open.length &&
			match[3].trim() === '';
		if (isClosing) {
			ranges.push({ start: open.start, end: (match.index ?? 0) + match[0].length });
			open = null;
		}
	}

	if (open) ranges.push({ start: open.start, end: markdown.length });
	return ranges;
}

function insideRange(index: number, ranges: readonly TextRange[]): boolean {
	return ranges.some((range) => index >= range.start && index < range.end);
}

export function markdownToBlocks(markdown: string): Block[] {
	if (!markdown.trim()) return [createBlock('paragraph')];
	const blocks: Block[] = [];
	const codeRanges = fencedCodeRanges(markdown);
	let cursor = 0;
	V2_BLOCK_RE.lastIndex = 0;
	for (const match of markdown.matchAll(V2_BLOCK_RE)) {
		const index = match.index ?? 0;
		if (insideRange(index, codeRanges)) continue;
		blocks.push(...parseBasicMarkdown(markdown.slice(cursor, index)));
		const parsed = parseV2(match[1], match[2]);
		if (parsed) blocks.push(parsed);
		else blocks.push(...parseBasicMarkdown(match[0]));
		cursor = index + match[0].length;
	}
	blocks.push(...parseBasicMarkdown(markdown.slice(cursor)));
	return ensureUniqueIds(blocks.length > 0 ? blocks : [createBlock('paragraph')]);
}
