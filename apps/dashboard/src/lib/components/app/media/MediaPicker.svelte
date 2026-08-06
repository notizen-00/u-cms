<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import MediaGrid from './MediaGrid.svelte';
	import MediaPagination from './MediaPagination.svelte';
	import MediaFilterBar from './MediaFilterBar.svelte';
	import MediaUploadZone from './MediaUploadZone.svelte';
	import { cn } from '$lib/utils';
	import type { Media, MediaListResult } from '$lib/types';

	let {
		siteId,
		open = $bindable(false),
		onSelect
	}: { siteId: string; open?: boolean; onSelect: (media: Media) => void } = $props();

	const LIMIT = 20;

	let activeTab = $state<'library' | 'upload'>('library');
	let items = $state<Media[]>([]);
	let loading = $state(false);
	let page = $state(1);
	let totalPages = $state(1);
	let total = $state(0);
	let typeFilter = $state<'all' | 'image' | 'document'>('all');
	let search = $state('');
	let debouncedSearch = $state('');

	async function loadMedia() {
		loading = true;
		try {
			const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
			if (typeFilter !== 'all') params.set('type', typeFilter);
			if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());

			const response = await fetch(`/sites/${siteId}/media/list?${params}`);
			const data: MediaListResult = await response.json();
			items = data.items ?? [];
			totalPages = data.totalPages ?? 1;
			total = data.total ?? 0;
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		const timer = setTimeout(() => {
			debouncedSearch = search;
		}, 300);
		return () => clearTimeout(timer);
	});

	$effect(() => {
		// Reset to page 1 whenever the filter/search changes.
		typeFilter;
		debouncedSearch;
		page = 1;
	});

	$effect(() => {
		if (open && activeTab === 'library') {
			// deps: page, typeFilter, debouncedSearch
			loadMedia();
		}
	});

	function selectItem(item: Media) {
		onSelect(item);
		open = false;
	}

	function onUploaded(media: Media) {
		items = [media, ...items];
		total += 1;
		activeTab = 'library';
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-w-4xl">
		<Dialog.Header>
			<Dialog.Title>Pilih Media</Dialog.Title>
		</Dialog.Header>

		<div class="flex gap-1 border-b border-border">
			<button
				type="button"
				class={cn(
					'border-b-2 px-3 py-2 text-sm font-medium',
					activeTab === 'library' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
				)}
				onclick={() => (activeTab = 'library')}
			>
				Pustaka Media
			</button>
			<button
				type="button"
				class={cn(
					'border-b-2 px-3 py-2 text-sm font-medium',
					activeTab === 'upload' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
				)}
				onclick={() => (activeTab = 'upload')}
			>
				Unggah Baru
			</button>
		</div>

		{#if activeTab === 'library'}
			<div class="space-y-3">
				<MediaFilterBar bind:type={typeFilter} bind:search />

				{#if loading}
					<p class="py-10 text-center text-sm text-muted-foreground">Memuat...</p>
				{:else}
					<MediaGrid {items} mode="picker" onSelect={selectItem} emptyMessage="Tidak ada media yang cocok." />
					<MediaPagination {page} {totalPages} {total} onChange={(p) => (page = p)} />
				{/if}
			</div>
		{:else}
			<MediaUploadZone {siteId} {onUploaded} />
		{/if}
	</Dialog.Content>
</Dialog.Root>
