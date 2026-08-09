import { describe, expect, it } from 'vitest';
import {
	blocksToMarkdown,
	createBlock,
	createPatternBlocks,
	duplicateBlock,
	markdownToBlocks,
	type BlockType,
	type PageBuilderPatternId
} from './blocks';

const RICH_TYPES: BlockType[] = ['hero', 'callout', 'cards', 'gallery', 'stats', 'faq', 'spacer'];

describe('Page Builder blocks', () => {
	it.each(RICH_TYPES)('round-trips %s through the encoded v2 marker', (type) => {
		const block = createBlock(type);
		block.text = 'Judul dengan --> penutup palsu';
		block.body = 'Baris pertama\n\nBaris kedua';
		block.eyebrow = 'Label';
		block.url = '/tujuan';
		block.label = 'Buka';
		block.imageUrl = 'https://cdn.example.test/hero.avif';
		block.imageAlt = 'Alternatif';
		block.tone = 'primary';
		block.align = 'center';
		block.columnCount = 4;
		block.space = 'lg';
		if (type === 'cards') block.cards[0].title = 'Kartu satu';
		if (type === 'gallery') block.gallery[0].url = 'https://cdn.example.test/gallery.avif';
		if (type === 'stats') block.stats[0] = { ...block.stats[0], value: '100+', label: 'Mitra' };
		if (type === 'faq') block.faqs[0] = { ...block.faqs[0], question: 'Apa?', answer: 'Ini jawabannya.' };

		const markdown = blocksToMarkdown([block]);
		const [parsed] = markdownToBlocks(markdown);

		expect(markdown).toContain(`<!-- cms:v2:${type} `);
		expect(markdown).toContain(`<!-- /cms:v2:${type} -->`);
		expect(parsed.type).toBe(type);
		expect(parsed.id).toBe(block.id);
		expect(parsed.text).toBe(block.text);
		expect(parsed.body).toBe(block.body);
		expect(parsed.tone).toBe('primary');
		expect(parsed.align).toBe('center');
		expect(parsed.columnCount).toBe(4);
		expect(parsed.space).toBe('lg');
	});

	it('keeps multiline custom HTML lossless and preserves surrounding markdown order', () => {
		const before = { ...createBlock('paragraph'), text: 'Sebelum' };
		const html = { ...createBlock('html'), text: '<div>Baris 1\n\n<strong>Baris 2</strong></div>' };
		const after = { ...createBlock('heading'), text: 'Sesudah', level: 3 };
		const parsed = markdownToBlocks(blocksToMarkdown([before, html, after]));

		expect(parsed.map((block) => block.type)).toEqual(['paragraph', 'html', 'heading']);
		expect(parsed[1].text).toBe(html.text);
	});

	it('keeps complete v2 marker examples inert inside fenced code', () => {
		const payload = encodeURIComponent(JSON.stringify({ text: 'Bukan blok sungguhan' }));
		const source = [
			'```html',
			`<!-- cms:v2:hero ${payload} -->`,
			'<section>Contoh dokumentasi</section>',
			'<!-- /cms:v2:hero -->',
			'```'
		].join('\n');
		const [parsed] = markdownToBlocks(source);

		expect(parsed.type).toBe('code');
		expect(parsed.text).toContain('<!-- cms:v2:hero');

		const [roundTripped] = markdownToBlocks(blocksToMarkdown([parsed]));
		expect(roundTripped.type).toBe('code');
		expect(roundTripped.text).toBe(parsed.text);
	});

	it('does not activate a reserved marker written inline in prose', () => {
		const payload = encodeURIComponent(JSON.stringify({ text: 'Bukan blok sungguhan' }));
		const [parsed] = markdownToBlocks(
			`Dokumentasi <!-- cms:v2:hero ${payload} --> isi <!-- /cms:v2:hero -->`
		);

		expect(parsed.type).toBe('paragraph');
	});

	it('neutralizes reserved CMS comments in custom HTML without losing the authored value', () => {
		const html = createBlock('html');
		html.text = '<div>Sebelum</div>\n<!-- /cms:v2:html -->\n<div>Sesudah</div>';
		const after = { ...createBlock('paragraph'), text: 'Konten berikutnya' };
		const markdown = blocksToMarkdown([html, after]);
		const parsed = markdownToBlocks(markdown);

		expect(markdown).toContain('<!-- user /cms:v2:html -->');
		expect(parsed.map((block) => block.type)).toEqual(['html', 'paragraph']);
		expect(parsed[0].text).toBe(html.text);
	});

	it('remains compatible with legacy JSON markers', () => {
		const [button] = markdownToBlocks(
			'<!-- cms:button {"url":"/lama","label":"Tombol lama"} -->\n<a class="cms-button" href="/lama">Tombol lama</a>'
		);

		expect(button.type).toBe('button');
		expect(button.url).toBe('/lama');
		expect(button.label).toBe('Tombol lama');
	});

	it('normalizes untrusted modifier values from markers', () => {
		const payload = encodeURIComponent(JSON.stringify({ tone: 'evil', align: 'right', columnCount: 99, space: 'huge' }));
		const [block] = markdownToBlocks(
			`<!-- cms:v2:hero ${payload} -->\n<section></section>\n<!-- /cms:v2:hero -->`
		);

		expect(block.tone).toBe('default');
		expect(block.align).toBe('left');
		expect(block.columnCount).toBe(3);
		expect(block.space).toBe('md');
	});

	it.each(['toString', 'constructor', '__proto__'])(
		'treats prototype property %s as unknown content without crashing',
		(type) => {
			const payload = encodeURIComponent(JSON.stringify({ text: 'forged' }));
			const markdown = `<!-- cms:v2:${type} ${payload} -->\n<section>fallback</section>\n<!-- /cms:v2:${type} -->`;
			const parsed = markdownToBlocks(markdown);
			const legacy = markdownToBlocks(`<!-- cms:${type} {"text":"forged"} -->\nfallback`);

			expect(parsed.every((block) => block.type === 'paragraph')).toBe(true);
			expect(() => blocksToMarkdown(parsed)).not.toThrow();
			expect(legacy.every((block) => block.type === 'paragraph')).toBe(true);
			expect(() => blocksToMarkdown(legacy)).not.toThrow();
		}
	);

	it('duplicates rich arrays deeply with fresh ids', () => {
		const source = createBlock('cards');
		source.cards[0].title = 'Asli';
		const copy = duplicateBlock(source);
		copy.cards[0].title = 'Salinan';

		expect(copy.id).not.toBe(source.id);
		expect(copy.cards[0].id).not.toBe(source.cards[0].id);
		expect(source.cards[0].title).toBe('Asli');
	});

	it('repairs duplicate block and nested item ids from copied code markers', () => {
		const first = createBlock('cards');
		first.cards = [createBlock('cards').cards[0], createBlock('cards').cards[0]];
		first.cards[1].id = first.cards[0].id;
		const second = {
			...first,
			cards: first.cards.map((item) => ({ ...item }))
		};
		const parsed = markdownToBlocks(blocksToMarkdown([first, second]));
		const ids = [
			...parsed.map((block) => block.id),
			...parsed.flatMap((block) => block.cards.map((item) => item.id))
		];

		expect(parsed).toHaveLength(2);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it.each<PageBuilderPatternId>(['landing', 'profile', 'faq'])('creates fresh ids for the %s pattern', (id) => {
		const first = createPatternBlocks(id);
		const second = createPatternBlocks(id);
		const allIds = (blocks: ReturnType<typeof createPatternBlocks>) => [
			...blocks.map((block) => block.id),
			...blocks.flatMap((block) => [
				...block.cards.map((item) => item.id),
				...block.gallery.map((item) => item.id),
				...block.stats.map((item) => item.id),
				...block.faqs.map((item) => item.id)
			])
		];

		expect(new Set(allIds(first)).size).toBe(allIds(first).length);
		expect(allIds(first).some((value) => allIds(second).includes(value))).toBe(false);
	});

	it('renders only the documented Page Builder class modifiers', () => {
		const hero = createBlock('hero');
		hero.text = 'Judul';
		hero.tone = 'dark';
		hero.align = 'center';
		const markdown = blocksToMarkdown([hero]);

		expect(markdown).toContain(
			'cms-pb-hero cms-pb-hero--no-media cms-pb-tone-dark cms-pb-align-center'
		);
		expect(markdown).toContain('cms-pb-hero__title');
	});
});
