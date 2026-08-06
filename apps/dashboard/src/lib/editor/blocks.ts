/**
 * Backend only ever stores `bodyMarkdown` as a plain string (no block-JSON column,
 * PRD.md §4 Non-Goals) — so this block editor is a client-side layer over that string.
 *
 * Serialization strategy, mirroring how Gutenberg round-trips its blocks through
 * post_content: blocks that have a natural markdown form (heading, list, image,
 * table, …) are written as plain markdown so they stay portable and render on the
 * published site with no renderer changes. Blocks that have no markdown equivalent
 * (button, embed, calendar, columns) are written as an HTML-comment marker carrying
 * the block's own JSON, immediately followed by real HTML:
 *
 *     <!-- cms:button {"url":"/daftar","label":"Daftar"} -->
 *     <a class="cms-button" href="/daftar">Daftar</a>
 *
 * The marker is what this editor parses back (lossless round-trip); the HTML after it
 * is what any markdown renderer — including the published site — actually displays.
 * Markdown passes raw HTML through, so these degrade to working output rather than
 * to visible junk text.
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
	| 'form';

export interface Block {
	id: string;
	type: BlockType;
	/** heading/paragraph/quote/code text, or raw markup for `html`. */
	text: string;
	/** heading level (2–4). */
	level: number;
	/** list items. */
	items: string[];
	/** image/button/embed target URL. */
	url: string;
	/** image alt text. */
	alt: string;
	/** button label. */
	label: string;
	/** table cells; row 0 is the header row. */
	rows: string[][];
	/** column contents, one entry per column. */
	columns: string[];
	/** calendar month, `YYYY-MM`. */
	month: string;
	/** list ordered/unordered, embed caption, etc. */
	ordered: boolean;
	/** form-builder plugin form id (see @unej-cms/plugin-form-builder). */
	formId: string;
	/** form title, cached at insert time only for the editor's own placeholder label. */
	formTitle: string;
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
	form: 'Form'
};

/** Inserter groupings, WordPress-style. */
export const BLOCK_CATEGORIES: { label: string; types: BlockType[] }[] = [
	{ label: 'Teks', types: ['paragraph', 'heading', 'list', 'quote', 'code'] },
	{ label: 'Media', types: ['image', 'embed'] },
	{ label: 'Desain', types: ['columns', 'button', 'divider'] },
	{ label: 'Widget', types: ['table', 'calendar', 'html', 'form'] }
];

/** Blocks edited through the overlay rather than inline on the canvas. */
export const OVERLAY_EDITED_TYPES: BlockType[] = [
	'table',
	'columns',
	'button',
	'embed',
	'calendar',
	'html',
	'image',
	'form'
];

function currentMonth(): string {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function createBlock(type: BlockType): Block {
	return {
		id: crypto.randomUUID(),
		type,
		text: '',
		level: 2,
		items: type === 'list' ? [''] : [],
		url: '',
		alt: '',
		label: type === 'button' ? 'Selengkapnya' : '',
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
		formTitle: ''
	};
}

export function duplicateBlock(block: Block): Block {
	return {
		...block,
		id: crypto.randomUUID(),
		items: [...block.items],
		rows: block.rows.map((row) => [...row]),
		columns: [...block.columns]
	};
}

/* ------------------------------------------------------------------ *
 * Rendering helpers                                                    *
 * ------------------------------------------------------------------ */

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

/** Turns a share/watch URL into its embeddable equivalent; other URLs pass through. */
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

/**
 * Emits a plain static HTML table for the month. Deliberately not a live widget —
 * the published site is a static build (PRD.md §6), so a calendar that needs JS at
 * view time would render as nothing there.
 */
export function calendarHtml(month: string): string {
	const [year, monthNumber] = month.split('-').map(Number);
	if (!year || !monthNumber || monthNumber < 1 || monthNumber > 12) return '';

	const daysInMonth = new Date(year, monthNumber, 0).getDate();
	// Shift Sunday-first (JS) to Monday-first (Indonesian convention).
	const leading = (new Date(year, monthNumber - 1, 1).getDay() + 6) % 7;

	const cells: string[] = Array(leading).fill('');
	for (let day = 1; day <= daysInMonth; day += 1) cells.push(String(day));
	while (cells.length % 7 !== 0) cells.push('');

	const weeks: string[] = [];
	for (let i = 0; i < cells.length; i += 7) {
		const week = cells
			.slice(i, i + 7)
			.map((cell) => `<td>${cell}</td>`)
			.join('');
		weeks.push(`<tr>${week}</tr>`);
	}

	return [
		`<table class="cms-calendar">`,
		`<caption>${escapeHtml(calendarTitle(month))}</caption>`,
		`<thead><tr>${DAY_LABELS.map((d) => `<th>${d}</th>`).join('')}</tr></thead>`,
		`<tbody>${weeks.join('')}</tbody>`,
		`</table>`
	].join('');
}

/* ------------------------------------------------------------------ *
 * Serialization                                                        *
 * ------------------------------------------------------------------ */

/** Marker carrying the block's own state, so parsing back is lossless. */
function marker(type: BlockType, payload: Record<string, unknown>): string {
	return `<!-- cms:${type} ${JSON.stringify(payload)} -->`;
}

function tableToMarkdown(rows: string[][]): string {
	if (rows.length === 0) return '';
	const width = Math.max(...rows.map((row) => row.length));
	const cell = (value: string) => (value ?? '').replace(/\|/g, '\\|').trim() || ' ';
	const line = (row: string[]) =>
		`| ${Array.from({ length: width }, (_, i) => cell(row[i] ?? '')).join(' | ')} |`;

	const [header, ...body] = rows;
	return [line(header), `| ${Array(width).fill('---').join(' | ')} |`, ...body.map(line)].join('\n');
}

export function blocksToMarkdown(blocks: Block[]): string {
	return blocks
		.map((block) => {
			switch (block.type) {
				case 'heading':
					return block.text ? `${'#'.repeat(block.level)} ${block.text}` : '';

				case 'quote':
					return block.text
						? block.text
								.split('\n')
								.map((line) => `> ${line}`)
								.join('\n')
						: '';

				case 'list': {
					const items = block.items.filter((item) => item.trim());
					if (items.length === 0) return '';
					return items.map((item, i) => (block.ordered ? `${i + 1}. ${item}` : `- ${item}`)).join('\n');
				}

				case 'code':
					return block.text ? `\`\`\`\n${block.text}\n\`\`\`` : '';

				case 'image':
					return block.url ? `![${block.alt}](${block.url})` : '';

				case 'divider':
					return '---';

				case 'table':
					return tableToMarkdown(block.rows);

				case 'button':
					if (!block.url) return '';
					return [
						marker('button', { url: block.url, label: block.label }),
						`<a class="cms-button" href="${escapeHtml(block.url)}">${escapeHtml(block.label)}</a>`
					].join('\n');

				case 'embed': {
					if (!block.url) return '';
					const src = toEmbedUrl(block.url);
					return [
						marker('embed', { url: block.url }),
						`<div class="cms-embed"><iframe src="${escapeHtml(src)}" loading="lazy" allowfullscreen title="Embed"></iframe></div>`
					].join('\n');
				}

				case 'calendar':
					return [marker('calendar', { month: block.month }), calendarHtml(block.month)].join('\n');

				case 'columns': {
					const filled = block.columns.filter((column) => column.trim());
					if (filled.length === 0) return '';
					return [
						marker('columns', { columns: block.columns }),
						`<div class="cms-columns">`,
						...block.columns.map((column) => `<div class="cms-column">${escapeHtml(column)}</div>`),
						`</div>`
					].join('\n');
				}

				case 'html':
					return block.text ? [marker('html', {}), block.text].join('\n') : '';

				case 'form': {
					if (!block.formId) return '';
					// The placeholder div is only ever shown in *this* editor's own
					// preview — the published site expands it into a real <form> at
					// build time (backend EtaSiteRenderer, which needs the live field
					// config from the DB, not anything this editor could know).
					return [
						marker('form', { formId: block.formId, formTitle: block.formTitle }),
						`<div class="cms-form" data-form-id="${escapeHtml(block.formId)}">${escapeHtml(block.formTitle || 'Form')}</div>`
					].join('\n');
				}

				default:
					return block.text;
			}
		})
		.filter((chunk) => chunk.trim().length > 0)
		.join('\n\n');
}

/* ------------------------------------------------------------------ *
 * Parsing                                                              *
 * ------------------------------------------------------------------ */

const MARKER_RE = /^<!--\s*cms:(\w+)\s+(\{[\s\S]*?\})\s*-->/;
const IMAGE_RE = /^!\[([^\]]*)\]\(([^)]+)\)$/;
const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const DIVIDER_RE = /^(-{3,}|\*{3,})$/;
const UNORDERED_ITEM_RE = /^[-*]\s+/;
const ORDERED_ITEM_RE = /^\d+\.\s+/;
const QUOTE_LINE_RE = /^>\s?/;
const TABLE_DIVIDER_RE = /^\|[\s:|-]+\|$/;

function splitTableRow(line: string): string[] {
	return line
		.replace(/^\||\|$/g, '')
		.split(/(?<!\\)\|/)
		.map((cell) => cell.replace(/\\\|/g, '|').trim());
}

function parseMarker(chunk: string): Block | null {
	const match = chunk.match(MARKER_RE);
	if (!match) return null;

	const [, rawType, rawPayload] = match;
	if (!(rawType in BLOCK_TYPE_LABELS)) return null;

	let payload: Record<string, unknown>;
	try {
		payload = JSON.parse(rawPayload);
	} catch {
		return null;
	}

	const block = createBlock(rawType as BlockType);
	if (typeof payload.url === 'string') block.url = payload.url;
	if (typeof payload.label === 'string') block.label = payload.label;
	if (typeof payload.month === 'string') block.month = payload.month;
	if (typeof payload.formId === 'string') block.formId = payload.formId;
	if (typeof payload.formTitle === 'string') block.formTitle = payload.formTitle;
	if (Array.isArray(payload.columns)) block.columns = payload.columns.map((c) => String(c));
	// `html` keeps the markup that follows its marker rather than storing it twice in JSON.
	if (block.type === 'html') block.text = chunk.replace(MARKER_RE, '').trim();

	return block;
}

export function markdownToBlocks(markdown: string): Block[] {
	const chunks = markdown
		.split(/\n{2,}/)
		.map((chunk) => chunk.trim())
		.filter(Boolean);

	if (chunks.length === 0) return [createBlock('paragraph')];

	return chunks.map((chunk): Block => {
		const marked = parseMarker(chunk);
		if (marked) return marked;

		const headingMatch = chunk.match(HEADING_RE);
		if (headingMatch) {
			return { ...createBlock('heading'), level: Math.min(headingMatch[1].length, 4), text: headingMatch[2] };
		}

		const imageMatch = chunk.match(IMAGE_RE);
		if (imageMatch) {
			return { ...createBlock('image'), alt: imageMatch[1], url: imageMatch[2] };
		}

		if (chunk.startsWith('```') && chunk.endsWith('```')) {
			return { ...createBlock('code'), text: chunk.replace(/^```[a-zA-Z0-9]*\n?/, '').replace(/```$/, '') };
		}

		if (DIVIDER_RE.test(chunk)) return createBlock('divider');

		const lines = chunk.split('\n').map((line) => line.trim());

		if (lines.length >= 2 && lines[0].startsWith('|') && TABLE_DIVIDER_RE.test(lines[1])) {
			const rows = [splitTableRow(lines[0]), ...lines.slice(2).map(splitTableRow)];
			return { ...createBlock('table'), rows };
		}

		if (lines.every((line) => UNORDERED_ITEM_RE.test(line))) {
			return { ...createBlock('list'), items: lines.map((line) => line.replace(UNORDERED_ITEM_RE, '')) };
		}

		if (lines.every((line) => ORDERED_ITEM_RE.test(line))) {
			return {
				...createBlock('list'),
				ordered: true,
				items: lines.map((line) => line.replace(ORDERED_ITEM_RE, ''))
			};
		}

		if (lines.every((line) => QUOTE_LINE_RE.test(line))) {
			return { ...createBlock('quote'), text: lines.map((line) => line.replace(QUOTE_LINE_RE, '')).join('\n') };
		}

		return { ...createBlock('paragraph'), text: chunk };
	});
}
