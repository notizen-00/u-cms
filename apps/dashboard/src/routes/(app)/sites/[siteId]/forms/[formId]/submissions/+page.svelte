<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { TableRow, TableCell } from '$lib/components/ui/table';
	import DataTable from '$lib/components/app/DataTable.svelte';
	import ConfirmDialog from '$lib/components/app/ConfirmDialog.svelte';
	import { formatDate } from '$lib/utils';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import type { FormSubmission } from '$lib/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const columns = $derived([
		...data.cmsForm.fields.map((field) => ({ label: field.label })),
		{ label: 'Dikirim' },
		{ label: 'Aksi', class: 'text-right' }
	]);

	function cellValue(submission: FormSubmission, key: string): string {
		const value = submission.data[key];
		if (value === undefined || value === null || value === '') return '—';
		if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak';
		return String(value);
	}

	let selected = $state(new Set<string>());
	let deleteTarget = $state<FormSubmission | null>(null);
	let deleteOpen = $state(false);
	let bulkDeleteOpen = $state(false);
	let bulkIds = $state<string[]>([]);

	function askDelete(submission: FormSubmission) {
		deleteTarget = submission;
		deleteOpen = true;
	}

	function askBulkDelete(ids: string[]) {
		bulkIds = ids;
		bulkDeleteOpen = true;
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
		selectable
		bind:selected
		onBulkDelete={askBulkDelete}
	>
		{#snippet row(submission: FormSubmission)}
			<TableRow>
				<TableCell>
					<Checkbox
						checked={selected.has(submission.id)}
						onCheckedChange={(checked: boolean) => {
							const next = new Set(selected);
							if (checked) next.add(submission.id);
							else next.delete(submission.id);
							selected = next;
						}}
					/>
				</TableCell>
				{#each data.cmsForm.fields as field (field.key)}
					<TableCell>{cellValue(submission, field.key)}</TableCell>
				{/each}
				<TableCell class="text-muted-foreground">{formatDate(submission.createdAt)}</TableCell>
				<TableCell class="text-right">
					<Button variant="destructive" size="icon" onclick={() => askDelete(submission)} title="Hapus kiriman">
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
		title="Hapus kiriman ini?"
		description="Data kiriman ini akan dihapus permanen dan tidak bisa dipulihkan."
		action="?/delete"
		hiddenFields={{ id: deleteTarget.id }}
	/>
{/if}

<ConfirmDialog
	bind:open={bulkDeleteOpen}
	title="Hapus {bulkIds.length} kiriman?"
	description="Data kiriman-kiriman ini akan dihapus permanen dan tidak bisa dipulihkan."
	action="?/bulkDelete"
	hiddenFields={{ ids: bulkIds }}
/>
