<script lang="ts">
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import { Alert } from '$lib/components/ui/alert';
	import ConfirmDialog from '$lib/components/app/ConfirmDialog.svelte';
	import MediaGrid from '$lib/components/app/media/MediaGrid.svelte';
	import MediaPagination from '$lib/components/app/media/MediaPagination.svelte';
	import MediaFilterBar from '$lib/components/app/media/MediaFilterBar.svelte';
	import MediaUploadZone from '$lib/components/app/media/MediaUploadZone.svelte';
	import MediaDetailPanel from '$lib/components/app/media/MediaDetailPanel.svelte';
	import type { Media } from '$lib/types';
	import ImagePlus from '@lucide/svelte/icons/image-plus';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// `form` is a union of the update/delete action results — narrow before reading.
	const formMessage = $derived(form && 'message' in form ? form.message : null);
	const formErrors = $derived(form && 'errors' in form ? form.errors : null);

	let items = $state<Media[]>(data.media.items);
	$effect(() => {
		items = data.media.items;
	});

	let typeFilter = $state<'all' | 'image' | 'document'>(data.filters.type as 'all' | 'image' | 'document');
	let search = $state(data.filters.search);
	let showUpload = $state(false);

	let selectedId = $state<string | null>(null);
	let detailOpen = $state(false);
	const selectedItem = $derived(items.find((item) => item.id === selectedId) ?? null);

	// Close the detail panel automatically once its item disappears from the list (e.g. after delete).
	$effect(() => {
		if (selectedId && !items.some((item) => item.id === selectedId)) {
			detailOpen = false;
			selectedId = null;
		}
	});

	let quickDeleteTarget = $state<Media | null>(null);
	let quickDeleteOpen = $state(false);

	function openDetail(item: Media) {
		selectedId = item.id;
		detailOpen = true;
	}

	function requestQuickDelete(item: Media) {
		quickDeleteTarget = item;
		quickDeleteOpen = true;
	}

	function onUploaded(media: Media) {
		items = [media, ...items];
	}

	function applyFilters() {
		const params = new URLSearchParams();
		if (typeFilter !== 'all') params.set('type', typeFilter);
		if (search.trim()) params.set('search', search.trim());
		goto(`?${params}`, { keepFocus: true, noScroll: true });
	}

	function goToPage(page: number) {
		const params = new URLSearchParams();
		params.set('page', String(page));
		if (typeFilter !== 'all') params.set('type', typeFilter);
		if (search.trim()) params.set('search', search.trim());
		goto(`?${params}`, { noScroll: true });
	}

	let typeFilterFirstRun = true;
	$effect(() => {
		typeFilter;
		if (typeFilterFirstRun) {
			typeFilterFirstRun = false;
			return;
		}
		applyFilters();
	});

	let searchFirstRun = true;
	$effect(() => {
		const value = search;
		if (searchFirstRun) {
			searchFirstRun = false;
			return;
		}
		const timer = setTimeout(() => applyFilters(), 400);
		return () => clearTimeout(timer);
	});
</script>

<svelte:head>
	<title>Media — {data.site.name}</title>
</svelte:head>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h1 class="text-xl font-semibold">Media — {data.site.name}</h1>
		<Button onclick={() => (showUpload = !showUpload)}>
			<ImagePlus /> Unggah Media
		</Button>
	</div>

	<!-- Covers failures from the grid's hover-delete, which happens outside the detail panel. -->
	{#if formMessage}
		<Alert variant="destructive">{formMessage}</Alert>
	{/if}

	{#if showUpload}
		<MediaUploadZone siteId={data.site.id} {onUploaded} />
	{/if}

	<MediaFilterBar bind:type={typeFilter} bind:search />

	<MediaGrid {items} mode="manage" onOpen={openDetail} onDelete={requestQuickDelete} emptyMessage="Belum ada media. Unggah file pertama Anda." />

	<MediaPagination page={data.media.page} totalPages={data.media.totalPages} total={data.media.total} onChange={goToPage} />
</div>

<MediaDetailPanel bind:open={detailOpen} media={selectedItem} formError={{ errors: formErrors, message: formMessage }} />

<ConfirmDialog
	bind:open={quickDeleteOpen}
	title="Hapus {quickDeleteTarget?.originalName}?"
	description="File ini akan dihapus permanen dari penyimpanan (tidak ada trash/restore). File ini mungkin masih dipakai di artikel/halaman lain — sistem tidak mengecek pemakaian sebelum menghapus."
	action="?/delete"
	hiddenFields={quickDeleteTarget ? { id: quickDeleteTarget.id } : undefined}
/>
