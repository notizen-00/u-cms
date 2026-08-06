<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import { Alert } from '$lib/components/ui/alert';
	import { TableRow, TableCell } from '$lib/components/ui/table';
	import DataTable from '$lib/components/app/DataTable.svelte';
	import { canManageSite } from '$lib/permissions';
	import { formatDate } from '$lib/utils';
	import Plus from '@lucide/svelte/icons/plus';
	import Inbox from '@lucide/svelte/icons/inbox';
	import type { CmsForm } from '$lib/types';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const canManage = $derived(canManageSite(data.user, data.sites, data.site.id));
	const columns = [{ label: 'Formulir' }, { label: 'Field' }, { label: 'Dibuat' }, { label: 'Aksi' }];

	let pendingDeleteId = $state<string | null>(null);
</script>

<svelte:head>
	<title>Formulir — {data.site.name} — Unej CMS</title>
</svelte:head>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-xl font-semibold">Formulir — {data.site.name}</h1>
			<p class="text-sm text-muted-foreground">
				Buat formulir, sisipkan lewat blok "Form" di editor Berita/Halaman, lalu lihat hasil kiriman
				pengunjung di sini.
			</p>
		</div>
		{#if data.pluginActive && canManage}
			<Button href="/sites/{data.site.id}/forms/new"><Plus class="size-4" /> Formulir Baru</Button>
		{/if}
	</div>

	{#if !data.pluginActive}
		<Alert variant="warning">
			Plugin <strong>Form Builder</strong> belum aktif untuk site ini. Aktifkan dulu di menu
			<a href="/sites/{data.site.id}/plugins" class="underline">Plugins</a> untuk mulai membuat formulir.
		</Alert>
	{:else}
		{#if form?.message}
			<Alert variant="destructive">{form.message}</Alert>
		{/if}

		<DataTable items={data.forms} {columns} rowKey={(item) => item.id} emptyMessage="Belum ada formulir.">
			{#snippet row(item: CmsForm)}
				<TableRow>
					<TableCell>
						<a href="/sites/{data.site.id}/forms/{item.id}/edit" class="font-medium hover:underline">
							{item.title}
						</a>
					</TableCell>
					<TableCell class="text-muted-foreground">{item.fields.length} field</TableCell>
					<TableCell class="text-muted-foreground">{formatDate(item.createdAt)}</TableCell>
					<TableCell>
						<div class="flex items-center gap-2">
							<Button href="/sites/{data.site.id}/forms/{item.id}/submissions" variant="outline" size="sm">
								<Inbox class="size-4" /> Kiriman
							</Button>
							{#if canManage}
								<Button href="/sites/{data.site.id}/forms/{item.id}/edit" variant="outline" size="sm">
									Edit
								</Button>
								<form
									method="POST"
									action="?/delete"
									use:enhance={() => {
										pendingDeleteId = item.id;
										return async ({ result, update }) => {
											pendingDeleteId = null;
											if (result.type === 'success') toast.success('Formulir dihapus.');
											await update();
										};
									}}
								>
									<input type="hidden" name="formId" value={item.id} />
									<Button
										type="submit"
										variant="destructive"
										size="sm"
										disabled={pendingDeleteId === item.id}
									>
										Hapus
									</Button>
								</form>
							{/if}
						</div>
					</TableCell>
				</TableRow>
			{/snippet}
		</DataTable>
	{/if}
</div>
