<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { TableRow, TableCell } from '$lib/components/ui/table';
	import DataTable from '$lib/components/app/DataTable.svelte';
	import ConfirmDialog from '$lib/components/app/ConfirmDialog.svelte';
	import { formatDate } from '$lib/utils';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import type { Site } from '$lib/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let deleteTarget = $state<Site | null>(null);
	let confirmOpen = $state(false);
	let selected = $state(new Set<string>());
	let bulkDeleteOpen = $state(false);
	let bulkIds = $state<string[]>([]);

	function askDelete(site: Site) {
		deleteTarget = site;
		confirmOpen = true;
	}

	function askBulkDelete(ids: string[]) {
		bulkIds = ids;
		bulkDeleteOpen = true;
	}

	const columns = [
		{ label: 'Nama' },
		{ label: 'Slug' },
		{ label: 'Domain' },
		{ label: 'Dibuat' },
		{ label: 'Aksi', class: 'text-right' }
	];
</script>

<svelte:head>
	<title>Sites — Unej CMS</title>
</svelte:head>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h1 class="text-xl font-semibold">Sites</h1>
		<Button href="/sites/new"><Plus /> Site Baru</Button>
	</div>

	<DataTable
		items={data.sites}
		{columns}
		rowKey={(site) => site.id}
		searchFn={(site, q) => site.name.toLowerCase().includes(q) || site.slug.toLowerCase().includes(q)}
		searchPlaceholder="Cari nama atau slug..."
		emptyMessage="Belum ada site."
		selectable
		bind:selected
		onBulkDelete={askBulkDelete}
	>
		{#snippet row(site: Site)}
			<TableRow>
				<TableCell>
					<Checkbox
						checked={selected.has(site.id)}
						onCheckedChange={(checked: boolean) => {
							const next = new Set(selected);
							if (checked) next.add(site.id);
							else next.delete(site.id);
							selected = next;
						}}
					/>
				</TableCell>
				<TableCell>
					<a href="/sites/{site.id}" class="font-medium hover:underline">{site.name}</a>
				</TableCell>
				<TableCell class="text-muted-foreground">{site.slug}</TableCell>
				<TableCell class="text-muted-foreground">{site.domain ?? '-'}</TableCell>
				<TableCell class="text-muted-foreground">{formatDate(site.createdAt)}</TableCell>
				<TableCell class="text-right">
					<div class="flex justify-end gap-2">
						<Button href="/sites/{site.id}/edit" variant="outline" size="sm">Edit</Button>
						<Button variant="destructive" size="icon" onclick={() => askDelete(site)} title="Hapus site">
							<Trash2 />
						</Button>
					</div>
				</TableCell>
			</TableRow>
		{/snippet}
	</DataTable>
</div>

{#if deleteTarget}
	<ConfirmDialog
		bind:open={confirmOpen}
		title="Hapus {deleteTarget.name}?"
		description="Semua berita, halaman, dan riwayat build site ini akan ikut terhapus. Tindakan ini tidak bisa dibatalkan."
		action="/sites/{deleteTarget.id}?/delete"
	/>
{/if}

<ConfirmDialog
	bind:open={bulkDeleteOpen}
	title="Hapus {bulkIds.length} site?"
	description="Semua berita, halaman, dan riwayat build site-site ini akan ikut terhapus. Tindakan ini tidak bisa dibatalkan."
	action="?/bulkDelete"
	hiddenFields={{ ids: bulkIds }}
/>
