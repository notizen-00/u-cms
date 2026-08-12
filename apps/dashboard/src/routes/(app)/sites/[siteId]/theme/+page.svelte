<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Alert } from '$lib/components/ui/alert';
	import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '$lib/components/ui/card';
	import { canManageSite } from '$lib/permissions';
	import * as Dialog from '$lib/components/ui/dialog';
	import Check from '@lucide/svelte/icons/check';
	import Palette from '@lucide/svelte/icons/palette';
	import Settings from '@lucide/svelte/icons/settings';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import type { SiteCompatibilityReport } from '$lib/types';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const canManage = $derived(canManageSite(data.user, data.sites, data.site.id));

	let pendingThemeId = $state<string | null>(null);
	/**
	 * Set when a compatibility scan came back with pages that would lose
	 * sections (docs/theme_aware_prd.md §11, §25) — the switch waits for an
	 * explicit confirmation instead of silently breaking those pages.
	 */
	let warning = $state<{ themeId: string; themeName: string; report: SiteCompatibilityReport } | null>(
		null
	);
	let applyingThemeId = $state<string | null>(null);

	function submitApply(themeId: string) {
		applyingThemeId = themeId;
		// Rendered below and submitted programmatically so both the "no issues"
		// path and the confirmation dialog reach the same single apply action.
		queueMicrotask(() => applyForm?.requestSubmit());
	}

	let applyForm = $state<HTMLFormElement | null>(null);
</script>

<svelte:head>
	<title>Tema — {data.site.name} — Unej CMS</title>
</svelte:head>

<div class="space-y-4">
	<div>
		<h1 class="text-xl font-semibold">Tema — {data.site.name}</h1>
		<p class="text-sm text-muted-foreground">
			Tema resmi dari tim CMS. Pilih satu untuk diterapkan ke situs ini — build berikutnya akan memakai tema
			itu.
		</p>
	</div>

	{#if form?.message}
		<Alert variant="destructive">{form.message}</Alert>
	{/if}

	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each data.themes as theme (theme.id)}
			{@const isActive = theme.id === data.site.themeId}
			{@const hasSettings = !!theme.settings && Object.keys(theme.settings).length > 0}
			<Card class={isActive ? 'ring-2 ring-primary' : ''}>
				<div class="flex aspect-video items-center justify-center border-b bg-muted">
					{#if theme.screenshot}
						<img src={theme.screenshot} alt={theme.name} class="h-full w-full object-cover" />
					{:else}
						<Palette class="size-10 text-muted-foreground" />
					{/if}
				</div>
				<CardHeader>
					<div class="flex items-center justify-between gap-2">
						<CardTitle class="text-base">{theme.name}</CardTitle>
						{#if isActive}
							<Badge variant="success"><Check class="size-3" /> Aktif</Badge>
						{/if}
					</div>
					<CardDescription>{theme.description}</CardDescription>
				</CardHeader>
				<CardContent class="text-sm text-muted-foreground">
					<p>Versi {theme.version} · {theme.author}</p>
				</CardContent>
				{#if canManage}
					<CardFooter>
						{#if isActive}
							<div class="flex w-full gap-2">
								<Button variant="outline" size="sm" disabled class="flex-1">Sedang Diterapkan</Button>
								{#if hasSettings}
									<Button variant="outline" size="sm" href="/sites/{data.site.id}/theme/settings">
										<Settings /> Pengaturan
									</Button>
								{/if}
							</div>
						{:else}
							<!--
								Scans first, applies second: the switch itself only runs once
								the admin has seen what it would cost (PRD §11, §25).
							-->
							<form
								method="POST"
								action="?/check"
								class="w-full"
								use:enhance={() => {
									pendingThemeId = theme.id;
									return async ({ result }) => {
										pendingThemeId = null;
										if (result.type !== 'success') return;

										const report = (result.data as { report?: SiteCompatibilityReport } | undefined)
											?.report;
										if (report && report.affected.length > 0) {
											warning = { themeId: theme.id, themeName: theme.name, report };
										} else {
											submitApply(theme.id);
										}
									};
								}}
							>
								<input type="hidden" name="themeId" value={theme.id} />
								<Button
									type="submit"
									size="sm"
									class="w-full"
									disabled={pendingThemeId === theme.id || applyingThemeId !== null}
								>
									Terapkan
								</Button>
							</form>
						{/if}
					</CardFooter>
				{/if}
			</Card>
		{/each}
	</div>
</div>

<!-- The one place the theme actually changes; both paths above route here. -->
<form
	bind:this={applyForm}
	method="POST"
	action="?/apply"
	class="hidden"
	use:enhance={() => {
		return async ({ result, update }) => {
			const applied = applyingThemeId;
			applyingThemeId = null;
			warning = null;
			if (result.type === 'success') {
				const name = data.themes.find((theme) => theme.id === applied)?.name ?? 'Tema';
				toast.success(`Tema "${name}" diterapkan.`);
			}
			await update({ reset: false });
		};
	}}
>
	<input type="hidden" name="themeId" value={applyingThemeId ?? ''} />
</form>

<Dialog.Root
	open={warning !== null}
	onOpenChange={(open) => {
		if (!open) warning = null;
	}}
>
	<Dialog.Content class="max-h-[85vh] max-w-lg overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Sebagian blok tidak didukung</Dialog.Title>
		</Dialog.Header>

		{#if warning}
			<div class="space-y-3">
				<div class="flex gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
					<TriangleAlert class="mt-0.5 size-4 shrink-0 text-amber-600" />
					<p class="text-xs text-muted-foreground">
						<span class="font-semibold text-foreground">{warning.report.compatible}</span> dari
						<span class="font-semibold text-foreground">{warning.report.scanned}</span> halaman
						kompatibel dengan tema "{warning.themeName}".
						<span class="font-semibold text-foreground">{warning.report.affected.length}</span>
						halaman memakai blok yang tidak disediakan tema ini.
					</p>
				</div>

				<div class="space-y-2">
					{#each warning.report.affected as page (page.pageId)}
						<div class="rounded-md border border-border p-2.5">
							<p class="text-sm font-medium">
								{page.title}
								{#if page.isHomepage}
									<span class="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
										Beranda
									</span>
								{/if}
							</p>
							<ul class="mt-1 space-y-0.5">
								{#each page.unsupported as entry (entry.type)}
									<li class="font-mono text-[11px] text-muted-foreground">
										{entry.type}
										{#if entry.fallback}
											→ {entry.fallback}
										{:else}
											· tanpa pengganti
										{/if}
									</li>
								{/each}
							</ul>
						</div>
					{/each}
				</div>

				<p class="text-xs text-muted-foreground">
					Konten blok ini <strong>tidak dihapus</strong>. Blok yang punya pengganti akan dirender
					memakai pengganti itu; yang tidak punya akan dilewati sampai Anda menyuntingnya di Builder.
				</p>
			</div>
		{/if}

		<div class="flex justify-end gap-2 pt-2">
			<Button type="button" variant="ghost" onclick={() => (warning = null)}>Batal</Button>
			<Button type="button" onclick={() => warning && submitApply(warning.themeId)}>
				Terapkan Tetap
			</Button>
		</div>
	</Dialog.Content>
</Dialog.Root>
