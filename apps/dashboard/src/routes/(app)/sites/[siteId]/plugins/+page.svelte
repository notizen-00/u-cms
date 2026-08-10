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
  import { Grid2X2, List } from '@lucide/svelte';


	let { data, form }: { data: PageData; form: ActionData } = $props();

	const columns = [{ label: 'Plugin' }, { label: 'Versi' }, { label: 'Status' }, { label: 'Aksi' }];

	const canManage = $derived(canManageSite(data.user, data.sites, data.site.id));

	let pendingSlug = $state<string | null>(null);
	let uninstallTarget = $state<SitePlugin | null>(null);
	let uninstallOpen = $state(false);
	let viewMode = $state<'grid' | 'list'>('grid');

	function uninstallDescription(plugin: SitePlugin | null): string {
		if (plugin?.slug === 'unej.form-builder') {
			return 'Plugin akan dihapus dari site ini. Semua formulir beserta kiriman pengunjung akan dihapus permanen dan tidak dapat dipulihkan. Blok formulir yang masih tersimpan di berita atau halaman tidak akan dirender.';
		}
		if (plugin?.slug === 'unej.auto-avif') {
			return 'Plugin akan dihapus dari site ini dan konversi AVIF otomatis dihentikan. File media yang sudah ada tetap tersimpan.';
		}
		if (plugin?.slug === 'unej.page-builder') {
			return 'Plugin akan dihapus dari site ini dan editor visual Page Builder dinonaktifkan. Semua konten halaman dan berita tetap tersimpan sebagai Markdown/HTML dan dapat dipulihkan ke editor visual dengan menginstal ulang plugin.';
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


	<div class="space-y-4">
	<!-- Toolbar -->
	<div class="flex items-center justify-between gap-4">
		<div>
			<p class="text-sm text-muted-foreground">
				{data.plugins.length} plugin tersedia
			</p>
		</div>

		<div class="flex items-center rounded-md border bg-background p-1">
			<Button
				type="button"
				variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
				size="sm"
				class="h-8 gap-2 px-3"
				onclick={() => (viewMode = 'grid')}
			>
				<Grid2X2 class="size-4" />
				<span class="hidden sm:inline">Grid</span>
			</Button>

			<Button
				type="button"
				variant={viewMode === 'list' ? 'secondary' : 'ghost'}
				size="sm"
				class="h-8 gap-2 px-3"
				onclick={() => (viewMode = 'list')}
			>
				<List class="size-4" />
				<span class="hidden sm:inline">List</span>
			</Button>
		</div>
	</div>

	{#if data.plugins.length === 0}
		<div
			class="flex min-h-52 items-center justify-center rounded-xl border border-dashed bg-muted/20"
		>
			<div class="text-center">
				<p class="font-medium">Belum ada plugin</p>
				<p class="mt-1 text-sm text-muted-foreground">
					Plugin yang tersedia akan muncul di sini.
				</p>
			</div>
		</div>

	{:else if viewMode === 'grid'}
		<!-- GRID VIEW -->
		<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
			{#each data.plugins as plugin (plugin.slug)}
				<div
					class="group flex min-h-64 flex-col rounded-xl border bg-card p-5 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
				>
					<!-- Header -->
					<div class="flex items-start justify-between gap-4">
						<div class="flex min-w-0 items-start gap-3">
							<div
								class="flex size-11 shrink-0 items-center justify-center rounded-lg border bg-muted text-lg font-semibold uppercase"
							>
								{plugin.name.charAt(0)}
							</div>

							<div class="min-w-0">
								<h3 class="truncate font-semibold">
									{plugin.name}
								</h3>

								<p class="mt-0.5 text-xs text-muted-foreground">
									v{plugin.version}
								</p>
							</div>
						</div>

						{#if plugin.isActive}
							<Badge variant="success">Aktif</Badge>
						{:else if plugin.isInstalled}
							<Badge variant="outline">Nonaktif</Badge>
						{:else}
							<Badge variant="secondary">Belum diinstal</Badge>
						{/if}
					</div>

					<!-- Description -->
					<p
						class="mt-4 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground"
					>
						{plugin.description}
					</p>

					<!-- Meta -->
					<div class="mt-5 border-t pt-4">
						{#if plugin.isActive && plugin.activatedAt}
							<p class="text-xs text-muted-foreground">
								Diaktifkan sejak {formatDate(plugin.activatedAt)}
							</p>
						{:else if plugin.isInstalled && plugin.deactivatedAt}
							<p class="text-xs text-muted-foreground">
								Dinonaktifkan sejak {formatDate(plugin.deactivatedAt)}
							</p>
						{:else if !plugin.isInstalled}
							<p class="text-xs text-muted-foreground">
								Plugin belum terpasang pada website ini.
							</p>
						{:else}
							<p class="text-xs text-muted-foreground">
								Plugin telah terinstal.
							</p>
						{/if}

						<!-- Actions -->
						{#if canManage}
							<div class="mt-4 flex flex-wrap gap-2">
								{#if plugin.slug === 'unej.wordpress-import' && plugin.isActive}
									<Button
										href="/sites/{data.site.id}/plugins/wordpress-import"
										size="sm"
										variant="outline"
										class="w-full"
									>
										Kelola Import
									</Button>
								{/if}
								<form
									class="flex-1"
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
									<input
										type="hidden"
										name="slug"
										value={plugin.slug}
									/>

									<Button
										type="submit"
										size="sm"
										class="w-full"
										variant={plugin.isActive ? 'outline' : 'default'}
										disabled={pendingSlug === plugin.slug}
									>
										{#if pendingSlug === plugin.slug}
											Memproses...
										{:else if plugin.isActive}
											Nonaktifkan
										{:else if plugin.isInstalled}
											Aktifkan
										{:else}
											Instal & Aktifkan
										{/if}
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
							<p class="mt-4 text-xs text-muted-foreground">
								Anda tidak memiliki izin untuk mengelola plugin.
							</p>
						{/if}
					</div>
				</div>
			{/each}
		</div>

	{:else}
		<!-- LIST VIEW -->
		<DataTable
			items={data.plugins}
			{columns}
			rowKey={(plugin) => plugin.slug}
			emptyMessage="Belum ada plugin."
		>
			{#snippet row(plugin: SitePlugin)}
				<TableRow>
					<TableCell>
						<div class="flex items-start gap-3">
							<div
								class="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted font-semibold uppercase"
							>
								{plugin.name.charAt(0)}
							</div>

							<div>
								<p class="font-medium">{plugin.name}</p>
								<p class="mt-1 line-clamp-2 text-sm text-muted-foreground">
									{plugin.description}
								</p>
							</div>
						</div>
					</TableCell>

					<TableCell class="text-muted-foreground">
						{plugin.version}
					</TableCell>

					<TableCell>
						{#if plugin.isActive}
							<Badge variant="success">Aktif</Badge>

							{#if plugin.activatedAt}
								<p class="mt-1 text-xs text-muted-foreground">
									sejak {formatDate(plugin.activatedAt)}
								</p>
							{/if}
						{:else if plugin.isInstalled}
							<Badge variant="outline">Nonaktif</Badge>

							{#if plugin.deactivatedAt}
								<p class="mt-1 text-xs text-muted-foreground">
									sejak {formatDate(plugin.deactivatedAt)}
								</p>
							{/if}
						{:else}
							<Badge variant="secondary">Belum diinstal</Badge>
						{/if}
					</TableCell>

					<TableCell>
						{#if canManage}
							<div class="flex flex-wrap gap-2">
								{#if plugin.slug === 'unej.wordpress-import' && plugin.isActive}
									<Button href="/sites/{data.site.id}/plugins/wordpress-import" size="sm" variant="outline">
										Kelola Import
									</Button>
								{/if}
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
									<input
										type="hidden"
										name="slug"
										value={plugin.slug}
									/>

									<Button
										type="submit"
										size="sm"
										variant={plugin.isActive ? 'outline' : 'default'}
										disabled={pendingSlug === plugin.slug}
									>
										{#if pendingSlug === plugin.slug}
											Memproses...
										{:else if plugin.isActive}
											Nonaktifkan
										{:else if plugin.isInstalled}
											Aktifkan
										{:else}
											Instal & Aktifkan
										{/if}
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
	{/if}
</div>
</div>

<ConfirmDialog
	bind:open={uninstallOpen}
	title="Uninstall {uninstallTarget?.name}?"
	description={uninstallDescription(uninstallTarget)}
	confirmLabel="Uninstall"
	action="?/uninstall"
	hiddenFields={uninstallTarget ? { slug: uninstallTarget.slug } : undefined}
/>
