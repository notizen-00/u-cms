import type { MenuItem, MenuItemInput, MenuItemType } from '$lib/types';

/** The dashboard editor's working model — always kept in depth-first order (see helpers below). */
export interface EditableMenuItem {
	tempId: string;
	parentTempId: string | null;
	type: MenuItemType;
	label: string;
	pageId: string | null;
	url: string | null;
	newTab: boolean;
}

/** Converts a saved menu's nested tree (already depth-first from the API) into the editor's flat model. Existing item ids double as tempIds — the backend replaces all rows wholesale on save, so it never needs to tell old and new ids apart. */
export function flattenTree(nodes: MenuItem[], parentTempId: string | null = null): EditableMenuItem[] {
	return nodes.flatMap((node) => [
		{
			tempId: node.id,
			parentTempId,
			type: node.type,
			label: node.label,
			pageId: node.pageId,
			url: node.url,
			newTab: node.newTab
		},
		...flattenTree(node.children, node.id)
	]);
}

export function depthOf(items: EditableMenuItem[], tempId: string | null): number {
	let depth = 0;
	let current = items.find((i) => i.tempId === tempId);
	while (current?.parentTempId) {
		depth++;
		current = items.find((i) => i.tempId === current!.parentTempId);
	}
	return depth;
}

/** A node's full subtree is always a contiguous slice in depth-first order — this finds its [start, end) bounds. */
function subtreeRange(items: EditableMenuItem[], tempId: string): [number, number] {
	const start = items.findIndex((i) => i.tempId === tempId);
	const depth = depthOf(items, tempId);
	let end = start + 1;
	while (end < items.length && depthOf(items, items[end].tempId) > depth) end++;
	return [start, end];
}

function siblingsOf(items: EditableMenuItem[], parentTempId: string | null): string[] {
	return items.filter((i) => i.parentTempId === parentTempId).map((i) => i.tempId);
}

/** Swaps an item with its previous/next sibling, moving its whole subtree along. Consecutive siblings are always adjacent blocks in depth-first order, so this is a plain block swap. */
export function moveSibling(items: EditableMenuItem[], tempId: string, direction: -1 | 1): EditableMenuItem[] {
	const self = items.find((i) => i.tempId === tempId);
	if (!self) return items;
	const siblings = siblingsOf(items, self.parentTempId);
	const idx = siblings.indexOf(tempId);
	const targetIdx = idx + direction;
	if (targetIdx < 0 || targetIdx >= siblings.length) return items;

	const [selfStart, selfEnd] = subtreeRange(items, tempId);
	const [targetStart, targetEnd] = subtreeRange(items, siblings[targetIdx]);

	if (direction === 1) {
		return [
			...items.slice(0, selfStart),
			...items.slice(selfEnd, targetEnd),
			...items.slice(selfStart, selfEnd),
			...items.slice(targetEnd)
		];
	}
	return [
		...items.slice(0, targetStart),
		...items.slice(selfStart, selfEnd),
		...items.slice(targetStart, selfStart),
		...items.slice(selfEnd)
	];
}

/** Nests an item under its immediately preceding sibling. That sibling's subtree already ends exactly where this item starts, so no repositioning is needed — only the parent link changes. */
export function indentItem(items: EditableMenuItem[], tempId: string): EditableMenuItem[] {
	const self = items.find((i) => i.tempId === tempId);
	if (!self) return items;
	const siblings = siblingsOf(items, self.parentTempId);
	const idx = siblings.indexOf(tempId);
	if (idx <= 0) return items;
	const newParentTempId = siblings[idx - 1];
	return items.map((i) => (i.tempId === tempId ? { ...i, parentTempId: newParentTempId } : i));
}

/** Promotes an item to be its parent's sibling. Its subtree has to move to right after the (now shorter) former parent's subtree to stay in valid depth-first order. */
export function outdentItem(items: EditableMenuItem[], tempId: string): EditableMenuItem[] {
	const self = items.find((i) => i.tempId === tempId);
	if (!self || !self.parentTempId) return items;
	const parent = items.find((i) => i.tempId === self.parentTempId);
	if (!parent) return items;
	const newParentTempId = parent.parentTempId;

	const [selfStart, selfEnd] = subtreeRange(items, tempId);
	const selfBlock = items
		.slice(selfStart, selfEnd)
		.map((i) => (i.tempId === tempId ? { ...i, parentTempId: newParentTempId } : i));
	const without = [...items.slice(0, selfStart), ...items.slice(selfEnd)];
	const [, parentEnd] = subtreeRange(without, parent.tempId);

	return [...without.slice(0, parentEnd), ...selfBlock, ...without.slice(parentEnd)];
}

/** Removes an item and everything nested under it. */
export function removeItem(items: EditableMenuItem[], tempId: string): EditableMenuItem[] {
	const [start, end] = subtreeRange(items, tempId);
	return [...items.slice(0, start), ...items.slice(end)];
}

/** tempIds of an item and everything nested under it — the set a "pick a parent" dropdown must exclude to avoid creating a cycle. */
export function descendantIds(items: EditableMenuItem[], tempId: string): Set<string> {
	const [start, end] = subtreeRange(items, tempId);
	return new Set(items.slice(start, end).map((i) => i.tempId));
}

/**
 * Moves an item (and its subtree) to be the last child of `newParentTempId`
 * (or the last top-level item, if null) — the general-purpose move behind
 * the item editor's "Induk" dropdown. `indentItem`/`outdentItem` above cover
 * the common one-step cases with a friendlier default position; this covers
 * jumping anywhere else in the tree.
 */
export function setParent(
	items: EditableMenuItem[],
	tempId: string,
	newParentTempId: string | null
): EditableMenuItem[] {
	const self = items.find((i) => i.tempId === tempId);
	if (!self || self.parentTempId === newParentTempId || tempId === newParentTempId) return items;
	if (newParentTempId !== null && descendantIds(items, tempId).has(newParentTempId)) return items;

	const [selfStart, selfEnd] = subtreeRange(items, tempId);
	const selfBlock = items
		.slice(selfStart, selfEnd)
		.map((i) => (i.tempId === tempId ? { ...i, parentTempId: newParentTempId } : i));
	const without = [...items.slice(0, selfStart), ...items.slice(selfEnd)];

	const insertAt = newParentTempId === null ? without.length : subtreeRange(without, newParentTempId)[1];
	return [...without.slice(0, insertAt), ...selfBlock, ...without.slice(insertAt)];
}

/**
 * Drag-and-drop reorder: drops `tempId` immediately before `beforeTempId`.
 * Only reorders within the dragged item's current parent — dropping onto an
 * item under a different parent is a no-op, since reparenting has its own
 * explicit controls (indent/outdent, the "Induk" dropdown) and inferring it
 * from drop position is exactly the kind of fragile guess that turns a drag
 * into an accidental restructure. `beforeTempId: null` drops at the end.
 */
export function reorderWithinParent(
	items: EditableMenuItem[],
	tempId: string,
	beforeTempId: string | null
): EditableMenuItem[] {
	const self = items.find((i) => i.tempId === tempId);
	if (!self || tempId === beforeTempId) return items;
	if (beforeTempId !== null) {
		const target = items.find((i) => i.tempId === beforeTempId);
		if (!target || target.parentTempId !== self.parentTempId) return items;
	}

	const [selfStart, selfEnd] = subtreeRange(items, tempId);
	const selfBlock = items.slice(selfStart, selfEnd);
	const without = [...items.slice(0, selfStart), ...items.slice(selfEnd)];

	let insertAt: number;
	if (beforeTempId === null) {
		const siblings = without.filter((i) => i.parentTempId === self.parentTempId);
		insertAt = siblings.length === 0 ? without.length : subtreeRange(without, siblings[siblings.length - 1].tempId)[1];
	} else {
		insertAt = subtreeRange(without, beforeTempId)[0];
	}

	return [...without.slice(0, insertAt), ...selfBlock, ...without.slice(insertAt)];
}

export function updateItem(
	items: EditableMenuItem[],
	tempId: string,
	patch: Partial<EditableMenuItem>
): EditableMenuItem[] {
	return items.map((i) => (i.tempId === tempId ? { ...i, ...patch } : i));
}

/** Items are always kept depth-first ordered, so their array index doubles as the global sibling-preserving order the backend expects. */
export function toMenuItemInputs(items: EditableMenuItem[]): MenuItemInput[] {
	return items.map((item, order) => ({
		tempId: item.tempId,
		parentTempId: item.parentTempId,
		order,
		type: item.type,
		label: item.label,
		pageId: item.type === 'page' ? item.pageId : null,
		url: item.type === 'custom' ? item.url : null,
		newTab: item.newTab
	}));
}
