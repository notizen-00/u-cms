<script lang="ts">
	import { TableRow, TableCell } from '$lib/components/ui/table';
	import DataTable from '$lib/components/app/DataTable.svelte';
	import { formatDate } from '$lib/utils';
	import type { Site } from '$lib/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const columns = [
		{ label: 'Nama' },
		{ label: 'Slug' },
		{ label: 'Domain' },
		{ label: 'Dibuat' }
	];
</script>

<svelte:head>
	<title>Sites — Unej CMS</title>
</svelte:head>

<div class="space-y-4">
	<div>
		<h1 class="text-xl font-semibold">Sites</h1>
		<p class="mt-1 text-sm text-muted-foreground">Satu domain aktif dikelola dari halaman ini.</p>
	</div>

	<DataTable
		items={data.sites}
		{columns}
		rowKey={(site) => site.id}
		searchFn={(site, q) => site.name.toLowerCase().includes(q) || site.slug.toLowerCase().includes(q)}
		searchPlaceholder="Cari nama atau slug..."
		emptyMessage="Belum ada site."
	>
		{#snippet row(site: Site)}
			<TableRow>
				<TableCell>
					<a href="/sites/{site.id}" class="font-medium hover:underline">{site.name}</a>
				</TableCell>
				<TableCell class="text-muted-foreground">{site.slug}</TableCell>
				<TableCell class="text-muted-foreground">{site.domain ?? '-'}</TableCell>
				<TableCell class="text-muted-foreground">{formatDate(site.createdAt)}</TableCell>
			</TableRow>
		{/snippet}
	</DataTable>
</div>
