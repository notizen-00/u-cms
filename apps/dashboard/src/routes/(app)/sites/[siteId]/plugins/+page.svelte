<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { TableRow, TableCell } from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Alert } from '$lib/components/ui/alert';
	import DataTable from '$lib/components/app/DataTable.svelte';
	import { canManageSite } from '$lib/permissions';
	import { formatDate } from '$lib/utils';
	import type { SitePlugin } from '$lib/types';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const columns = [{ label: 'Plugin' }, { label: 'Versi' }, { label: 'Status' }, { label: 'Aksi' }];

	const canManage = $derived(canManageSite(data.user, data.sites, data.site.id));

	let pendingSlug = $state<string | null>(null);
</script>

<svelte:head>
	<title>Plugins — {data.site.name} — Unej CMS</title>
</svelte:head>

<div class="space-y-4">
	<div>
		<h1 class="text-xl font-semibold">Plugins — {data.site.name}</h1>
		<p class="text-sm text-muted-foreground">
			Plugin resmi dari tim CMS. Tidak ada marketplace atau upload — aktifkan/nonaktifkan sesuai kebutuhan
			site ini.
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
					{:else}
						<Badge variant="outline">Nonaktif</Badge>
					{/if}
				</TableCell>
				<TableCell>
					{#if canManage}
						<form
							method="POST"
							action={plugin.isActive ? '?/deactivate' : '?/activate'}
							use:enhance={() => {
								pendingSlug = plugin.slug;
								return async ({ result, update }) => {
									pendingSlug = null;
									if (result.type === 'success') {
										toast.success(plugin.isActive ? 'Plugin dinonaktifkan.' : 'Plugin diaktifkan.');
									}
									await update();
								};
							}}
						>
							<input type="hidden" name="slug" value={plugin.slug} />
							<Button
								type="submit"
								size="sm"
								variant={plugin.isActive ? 'destructive' : 'default'}
								disabled={pendingSlug === plugin.slug}
							>
								{plugin.isActive ? 'Nonaktifkan' : 'Aktifkan'}
							</Button>
						</form>
					{:else}
						<span class="text-sm text-muted-foreground">—</span>
					{/if}
				</TableCell>
			</TableRow>
		{/snippet}
	</DataTable>
</div>
