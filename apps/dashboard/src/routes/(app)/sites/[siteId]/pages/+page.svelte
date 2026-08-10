<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { TableRow, TableCell } from '$lib/components/ui/table';
	import DataTable from '$lib/components/app/DataTable.svelte';
	import ConfirmDialog from '$lib/components/app/ConfirmDialog.svelte';
	import StatusBadge from '$lib/components/app/StatusBadge.svelte';
	import { formatDate } from '$lib/utils';
	import type { PageItem } from '$lib/types';
	import Plus from '@lucide/svelte/icons/plus';
	import Home from '@lucide/svelte/icons/home';
	import Trash2 from '@lucide/svelte/icons/trash-2';
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
		{ label: 'Diperbarui' },
		{ label: 'Aksi', class: 'text-right' }
	];

	let selected = $state(new Set<string>());
	let deleteTarget = $state<PageItem | null>(null);
	let deleteOpen = $state(false);
	let bulkDeleteOpen = $state(false);
	let bulkIds = $state<string[]>([]);

	function askDelete(item: PageItem) {
		deleteTarget = item;
		deleteOpen = true;
	}

	function askBulkDelete(ids: string[]) {
		bulkIds = ids;
		bulkDeleteOpen = true;
	}
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
		selectable
		bind:selected
		onBulkDelete={askBulkDelete}
	>
		{#snippet row(item: PageItem)}
			<TableRow>
				<TableCell>
					<Checkbox
						checked={selected.has(item.id)}
						onCheckedChange={(checked: boolean) => {
							const next = new Set(selected);
							if (checked) next.add(item.id);
							else next.delete(item.id);
							selected = next;
						}}
					/>
				</TableCell>
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
				<TableCell class="text-right">
					<Button variant="destructive" size="icon" onclick={() => askDelete(item)} title="Hapus halaman">
						<Trash2 />
					</Button>
				</TableCell>
			</TableRow>
		{/snippet}
	</DataTable>
</div>

{#if deleteTarget}
	<ConfirmDialog
		bind:open={deleteOpen}
		title="Hapus {deleteTarget.title}?"
		description="Halaman ini akan dihapus permanen dan tidak bisa dipulihkan."
		action="?/delete"
		hiddenFields={{ id: deleteTarget.id }}
	/>
{/if}

<ConfirmDialog
	bind:open={bulkDeleteOpen}
	title="Hapus {bulkIds.length} halaman?"
	description="Halaman-halaman ini akan dihapus permanen dan tidak bisa dipulihkan."
	action="?/bulkDelete"
	hiddenFields={{ ids: bulkIds }}
/>
