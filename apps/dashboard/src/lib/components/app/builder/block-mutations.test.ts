import { describe, expect, it } from 'vitest';
import {
	convertBlock,
	defaultPropsFor,
	duplicateBlock,
	insertBlock,
	moveBlock,
	removeBlock,
	replaceBlock,
	updateBlockProps
} from './block-mutations';
import type { BlockDefinition, PageBlock } from '$lib/types';

const heroDef: BlockDefinition = {
	type: 'core.hero',
	label: 'Hero',
	category: 'Hero',
	source: 'core',
	schema: {
		title: { type: 'string', label: 'Judul', default: 'Halo' },
		featured: { type: 'boolean', label: 'Unggulan' },
		tags: { type: 'array', label: 'Tag', items: { value: { type: 'string', label: 'Tag' } } }
	}
};

const textDef: BlockDefinition = {
	type: 'core.text',
	label: 'Teks',
	category: 'Basic',
	source: 'core',
	schema: { content: { type: 'richtext', label: 'Isi', default: '' } }
};

function block(id: string, type = 'core.text', props: Record<string, unknown> = {}): PageBlock {
	return { id, type, props };
}

describe('defaultPropsFor', () => {
	it('seeds a declared default', () => {
		expect(defaultPropsFor(heroDef).title).toBe('Halo');
	});

	it('falls back to a type-appropriate empty value when no default is declared', () => {
		const props = defaultPropsFor(heroDef);
		expect(props.featured).toBe(false);
		expect(props.tags).toEqual([]);
	});
});

describe('insertBlock', () => {
	it('appends when `at` is null', () => {
		const { blocks, insertedId } = insertBlock([block('a')], heroDef, null);
		expect(blocks.map((b) => b.id)).toEqual(['a', insertedId]);
		expect(blocks[1].type).toBe('core.hero');
	});

	it('inserts at a specific index', () => {
		const { blocks, insertedId } = insertBlock([block('a'), block('b')], heroDef, 1);
		expect(blocks.map((b) => b.id)).toEqual(['a', insertedId, 'b']);
	});
});

describe('replaceBlock', () => {
	it('keeps the same id but swaps type and resets props to the new schema defaults', () => {
		const { blocks, replacedId } = replaceBlock([block('a', 'core.text', { content: 'x' })], 0, heroDef);
		expect(replacedId).toBe('a');
		expect(blocks[0]).toEqual({ id: 'a', type: 'core.hero', props: defaultPropsFor(heroDef) });
	});
});

describe('moveBlock', () => {
	it('swaps two adjacent blocks', () => {
		const moved = moveBlock([block('a'), block('b'), block('c')], 0, 1);
		expect(moved.map((b) => b.id)).toEqual(['b', 'a', 'c']);
	});

	it('is a no-op past either edge', () => {
		const blocks = [block('a'), block('b')];
		expect(moveBlock(blocks, 0, -1)).toBe(blocks);
		expect(moveBlock(blocks, 1, 1)).toBe(blocks);
	});
});

describe('duplicateBlock', () => {
	it('inserts a deep copy right after the source with a new id', () => {
		const source = block('a', 'core.text', { content: 'x' });
		const { blocks, duplicatedId } = duplicateBlock([source, block('b')], 0);

		expect(duplicatedId).not.toBe('a');
		expect(blocks.map((b) => b.id)).toEqual(['a', duplicatedId, 'b']);
		expect(blocks[1].props).toEqual({ content: 'x' });
		expect(blocks[1].props).not.toBe(source.props);
	});
});

describe('removeBlock', () => {
	it('drops the block at the given index and reports its id', () => {
		const { blocks, removedId } = removeBlock([block('a'), block('b')], 0);
		expect(removedId).toBe('a');
		expect(blocks.map((b) => b.id)).toEqual(['b']);
	});
});

describe('updateBlockProps', () => {
	it('replaces one block\'s props by id, leaving the rest untouched', () => {
		const blocks = [block('a', 'core.text', { content: 'x' }), block('b')];
		const updated = updateBlockProps(blocks, 'a', { content: 'y' });
		expect(updated[0].props).toEqual({ content: 'y' });
		expect(updated[1]).toBe(blocks[1]);
	});
});

describe('convertBlock', () => {
	it('carries over only prop keys the target schema declares', () => {
		const blocks = [block('a', 'faculty.video-hero', { title: 'Judul', video: 'x.mp4' })];
		const converted = convertBlock(blocks, 0, heroDef);
		expect(converted[0].type).toBe('core.hero');
		expect(converted[0].props).toEqual({ title: 'Judul' });
	});

	it('drops keys the target schema does not declare', () => {
		const blocks = [block('a', 'core.hero', { title: 'Judul', eyebrow: 'x' })];
		const converted = convertBlock(blocks, 0, textDef);
		expect(converted[0].props).toEqual({});
	});
});
