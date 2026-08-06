<script lang="ts" generics="T">
	import type { Snippet } from 'svelte';
	import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '$lib/components/ui/table';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import Search from '@lucide/svelte/icons/search';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';

	let {
		items,
		rowKey,
		columns,
		row,
		emptyMessage = 'Belum ada data.',
		searchPlaceholder = 'Cari...',
		searchFn,
		pageSize = 20
	}: {
		items: T[];
		rowKey: (item: T) => string;
		columns: { label: string; class?: string }[];
		row: Snippet<[T]>;
		emptyMessage?: string;
		searchPlaceholder?: string;
		/** Omit to hide the search box entirely (not every list needs one). */
		searchFn?: (item: T, query: string) => boolean;
		pageSize?: number;
	} = $props();

	let search = $state('');
	let page = $state(1);

	const filtered = $derived(
		searchFn && search.trim() ? items.filter((item) => searchFn(item, search.trim().toLowerCase())) : items
	);

	const totalPages = $derived(Math.max(1, Math.ceil(filtered.length / pageSize)));

	// Clamp back into range whenever the filtered set shrinks (search narrows it, a row gets deleted, etc.).
	$effect(() => {
		if (page > totalPages) page = totalPages;
	});

	const paged = $derived(filtered.slice((page - 1) * pageSize, page * pageSize));
</script>

<div class="space-y-3">
	{#if searchFn}
		<div class="relative max-w-xs">
			<Search class="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
			<Input
				type="search"
				placeholder={searchPlaceholder}
				class="pl-8"
				bind:value={search}
				oninput={() => (page = 1)}
			/>
		</div>
	{/if}

	<Table>
		<TableHeader>
			<TableRow>
				{#each columns as col (col.label)}
					<TableHead class={col.class}>{col.label}</TableHead>
				{/each}
			</TableRow>
		</TableHeader>
		<TableBody>
			{#each paged as item (rowKey(item))}
				{@render row(item)}
			{:else}
				<TableRow>
					<TableCell colspan={columns.length} class="py-8 text-center text-muted-foreground">
						{items.length > 0 ? 'Tidak ada hasil yang cocok.' : emptyMessage}
					</TableCell>
				</TableRow>
			{/each}
		</TableBody>
	</Table>

	{#if filtered.length > 0}
		<div class="flex items-center justify-between text-sm text-muted-foreground">
			<span>{filtered.length} item{totalPages > 1 ? ` · Halaman ${page} dari ${totalPages}` : ''}</span>
			{#if totalPages > 1}
				<div class="flex gap-2">
					<Button variant="outline" size="sm" disabled={page <= 1} onclick={() => (page -= 1)}>
						<ChevronLeft class="size-4" /> Sebelumnya
					</Button>
					<Button variant="outline" size="sm" disabled={page >= totalPages} onclick={() => (page += 1)}>
						Berikutnya <ChevronRight class="size-4" />
					</Button>
				</div>
			{/if}
		</div>
	{/if}
</div>
