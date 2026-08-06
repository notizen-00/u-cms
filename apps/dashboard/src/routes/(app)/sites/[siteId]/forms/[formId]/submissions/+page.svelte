<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { TableRow, TableCell } from '$lib/components/ui/table';
	import DataTable from '$lib/components/app/DataTable.svelte';
	import { formatDate } from '$lib/utils';
	import type { FormSubmission } from '$lib/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const columns = $derived([
		...data.cmsForm.fields.map((field) => ({ label: field.label })),
		{ label: 'Dikirim' }
	]);

	function cellValue(submission: FormSubmission, key: string): string {
		const value = submission.data[key];
		if (value === undefined || value === null || value === '') return '—';
		if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak';
		return String(value);
	}
</script>

<svelte:head>
	<title>Kiriman {data.cmsForm.title} — {data.site.name} — Unej CMS</title>
</svelte:head>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-xl font-semibold">Kiriman — {data.cmsForm.title}</h1>
			<p class="text-sm text-muted-foreground">{data.submissions.length} kiriman diterima.</p>
		</div>
		<Button href="/sites/{data.site.id}/forms/{data.cmsForm.id}/edit" variant="outline">Edit Formulir</Button>
	</div>

	<DataTable
		items={data.submissions}
		{columns}
		rowKey={(item) => item.id}
		emptyMessage="Belum ada kiriman untuk formulir ini."
	>
		{#snippet row(submission: FormSubmission)}
			<TableRow>
				{#each data.cmsForm.fields as field (field.key)}
					<TableCell>{cellValue(submission, field.key)}</TableCell>
				{/each}
				<TableCell class="text-muted-foreground">{formatDate(submission.createdAt)}</TableCell>
			</TableRow>
		{/snippet}
	</DataTable>
</div>
