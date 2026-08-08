<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Select } from '$lib/components/ui/select';
	import { Alert } from '$lib/components/ui/alert';
	import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
	import MenuStructureEditor from '$lib/components/app/menus/MenuStructureEditor.svelte';
	import { flattenTree, toMenuItemInputs, type EditableMenuItem } from '$lib/components/app/menus/menu-tree';
	import { canManageSite } from '$lib/permissions';
	import { cn } from '$lib/utils';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const canManage = $derived(canManageSite(data.user, data.sites, data.site.id));

	let name = $state(data.menu.name);
	let locationId = $state(data.menu.locationId ?? '');
	let items = $state<EditableMenuItem[]>(flattenTree(data.menu.items));
	const itemsJson = $derived(JSON.stringify(toMenuItemInputs(items)));

	let submitting = $state(false);

	let activeTab = $state<'pages' | 'custom'>('pages');
	let checkedPageIds = $state<Set<string>>(new Set());
	let customLabel = $state('');
	let customUrl = $state('');

	function togglePage(pageId: string, checked: boolean) {
		const next = new Set(checkedPageIds);
		if (checked) next.add(pageId);
		else next.delete(pageId);
		checkedPageIds = next;
	}

	function addPages() {
		const toAdd = data.pages.filter((page) => checkedPageIds.has(page.id));
		items = [
			...items,
			...toAdd.map((page) => ({
				tempId: crypto.randomUUID(),
				parentTempId: null,
				type: 'page' as const,
				label: page.title,
				pageId: page.id,
				url: null,
				newTab: false
			}))
		];
		checkedPageIds = new Set();
	}

	function addCustomLink() {
		if (!customUrl.trim()) return;
		items = [
			...items,
			{
				tempId: crypto.randomUUID(),
				parentTempId: null,
				type: 'custom' as const,
				label: customLabel.trim() || customUrl.trim(),
				pageId: null,
				url: customUrl.trim(),
				newTab: false
			}
		];
		customLabel = '';
		customUrl = '';
	}
</script>

<svelte:head>
	<title>{data.menu.name} — Menu — {data.site.name} — Unej CMS</title>
</svelte:head>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-xl font-semibold">Edit Menu — {data.site.name}</h1>
			<p class="text-sm text-muted-foreground">Tambahkan item, atur urutan dan sub-menu, lalu simpan.</p>
		</div>
		<Button variant="outline" href="/sites/{data.site.id}/menus">Kembali</Button>
	</div>

	{#if form?.message}
		<Alert variant="destructive">{form.message}</Alert>
	{/if}

	<form
		method="POST"
		onsubmit={() => {
			submitting = true;
		}}
		class="grid gap-4 lg:grid-cols-[minmax(0,320px)_1fr]"
	>
		<input type="hidden" name="items" value={itemsJson} />

		<div class="space-y-4">
			<Card>
				<CardHeader><CardTitle class="text-base">Pengaturan Menu</CardTitle></CardHeader>
				<CardContent class="space-y-4">
					<div class="space-y-1.5">
						<Label for="name">Nama Menu</Label>
						<Input id="name" name="name" bind:value={name} required disabled={!canManage} />
					</div>
					<div class="space-y-1.5">
						<Label for="locationId">Lokasi Tampil</Label>
						<Select id="locationId" name="locationId" bind:value={locationId} disabled={!canManage}>
							<option value="">Tidak ditempatkan</option>
							{#each data.menuLocations as location (location.id)}
								<option value={location.id}>{location.label}</option>
							{/each}
						</Select>
						{#if data.menuLocations.length === 0}
							<p class="text-xs text-muted-foreground">Tema aktif tidak menyediakan lokasi menu.</p>
						{/if}
					</div>
				</CardContent>
			</Card>

			{#if canManage}
				<Card>
					<CardHeader><CardTitle class="text-base">Tambah Item Menu</CardTitle></CardHeader>
					<CardContent class="space-y-3">
						<div class="flex gap-1 border-b border-border">
							<button
								type="button"
								class={cn(
									'border-b-2 px-3 py-2 text-sm font-medium',
									activeTab === 'pages' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
								)}
								onclick={() => (activeTab = 'pages')}
							>
								Halaman
							</button>
							<button
								type="button"
								class={cn(
									'border-b-2 px-3 py-2 text-sm font-medium',
									activeTab === 'custom' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
								)}
								onclick={() => (activeTab = 'custom')}
							>
								Tautan Kustom
							</button>
						</div>

						{#if activeTab === 'pages'}
							<div class="max-h-64 space-y-1.5 overflow-y-auto">
								{#each data.pages as page (page.id)}
									<label class="flex items-center gap-2 text-sm">
										<Checkbox
											checked={checkedPageIds.has(page.id)}
											onCheckedChange={(checked: boolean) => togglePage(page.id, checked)}
										/>
										{page.title}
									</label>
								{:else}
									<p class="text-sm text-muted-foreground">Belum ada halaman di site ini.</p>
								{/each}
							</div>
							<Button type="button" size="sm" disabled={checkedPageIds.size === 0} onclick={addPages}>
								Tambah ke Menu
							</Button>
						{:else}
							<div class="space-y-1.5">
								<Label for="customLabel">Label</Label>
								<Input id="customLabel" bind:value={customLabel} placeholder="mis. Kontak" />
							</div>
							<div class="space-y-1.5">
								<Label for="customUrl">URL</Label>
								<Input id="customUrl" bind:value={customUrl} placeholder="https://... atau /path" />
							</div>
							<Button type="button" size="sm" disabled={!customUrl.trim()} onclick={addCustomLink}>
								Tambah ke Menu
							</Button>
						{/if}
					</CardContent>
				</Card>
			{/if}
		</div>

		<Card>
			<CardHeader><CardTitle class="text-base">Struktur Menu</CardTitle></CardHeader>
			<CardContent>
				<MenuStructureEditor bind:items pages={data.pages} />
			</CardContent>
		</Card>

		{#if canManage}
			<div class="lg:col-start-2">
				<Button type="submit" disabled={submitting}>
					{#if submitting}<LoaderCircle class="animate-spin" />{/if}
					Simpan Menu
				</Button>
			</div>
		{/if}
	</form>
</div>
