<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { TableRow, TableCell } from '$lib/components/ui/table';
	import DataTable from '$lib/components/app/DataTable.svelte';
	import StatusBadge from '$lib/components/app/StatusBadge.svelte';
	import { formatDate } from '$lib/utils';
	import type { PageItem } from '$lib/types';
	import Plus from '@lucide/svelte/icons/plus';
	import Home from '@lucide/svelte/icons/home';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function parentTitle(parentId: string | null) {
		if (!parentId) return '-';
		return data.pages.find((p) => p.id === parentId)?.title ?? '-';
	}

	const columns = [
		{ label: 'Judul' },
		{ label: 'Induk' },
		{ label: 'Urutan' },
		{ label: 'Status' },
		{ label: 'Diperbarui' }
	];
</script>

<svelte:head>
	<title>Halaman — {data.site.name}</title>
</svelte:head>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h1 class="text-xl font-semibold">Halaman — {data.site.name}</h1>
		<Button href="/sites/{data.site.id}/pages/new"><Plus /> Halaman Baru</Button>
	</div>

	<DataTable
		items={data.pages}
		{columns}
		rowKey={(item) => item.id}
		searchFn={(item, q) => item.title.toLowerCase().includes(q)}
		searchPlaceholder="Cari judul halaman..."
		emptyMessage="Belum ada halaman."
	>
		{#snippet row(item: PageItem)}
			<TableRow>
				<TableCell>
					<a
						href="/sites/{data.site.id}/pages/{item.id}"
						class="inline-flex items-center gap-1.5 font-medium hover:underline"
					>
						{#if item.isHomepage}<Home class="size-3.5 text-muted-foreground" />{/if}
						{item.title}
					</a>
				</TableCell>
				<TableCell class="text-muted-foreground">{parentTitle(item.parentId)}</TableCell>
				<TableCell class="text-muted-foreground">{item.order}</TableCell>
				<TableCell><StatusBadge status={item.status} /></TableCell>
				<TableCell class="text-muted-foreground">{formatDate(item.updatedAt)}</TableCell>
			</TableRow>
		{/snippet}
	</DataTable>
</div>
