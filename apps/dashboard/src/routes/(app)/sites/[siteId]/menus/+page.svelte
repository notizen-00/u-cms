<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Select } from '$lib/components/ui/select';
	import { Alert } from '$lib/components/ui/alert';
	import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
	import { TableRow, TableCell } from '$lib/components/ui/table';
	import DataTable from '$lib/components/app/DataTable.svelte';
	import ConfirmDialog from '$lib/components/app/ConfirmDialog.svelte';
	import { canManageSite } from '$lib/permissions';
	import Plus from '@lucide/svelte/icons/plus';
	import type { Menu } from '$lib/types';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const canManage = $derived(canManageSite(data.user, data.sites, data.site.id));
	const columns = [{ label: 'Nama' }, { label: 'Lokasi' }, { label: 'Aksi' }];

	let creating = $state(false);
	let pendingDeleteId = $state<string | null>(null);
	let selected = $state(new Set<string>());
	let bulkDeleteOpen = $state(false);
	let bulkIds = $state<string[]>([]);

	function askBulkDelete(ids: string[]) {
		bulkIds = ids;
		bulkDeleteOpen = true;
	}

	function locationLabel(locationId: string | null) {
		if (!locationId) return 'Tidak ditempatkan';
		return data.menuLocations.find((location) => location.id === locationId)?.label ?? locationId;
	}
</script>

<svelte:head>
	<title>Menu — {data.site.name} — Unej CMS</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-xl font-semibold">Menu — {data.site.name}</h1>
		<p class="text-sm text-muted-foreground">
			Buat menu navigasi kustom, lalu tempatkan di lokasi yang disediakan tema aktif (header, footer, dst).
		</p>
	</div>

	{#if form?.message}
		<Alert variant="destructive">{form.message}</Alert>
	{/if}

	{#if canManage}
		<Card>
			<CardHeader><CardTitle class="text-base">Buat Menu Baru</CardTitle></CardHeader>
			<CardContent>
				<form
					method="POST"
					action="?/create"
					class="flex flex-wrap items-end gap-3"
					use:enhance={() => {
						creating = true;
						return async ({ update }) => {
							creating = false;
							await update();
						};
					}}
				>
					<div class="min-w-48 space-y-1.5">
						<Label for="name">Nama Menu</Label>
						<Input id="name" name="name" placeholder="mis. Menu Utama" required />
					</div>
					<div class="min-w-48 space-y-1.5">
						<Label for="locationId">Lokasi</Label>
						<Select id="locationId" name="locationId">
							<option value="">Tidak ditempatkan</option>
							{#each data.menuLocations as location (location.id)}
								<option value={location.id}>{location.label}</option>
							{/each}
						</Select>
					</div>
					<Button type="submit" disabled={creating}><Plus class="size-4" /> Buat Menu</Button>
				</form>
			</CardContent>
		</Card>
	{/if}

	<DataTable
		items={data.menus}
		{columns}
		rowKey={(item) => item.id}
		emptyMessage="Belum ada menu."
		selectable={canManage}
		bind:selected
		onBulkDelete={askBulkDelete}
	>
		{#snippet row(item: Menu)}
			<TableRow>
				{#if canManage}
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
				{/if}
				<TableCell>
					<a href="/sites/{data.site.id}/menus/{item.id}" class="font-medium hover:underline">{item.name}</a>
				</TableCell>
				<TableCell class="text-muted-foreground">{locationLabel(item.locationId)}</TableCell>
				<TableCell>
					<div class="flex items-center gap-2">
						<Button href="/sites/{data.site.id}/menus/{item.id}" variant="outline" size="sm">Edit</Button>
						{#if canManage}
							<form
								method="POST"
								action="?/delete"
								use:enhance={() => {
									pendingDeleteId = item.id;
									return async ({ result, update }) => {
										pendingDeleteId = null;
										if (result.type === 'success') toast.success('Menu dihapus.');
										await update();
									};
								}}
							>
								<input type="hidden" name="menuId" value={item.id} />
								<Button type="submit" variant="destructive" size="sm" disabled={pendingDeleteId === item.id}>
									Hapus
								</Button>
							</form>
						{/if}
					</div>
				</TableCell>
			</TableRow>
		{/snippet}
	</DataTable>
</div>

<ConfirmDialog
	bind:open={bulkDeleteOpen}
	title="Hapus {bulkIds.length} menu?"
	description="Menu-menu ini beserta seluruh itemnya akan dihapus permanen."
	action="?/bulkDelete"
	hiddenFields={{ ids: bulkIds }}
/>
