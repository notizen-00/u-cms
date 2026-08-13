/**
 * Pure `PageBlock[]` mutations for the Builder (docs/theme_aware_prd.md §10).
 * Extracted out of what used to be BlockBuilder.svelte's local closures so
 * that both the canvas (iframe click → insert/select) and the layer rail can
 * drive the same operations without either owning the array itself — the
 * single owner is the Builder page's own `+page.svelte`.
 */
import type { BlockDefinition, PageBlock } from '$lib/types';

export function newBlockId(): string {
	return crypto.randomUUID();
}

/** Seeds props from the schema's declared defaults so a new block is never blank-but-invalid. */
export function defaultPropsFor(definition: BlockDefinition): Record<string, unknown> {
	const props: Record<string, unknown> = {};
	for (const [key, field] of Object.entries(definition.schema)) {
		if ('default' in field && field.default !== undefined) props[key] = field.default;
		else if (field.type === 'boolean') props[key] = false;
		else if (field.type === 'array') props[key] = [];
		else if (field.type === 'object') props[key] = {};
		else props[key] = '';
	}
	return props;
}

/** `at: null` appends. Returns the new block's id so the caller can select it. */
export function insertBlock(
	blocks: PageBlock[],
	definition: BlockDefinition,
	at: number | null
): { blocks: PageBlock[]; insertedId: string } {
	const block: PageBlock = {
		id: newBlockId(),
		type: definition.type,
		props: defaultPropsFor(definition)
	};
	const index = at ?? blocks.length;
	return {
		blocks: [...blocks.slice(0, index), block, ...blocks.slice(index)],
		insertedId: block.id
	};
}

/** Keeps the existing block's id — a replace is an in-place type swap, not a new block. */
export function replaceBlock(
	blocks: PageBlock[],
	index: number,
	definition: BlockDefinition
): { blocks: PageBlock[]; replacedId: string } {
	const replacement: PageBlock = {
		id: blocks[index].id,
		type: definition.type,
		props: defaultPropsFor(definition)
	};
	return {
		blocks: blocks.map((block, i) => (i === index ? replacement : block)),
		replacedId: replacement.id
	};
}

export function moveBlock(blocks: PageBlock[], index: number, direction: -1 | 1): PageBlock[] {
	const target = index + direction;
	if (target < 0 || target >= blocks.length) return blocks;
	const next = [...blocks];
	[next[index], next[target]] = [next[target], next[index]];
	return next;
}

export function duplicateBlock(
	blocks: PageBlock[],
	index: number,
	snapshot: (value: PageBlock) => PageBlock = (value) => value
): { blocks: PageBlock[]; duplicatedId: string } {
	// `snapshot` exists so a caller inside a Svelte component can pass
	// `$state.snapshot` — this module has no runtime dependency on Svelte.
	const copy: PageBlock = {
		...structuredClone(snapshot(blocks[index])),
		id: newBlockId()
	};
	return {
		blocks: [...blocks.slice(0, index + 1), copy, ...blocks.slice(index + 1)],
		duplicatedId: copy.id
	};
}

/** The removed block's id, so the caller can decide what to select next. */
export function removeBlock(blocks: PageBlock[], index: number): { blocks: PageBlock[]; removedId: string } {
	return { blocks: blocks.filter((_, i) => i !== index), removedId: blocks[index].id };
}

export function updateBlockProps(
	blocks: PageBlock[],
	blockId: string,
	props: Record<string, unknown>
): PageBlock[] {
	return blocks.map((block) => (block.id === blockId ? { ...block, props } : block));
}

/**
 * Converts an unsupported block to its declared fallback (docs/theme_aware_prd.md
 * §12/§13). Only prop keys the target schema also declares are carried over —
 * the rest are dropped rather than kept as dead weight the target's editor
 * could never show.
 */
export function convertBlock(blocks: PageBlock[], index: number, target: BlockDefinition): PageBlock[] {
	const block = blocks[index];
	const props: Record<string, unknown> = {};
	for (const key of Object.keys(target.schema)) {
		if (block.props[key] !== undefined) props[key] = block.props[key];
	}
	return blocks.map((current, i) => (i === index ? { ...current, type: target.type, props } : current));
}
