<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Select } from '$lib/components/ui/select';
	import { TableRow, TableCell } from '$lib/components/ui/table';
	import DataTable from '$lib/components/app/DataTable.svelte';
	import StatusBadge from '$lib/components/app/StatusBadge.svelte';
	import { formatDate } from '$lib/utils';
	import { MANUAL_CONTENT_STATUSES, type ContentStatus, type NewsItem } from '$lib/types';
	import Plus from '@lucide/svelte/icons/plus';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let statusFilter = $state<ContentStatus | 'all'>('all');

	const filtered = $derived(
		statusFilter === 'all' ? data.news : data.news.filter((n) => n.status === statusFilter)
	);

	const statusLabels: Record<string, string> = {
		draft: 'Draft',
		in_review: 'Ditinjau',
		approved: 'Disetujui',
		scheduled: 'Terjadwal',
		published: 'Terbit',
		archived: 'Diarsipkan',
		trashed: 'Sampah'
	};

	const columns = [
		{ label: 'Judul' },
		{ label: 'Kategori & Tag' },
		{ label: 'Status' },
		{ label: 'Penulis' },
		{ label: 'Diperbarui' }
	];
</script>

<svelte:head>
	<title>Berita — {data.site.name}</title>
</svelte:head>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h1 class="text-xl font-semibold">Berita — {data.site.name}</h1>
		<Button href="/sites/{data.site.id}/news/new"><Plus /> Berita Baru</Button>
	</div>

	<div class="flex items-center gap-2">
		<span class="text-sm text-muted-foreground">Filter status:</span>
		<Select bind:value={statusFilter} class="w-48">
			<option value="all">Semua</option>
			{#each [...MANUAL_CONTENT_STATUSES, 'published'] as status (status)}
				<option value={status}>{statusLabels[status]}</option>
			{/each}
		</Select>
	</div>

	<DataTable
		items={filtered}
		{columns}
		rowKey={(item) => item.id}
		searchFn={(item, q) => item.title.toLowerCase().includes(q)}
		searchPlaceholder="Cari judul berita..."
		emptyMessage="Belum ada berita."
	>
		{#snippet row(item: NewsItem)}
			<TableRow>
				<TableCell>
					<a href="/sites/{data.site.id}/news/{item.id}" class="font-medium hover:underline">{item.title}</a>
				</TableCell>
				<TableCell>
				{#if item.categories.length === 0 && item.tags.length === 0}
					<span class="text-muted-foreground">-</span>
				{:else}
					<div class="flex flex-wrap gap-1">
						{#each item.categories as category (category.id)}
							<Badge variant="secondary">{category.name}</Badge>
						{/each}
						{#each item.tags as tag (tag.id)}
							<Badge variant="outline">#{tag.name}</Badge>
						{/each}
					</div>
				{/if}
			</TableCell>
			<TableCell><StatusBadge status={item.status} /></TableCell>
				<TableCell class="text-muted-foreground">{item.authorName ?? '-'}</TableCell>
				<TableCell class="text-muted-foreground">{formatDate(item.updatedAt)}</TableCell>
			</TableRow>
		{/snippet}
	</DataTable>
</div>
