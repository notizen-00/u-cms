<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { TableRow, TableCell } from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Alert } from '$lib/components/ui/alert';
	import ConfirmDialog from '$lib/components/app/ConfirmDialog.svelte';
	import DataTable from '$lib/components/app/DataTable.svelte';
	import { canManageSite } from '$lib/permissions';
	import { formatDate } from '$lib/utils';
	import type { SitePlugin } from '$lib/types';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const columns = [{ label: 'Plugin' }, { label: 'Versi' }, { label: 'Status' }, { label: 'Aksi' }];

	const canManage = $derived(canManageSite(data.user, data.sites, data.site.id));

	let pendingSlug = $state<string | null>(null);
	let uninstallTarget = $state<SitePlugin | null>(null);
	let uninstallOpen = $state(false);

	function uninstallDescription(plugin: SitePlugin | null): string {
		if (plugin?.slug === 'unej.form-builder') {
			return 'Plugin akan dihapus dari site ini. Semua formulir beserta kiriman pengunjung akan dihapus permanen dan tidak dapat dipulihkan. Blok formulir yang masih tersimpan di berita atau halaman tidak akan dirender.';
		}
		if (plugin?.slug === 'unej.auto-avif') {
			return 'Plugin akan dihapus dari site ini dan konversi AVIF otomatis dihentikan. File media yang sudah ada tetap tersimpan.';
		}

		return 'Plugin akan dihapus dari site ini. Data atau konfigurasi milik plugin dapat dihapus permanen dan tidak dapat dipulihkan.';
	}
</script>

<svelte:head>
	<title>Plugins — {data.site.name} — Unej CMS</title>
</svelte:head>

<div class="space-y-4">
	<div>
		<h1 class="text-xl font-semibold">Plugins — {data.site.name}</h1>
		<p class="text-sm text-muted-foreground">
			Plugin resmi dari tim CMS. Instal, aktifkan, atau nonaktifkan sesuai kebutuhan site ini.
		</p>
	</div>

	{#if form?.message}
		<Alert variant="destructive">{form.message}</Alert>
	{/if}

	<DataTable items={data.plugins} {columns} rowKey={(plugin) => plugin.slug} emptyMessage="Belum ada plugin.">
		{#snippet row(plugin: SitePlugin)}
			<TableRow>
				<TableCell>
					<p class="font-medium">{plugin.name}</p>
					<p class="text-sm text-muted-foreground">{plugin.description}</p>
				</TableCell>
				<TableCell class="text-muted-foreground">{plugin.version}</TableCell>
				<TableCell>
					{#if plugin.isActive}
						<Badge variant="success">Aktif</Badge>
						{#if plugin.activatedAt}
							<p class="mt-1 text-xs text-muted-foreground">sejak {formatDate(plugin.activatedAt)}</p>
						{/if}
					{:else if plugin.isInstalled}
						<Badge variant="outline">Nonaktif</Badge>
						{#if plugin.deactivatedAt}
							<p class="mt-1 text-xs text-muted-foreground">sejak {formatDate(plugin.deactivatedAt)}</p>
						{/if}
					{:else}
						<Badge variant="secondary">Belum diinstal</Badge>
					{/if}
				</TableCell>
				<TableCell>
					{#if canManage}
						<div class="flex flex-wrap gap-2">
							<form
								method="POST"
								action={plugin.isActive ? '?/deactivate' : '?/activate'}
								use:enhance={() => {
									pendingSlug = plugin.slug;
									return async ({ result, update }) => {
										pendingSlug = null;
										if (result.type === 'success') {
											toast.success(
												plugin.isActive
													? 'Plugin dinonaktifkan.'
													: plugin.isInstalled
														? 'Plugin diaktifkan.'
														: 'Plugin diinstal dan diaktifkan.'
											);
										}
										await update();
									};
								}}
							>
								<input type="hidden" name="slug" value={plugin.slug} />
								<Button
									type="submit"
									size="sm"
									variant={plugin.isActive ? 'outline' : 'default'}
									disabled={pendingSlug === plugin.slug}
								>
									{plugin.isActive
										? 'Nonaktifkan'
										: plugin.isInstalled
											? 'Aktifkan'
											: 'Instal & Aktifkan'}
								</Button>
							</form>

							{#if plugin.isInstalled && !plugin.isActive}
								<Button
									type="button"
									size="sm"
									variant="destructive"
									onclick={() => {
										uninstallTarget = plugin;
										uninstallOpen = true;
									}}
								>
									Uninstall
								</Button>
							{/if}
						</div>
					{:else}
						<span class="text-sm text-muted-foreground">—</span>
					{/if}
				</TableCell>
			</TableRow>
		{/snippet}
	</DataTable>
</div>

<ConfirmDialog
	bind:open={uninstallOpen}
	title="Uninstall {uninstallTarget?.name}?"
	description={uninstallDescription(uninstallTarget)}
	confirmLabel="Uninstall"
	action="?/uninstall"
	hiddenFields={uninstallTarget ? { slug: uninstallTarget.slug } : undefined}
/>
