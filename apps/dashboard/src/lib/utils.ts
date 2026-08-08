import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function slugify(input: string): string {
	return input
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');
}

export function formatDate(value: string | Date | null | undefined): string {
	if (!value) return '-';
	const date = typeof value === 'string' ? new Date(value) : value;
	if (Number.isNaN(date.getTime())) return '-';
	return new Intl.DateTimeFormat('id-ID', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	}).format(date);
}

export function truncate(input: string, max: number): string {
	if (input.length <= max) return input;
	return `${input.slice(0, max - 1)}…`;
}

/**
 * Flattens a page list into depth-first hierarchical order with each page's
 * nesting depth, for parent-picker dropdowns (indent by depth so the tree
 * structure reads at a glance instead of an alphabetical/creation-order
 * flat list). A page whose parent isn't in the given list (e.g. filtered
 * out because it's the page currently being edited) is treated as a root.
 */
export function sortPagesHierarchically<T extends { id: string; parentId: string | null; title: string }>(
	pages: T[]
): { page: T; depth: number }[] {
	const idsInList = new Set(pages.map((p) => p.id));
	const byParent = new Map<string, T[]>();
	const roots: T[] = [];

	for (const page of pages) {
		if (page.parentId && idsInList.has(page.parentId)) {
			const list = byParent.get(page.parentId) ?? [];
			list.push(page);
			byParent.set(page.parentId, list);
		} else {
			roots.push(page);
		}
	}

	const byTitle = (a: T, b: T) => a.title.localeCompare(b.title);
	roots.sort(byTitle);
	for (const list of byParent.values()) list.sort(byTitle);

	const result: { page: T; depth: number }[] = [];
	const visit = (list: T[], depth: number, ancestry: Set<string>) => {
		for (const page of list) {
			if (ancestry.has(page.id)) continue; // guards against corrupt/cyclic parentId data
			result.push({ page, depth });
			const children = byParent.get(page.id);
			if (children) visit(children, depth + 1, new Set(ancestry).add(page.id));
		}
	};
	visit(roots, 0, new Set());
	return result;
}

export function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	const units = ['KB', 'MB', 'GB'];
	let value = bytes / 1024;
	let unitIndex = 0;
	while (value >= 1024 && unitIndex < units.length - 1) {
		value /= 1024;
		unitIndex += 1;
	}
	return `${value.toFixed(1)} ${units[unitIndex]}`;
}
