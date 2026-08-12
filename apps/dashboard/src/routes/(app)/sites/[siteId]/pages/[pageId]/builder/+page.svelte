<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import { Alert } from '$lib/components/ui/alert';
	import BlockBuilder from '$lib/components/app/builder/BlockBuilder.svelte';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import PanelRight from '@lucide/svelte/icons/panel-right';
	import UploadCloud from '@lucide/svelte/icons/upload-cloud';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import ShieldOff from '@lucide/svelte/icons/shield-off';
	import type { PageBlock } from '$lib/types';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let blocks = $state<PageBlock[]>(data.page.blocks ?? []);
	let savingDraft = $state(false);
	let publishing = $state(false);
	let revokingPreview = $state(false);
	let showPreview = $state(true);

	/**
	 * Whether the live site would look different from what's on screen
	 * (docs/theme_aware_prd.md §16). Compared against `publishedBlocks` — the
	 * production snapshot — not `page.blocks`, since a *saved* draft still
	 * has not gone live until Publish. `data.page` refreshes automatically
	 * after a successful save/publish (`use:enhance`'s default invalidation),
	 * so this stays correct without any manual bookkeeping.
	 */
	const hasUnpublishedChanges = $derived(
		JSON.stringify(blocks) !== JSON.stringify(data.page.publishedBlocks ?? [])
	);

	/**
	 * Bumped to force the iframe to reload after a save. The preview renders
	 * what is *stored*, so refreshing before saving would just redisplay the
	 * old content — hence the reload is tied to a successful save, not to
	 * every keystroke.
	 */
	let previewNonce = $state(0);
	const previewSrc = $derived(
		data.previewUrl ? `${data.previewUrl}?r=${previewNonce}` : null
	);
</script>

<svelte:head>
	<title>Builder — {data.page.title} — {data.site.name}</title>
</svelte:head>

<div class="space-y-4">
	<div class="flex flex-wrap items-center gap-2">
		<Button variant="ghost" size="sm" href="/sites/{data.site.id}/pages/{data.page.id}">
			<ArrowLeft class="size-4" /> Kembali ke Halaman
		</Button>
		<div class="min-w-0 flex-1">
			<h1 class="truncate text-lg font-semibold">{data.page.title}</h1>
			<p class="flex items-center gap-1.5 text-xs text-muted-foreground">
				Page Builder · tema <span class="font-mono">{data.site.themeId}</span>
				{#if hasUnpublishedChanges}
					<span class="ml-1 inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
						<CircleAlert class="size-3" /> Ada perubahan belum dipublikasikan
					</span>
				{/if}
			</p>
		</div>

		<Button
			type="button"
			variant="outline"
			size="sm"
			onclick={() => (showPreview = !showPreview)}
			title="Tampilkan/sembunyikan pratinjau"
		>
			<PanelRight class="size-4" />
			<span class="hidden sm:inline">Pratinjau</span>
		</Button>
		<Button
			type="submit"
			form="block-builder-form"
			variant="outline"
			size="sm"
			disabled={savingDraft || publishing}
		>
			{#if savingDraft}<LoaderCircle class="animate-spin" />{/if}
			Simpan Draft
		</Button>
		<Button
			type="submit"
			form="block-builder-publish-form"
			size="sm"
			disabled={savingDraft || publishing}
		>
			{#if publishing}<LoaderCircle class="animate-spin" />{:else}<UploadCloud class="size-4" />{/if}
			Publikasikan
		</Button>
	</div>

	{#if form?.message}
		<Alert variant="destructive">{form.message}</Alert>
	{/if}

	<!-- Draft only — saved content the Builder itself and the preview read,
	     the live site does not (docs/theme_aware_prd.md §16). -->
	<form
		id="block-builder-form"
		method="POST"
		action="?/save"
		use:enhance={() => {
			savingDraft = true;
			return async ({ result, update }) => {
				savingDraft = false;
				if (result.type === 'success') {
					toast.success('Draf tersimpan.');
					previewNonce += 1;
				}
				await update({ reset: false });
			};
		}}
	>
		<!-- Structured content travels as JSON in one field; the builder edits
		     `PageBlock[]`, never markup. -->
		<input type="hidden" name="blocks" value={JSON.stringify(blocks)} />
	</form>

	<!-- Saves the draft, then snapshots it into `publishedBlocks` — the one
	     action the live site actually reacts to. -->
	<form
		id="block-builder-publish-form"
		method="POST"
		action="?/publish"
		use:enhance={() => {
			publishing = true;
			return async ({ result, update }) => {
				publishing = false;
				if (result.type === 'success') toast.success('Dipublikasikan ke situs.');
				await update({ reset: false });
			};
		}}
	>
		<input type="hidden" name="blocks" value={JSON.stringify(blocks)} />
	</form>

	<!-- Revokes any outstanding preview link for this page (docs/theme_aware_prd.md
	     §23's "dapat dicabut"). Independent of save/publish — it only pulls
	     tokens, it never touches draft or published content. -->
	<form
		id="block-builder-revoke-preview-form"
		method="POST"
		action="?/revokePreview"
		use:enhance={() => {
			revokingPreview = true;
			return async ({ result, update }) => {
				revokingPreview = false;
				if (result.type === 'success') {
					const revoked = (result.data?.revoked as number | undefined) ?? 0;
					toast.success(
						revoked > 0
							? `${revoked} tautan pratinjau dicabut.`
							: 'Tidak ada tautan pratinjau aktif.'
					);
					previewNonce += 1;
				}
				await update({ reset: false });
			};
		}}
	></form>

	<div class={showPreview ? 'grid gap-4 xl:grid-cols-2' : ''}>
		<div class="min-w-0">
			<BlockBuilder
				bind:blocks
				registry={data.registry}
				compatibility={data.compatibility}
				siteId={data.site.id}
			/>
		</div>

		{#if showPreview}
			<div class="min-w-0">
				<div class="flex items-center justify-between gap-2 pb-2">
					<p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
						Pratinjau (draf, tema sungguhan)
					</p>
					<div class="flex items-center gap-1">
						<Button
							type="submit"
							form="block-builder-revoke-preview-form"
							variant="ghost"
							size="sm"
							disabled={revokingPreview}
							title="Cabut semua tautan pratinjau yang aktif untuk halaman ini"
						>
							{#if revokingPreview}
								<LoaderCircle class="size-3.5 animate-spin" />
							{:else}
								<ShieldOff class="size-3.5" />
							{/if}
							<span class="hidden sm:inline">Cabut akses</span>
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onclick={() => {
								previewNonce += 1;
								invalidateAll();
							}}
							title="Muat ulang pratinjau"
						>
							<RefreshCw class="size-3.5" />
						</Button>
					</div>
				</div>

				{#if previewSrc}
					<!--
						Rendered by the API through the theme's own layout and block
						components — the same code path the published site uses, so what
						shows here is what gets built. It renders the DRAFT though, not
						what's currently live — see `hasUnpublishedChanges` above for
						whether those two have diverged.

						`sandbox` without allow-same-origin: preview HTML is
						theme-generated and may embed author content, and it must not be
						able to reach into the dashboard session that framed it.
					-->
					<iframe
						src={previewSrc}
						title="Pratinjau halaman"
						class="h-[calc(100dvh-14rem)] w-full rounded-lg border border-border bg-background"
						sandbox="allow-scripts allow-popups"
						loading="lazy"
					></iframe>
				{:else}
					<div class="grid h-64 place-items-center rounded-lg border border-dashed border-border p-6 text-center">
						<p class="text-sm text-muted-foreground">
							Pratinjau tidak tersedia. Coba muat ulang halaman ini.
						</p>
					</div>
				{/if}

				<p class="pt-2 text-xs text-muted-foreground">
					Pratinjau menampilkan draf yang <strong>sudah tersimpan</strong> — klik Simpan Draf lalu
					muat ulang untuk melihat perubahan terbaru. Situs publik hanya berubah setelah
					<strong>Publikasikan</strong>.
				</p>
			</div>
		{/if}
	</div>
</div>
