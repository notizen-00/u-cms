<script lang="ts">
	/**
	 * Full-screen Page Builder (docs/theme_aware_prd.md §10, §14, §24). The
	 * rendered preview is the canvas — everything that touches `blocks` lives
	 * here as the single owner, so both the layer rail (BlockLayerRail) and
	 * canvas-driven selection/insertion (via postMessage from the preview
	 * iframe, see preview-editor-script.ts) can mutate the same state without
	 * either one owning it independently.
	 */
	import { enhance, deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import { Alert } from '$lib/components/ui/alert';
	import BlockLayerRail from '$lib/components/app/builder/BlockLayerRail.svelte';
	import BlockInspector from '$lib/components/app/builder/BlockInspector.svelte';
	import BlockPicker from '$lib/components/app/builder/BlockPicker.svelte';
	import ThemeSettingsPanel from '$lib/components/app/builder/ThemeSettingsPanel.svelte';
	import {
		convertBlock,
		duplicateBlock,
		insertBlock,
		moveBlock,
		removeBlock,
		replaceBlock,
		updateBlockProps
	} from '$lib/components/app/builder/block-mutations';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import PanelLeft from '@lucide/svelte/icons/panel-left';
	import UploadCloud from '@lucide/svelte/icons/upload-cloud';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import ShieldOff from '@lucide/svelte/icons/shield-off';
	import Eye from '@lucide/svelte/icons/eye';
	import SquarePen from '@lucide/svelte/icons/square-pen';
	import type { BlockDefinition, PageBlock } from '$lib/types';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let blocks = $state<PageBlock[]>(data.page.blocks ?? []);
	let selectedId = $state<string | null>(blocks[0]?.id ?? null);
	let insertAt = $state<number | null>(null);
	let replacingIndex = $state<number | null>(null);
	let pickerOpen = $state(false);
	let railOpen = $state(true);
	let activeRightTab = $state<'blok' | 'tema'>('blok');
	let themeSettingsValues = $state<Record<string, unknown>>({ ...data.themeSettings.values });
	/** "edit" shows selection outlines + insert affordances on the canvas; "preview" hides all of that (a plain class flip inside the iframe, no reload — see preview-editor-script.ts). */
	let editorMode = $state<'edit' | 'preview'>('edit');
	let iframeEl = $state<HTMLIFrameElement | undefined>(undefined);
	/** Last scroll position the canvas reported — carried into the next reload's URL so a reload doesn't always snap back to the top (see previewSrc below). */
	let lastKnownScrollY = $state(0);

	type SaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error';
	/** Draft `blocks` autosave status (docs/theme_aware_prd.md §16) — no explicit "Simpan" button; edits save themselves a beat after you stop making them. `Publikasikan` (below) stays a deliberate, explicit action regardless of this. */
	let saveState = $state<SaveState>('idle');
	let saveError = $state('');
	let lastSavedBlocksJson = $state(JSON.stringify(data.page.blocks ?? []));
	let lastSavedThemeJson = $state(JSON.stringify(data.themeSettings.values));

	let publishing = $state(false);
	let revokingPreview = $state(false);

	const byType = $derived(new Map(data.registry.map((b) => [b.type, b])));
	const selectedBlock = $derived(blocks.find((b) => b.id === selectedId) ?? null);

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
	/**
	 * Snapshotted from `lastKnownScrollY` only at the moment a reload is
	 * triggered — NOT read directly in `previewSrc` below, since `previewSrc`
	 * is `$derived` and the iframe reloads whenever its `src` string changes;
	 * wiring it straight to `lastKnownScrollY` (which updates continuously as
	 * the canvas reports scroll position) would reload the iframe on every
	 * scroll event instead of only when we actually ask for a reload.
	 */
	let appliedScrollY = $state(0);
	const previewSrc = $derived(
		data.previewUrl ? `${data.previewUrl}?r=${previewNonce}&scrollY=${appliedScrollY}` : null
	);

	function reloadPreview() {
		appliedScrollY = lastKnownScrollY;
		previewNonce += 1;
	}

	function openPicker(at: number | null) {
		insertAt = at;
		pickerOpen = true;
	}

	function onPickBlock(definition: BlockDefinition) {
		// The same picker serves both "insert" and "replace"; which one applies
		// is decided by whether a replace was started, so the two can never
		// both apply to one pick.
		if (replacingIndex !== null) {
			const { blocks: next, replacedId } = replaceBlock(blocks, replacingIndex, definition);
			blocks = next;
			selectedId = replacedId;
			replacingIndex = null;
		} else {
			const { blocks: next, insertedId } = insertBlock(blocks, definition, insertAt);
			blocks = next;
			selectedId = insertedId;
		}
		insertAt = null;
	}

	function onRemoveBlock(index: number) {
		const { blocks: next, removedId } = removeBlock(blocks, index);
		blocks = next;
		if (selectedId === removedId) selectedId = next[Math.max(0, index - 1)]?.id ?? null;
	}

	function onDuplicateBlock(index: number) {
		const { blocks: next, duplicatedId } = duplicateBlock(blocks, index, (b) => $state.snapshot(b) as PageBlock);
		blocks = next;
		selectedId = duplicatedId;
	}

	function postToCanvas(message: Record<string, unknown>) {
		iframeEl?.contentWindow?.postMessage(message, '*');
	}

	/**
	 * The canvas iframe is sandboxed without `allow-same-origin` (see the
	 * iframe below), which gives it an opaque origin — `event.origin` on a
	 * message from it reads as the literal string `"null"`, so origin-string
	 * checks don't work here. `event.source === iframeEl.contentWindow`
	 * reliably identifies "this came from our exact iframe" instead, which is
	 * all that's needed since every message carries only block ids/types,
	 * nothing sensitive.
	 */
	$effect(() => {
		function onMessage(event: MessageEvent) {
			if (event.source !== iframeEl?.contentWindow) return;
			const msg = event.data as { source?: string; type?: string; [key: string]: unknown } | null;
			if (!msg || msg.source !== 'cms-preview' || typeof msg.type !== 'string') return;

			switch (msg.type) {
				case 'cms:ready':
					// A message posted before the iframe's own listener is attached
					// is simply dropped, not queued — so the very first sync only
					// happens once the canvas confirms it's listening.
					postToCanvas({ type: 'cms:set-mode', mode: editorMode });
					postToCanvas({ type: 'cms:set-selection', blockId: selectedId });
					break;
				case 'cms:select-block':
					if (typeof msg.blockId === 'string') {
						selectedId = msg.blockId;
						activeRightTab = 'blok';
					}
					break;
				case 'cms:insert-at':
					if (typeof msg.index === 'number') openPicker(msg.index);
					break;
				case 'cms:scroll':
					if (typeof msg.y === 'number') lastKnownScrollY = msg.y;
					break;
			}
		}

		window.addEventListener('message', onMessage);
		return () => window.removeEventListener('message', onMessage);
	});

	// Keeps the canvas in sync when selection/mode change from *this* side
	// (e.g. picking a block in the rail instead of clicking the canvas).
	$effect(() => {
		postToCanvas({ type: 'cms:set-mode', mode: editorMode });
	});
	$effect(() => {
		postToCanvas({ type: 'cms:set-selection', blockId: selectedId });
	});

	/** POSTs to a named form action without a `<form>` submit — same pattern as TaxonomyPanel.svelte. */
	async function callAction(action: string, fields: Record<string, string>): Promise<boolean> {
		const body = new FormData();
		for (const [key, value] of Object.entries(fields)) body.set(key, value);

		const response = await fetch(action, {
			method: 'POST',
			body,
			headers: { 'x-sveltekit-action': 'true' }
		});
		const result = deserialize(await response.text());

		if (result.type === 'success') return true;
		if (result.type === 'failure') {
			saveError = String((result.data as { message?: string } | null)?.message ?? 'Gagal menyimpan.');
		} else if (result.type === 'error') {
			saveError = result.error?.message ?? 'Gagal menyimpan.';
		}
		return false;
	}

	async function autosaveBlocks() {
		saveState = 'saving';
		saveError = '';
		const ok = await callAction('?/save', { blocks: JSON.stringify(blocks) });
		if (ok) {
			lastSavedBlocksJson = JSON.stringify(blocks);
			saveState = 'saved';
			reloadPreview();
		} else {
			saveState = 'error';
		}
	}

	async function autosaveTheme() {
		const ok = await callAction('?/saveTheme', { values: JSON.stringify(themeSettingsValues) });
		if (ok) {
			lastSavedThemeJson = JSON.stringify(themeSettingsValues);
			// The canvas renders theme settings as *persisted* on the site (same
			// as blocks) — a saved change needs a reload to actually show up.
			reloadPreview();
		}
	}

	// Debounced ~800ms after the last edit, same idiom MediaPicker.svelte uses
	// for its search box. Structural edits (add/remove/reorder) and prop
	// edits both flow through the same `blocks` state, so one effect covers
	// both — there's no live DOM patching, so either kind needs a real
	// re-render to show up regardless.
	$effect(() => {
		const current = JSON.stringify(blocks);
		if (current === lastSavedBlocksJson) return;
		saveState = 'pending';
		const timer = setTimeout(autosaveBlocks, 800);
		return () => clearTimeout(timer);
	});

	$effect(() => {
		const current = JSON.stringify(themeSettingsValues);
		if (current === lastSavedThemeJson) return;
		const timer = setTimeout(autosaveTheme, 800);
		return () => clearTimeout(timer);
	});
</script>

<svelte:head>
	<title>Builder — {data.page.title} — {data.site.name}</title>
</svelte:head>

<div class="flex h-full min-h-0 flex-col">
	<div class="flex flex-wrap items-center gap-2 border-b border-border bg-background px-4 py-2.5">
		<Button variant="ghost" size="sm" href="/sites/{data.site.id}/pages/{data.page.id}">
			<ArrowLeft class="size-4" /> Kembali
		</Button>

		<Button
			type="button"
			variant="ghost"
			size="icon"
			onclick={() => (railOpen = !railOpen)}
			title="Tampilkan/sembunyikan daftar blok"
			aria-label="Tampilkan/sembunyikan daftar blok"
		>
			<PanelLeft class="size-4" />
		</Button>

		<div class="min-w-0 flex-1">
			<h1 class="truncate text-sm font-semibold">{data.page.title}</h1>
			<p class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
				tema <span class="font-mono">{data.site.themeId}</span>
				{#if hasUnpublishedChanges}
					<span class="ml-1 inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
						<CircleAlert class="size-3" /> Belum dipublikasikan
					</span>
				{/if}
			</p>
		</div>

		<Button
			type="submit"
			form="block-builder-revoke-preview-form"
			variant="ghost"
			size="icon"
			disabled={revokingPreview}
			title="Cabut semua tautan pratinjau yang aktif untuk halaman ini"
			aria-label="Cabut akses pratinjau"
		>
			{#if revokingPreview}
				<LoaderCircle class="size-4 animate-spin" />
			{:else}
				<ShieldOff class="size-4" />
			{/if}
		</Button>
		<Button
			type="button"
			variant="ghost"
			size="icon"
			onclick={() => {
				reloadPreview();
				invalidateAll();
			}}
			title="Muat ulang pratinjau"
			aria-label="Muat ulang pratinjau"
		>
			<RefreshCw class="size-4" />
		</Button>

		<Button
			type="button"
			variant="outline"
			size="sm"
			onclick={() => (editorMode = editorMode === 'edit' ? 'preview' : 'edit')}
			title={editorMode === 'edit' ? 'Lihat tanpa alat sunting' : 'Kembali ke mode sunting'}
		>
			{#if editorMode === 'edit'}
				<Eye class="size-4" /> Pratinjau
			{:else}
				<SquarePen class="size-4" /> Edit
			{/if}
		</Button>

		<span class="flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground">
			{#if saveState === 'pending'}
				Perubahan belum tersimpan…
			{:else if saveState === 'saving'}
				<LoaderCircle class="size-3.5 animate-spin" /> Menyimpan…
			{:else if saveState === 'saved'}
				Tersimpan
			{:else if saveState === 'error'}
				<button type="button" class="text-destructive underline" onclick={autosaveBlocks}>
					{saveError || 'Gagal menyimpan'} — coba lagi
				</button>
			{/if}
		</span>

		<Button type="submit" form="block-builder-publish-form" size="sm" disabled={publishing}>
			{#if publishing}<LoaderCircle class="animate-spin" />{:else}<UploadCloud class="size-4" />{/if}
			Publikasikan
		</Button>
	</div>

	{#if form?.message}
		<div class="px-4 pt-2">
			<Alert variant="destructive">{form.message}</Alert>
		</div>
	{/if}

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
						revoked > 0 ? `${revoked} tautan pratinjau dicabut.` : 'Tidak ada tautan pratinjau aktif.'
					);
					reloadPreview();
				}
				await update({ reset: false });
			};
		}}
	></form>

	<div class="flex min-h-0 flex-1">
		{#if railOpen}
			<div class="w-72 shrink-0 overflow-y-auto border-r border-border bg-muted/20 p-3">
				<BlockLayerRail
					{blocks}
					{selectedId}
					registry={data.registry}
					compatibility={data.compatibility}
					onSelect={(id) => (selectedId = id)}
					onMove={(index, direction) => (blocks = moveBlock(blocks, index, direction))}
					onDuplicate={onDuplicateBlock}
					onRemove={onRemoveBlock}
					onAddClick={openPicker}
					onConvert={(index, target) => (blocks = convertBlock(blocks, index, target))}
					onReplace={(index) => {
						replacingIndex = index;
						pickerOpen = true;
					}}
				/>
			</div>
		{/if}

		<div class="min-w-0 flex-1 bg-muted/10 p-3">
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
					bind:this={iframeEl}
					src={previewSrc}
					title="Kanvas halaman"
					class="h-full w-full rounded-lg border border-border bg-background"
					sandbox="allow-scripts allow-popups"
				></iframe>
			{:else}
				<div class="grid h-full place-items-center rounded-lg border border-dashed border-border p-6 text-center">
					<p class="text-sm text-muted-foreground">Pratinjau tidak tersedia. Coba muat ulang halaman ini.</p>
				</div>
			{/if}
		</div>

		<aside class="flex w-96 shrink-0 flex-col overflow-y-auto border-l border-border bg-background">
			<div class="flex shrink-0 border-b border-border">
				<button
					type="button"
					class={[
						'flex-1 px-3 py-2 text-xs font-semibold transition-colors',
						activeRightTab === 'blok'
							? 'border-b-2 border-primary text-foreground'
							: 'text-muted-foreground hover:text-foreground'
					]}
					onclick={() => (activeRightTab = 'blok')}
				>
					Blok
				</button>
				<button
					type="button"
					class={[
						'flex-1 px-3 py-2 text-xs font-semibold transition-colors',
						activeRightTab === 'tema'
							? 'border-b-2 border-primary text-foreground'
							: 'text-muted-foreground hover:text-foreground'
					]}
					onclick={() => (activeRightTab = 'tema')}
				>
					Tema
				</button>
			</div>

			<div class="flex-1 overflow-y-auto p-4">
				{#if activeRightTab === 'blok'}
					{#if selectedBlock}
						<BlockInspector
							block={selectedBlock}
							definition={byType.get(selectedBlock.type)}
							siteId={data.site.id}
							onPropsChange={(id, props) => (blocks = updateBlockProps(blocks, id, props))}
						/>
					{:else}
						<p class="text-sm text-muted-foreground">Pilih atau tambahkan blok untuk mengaturnya.</p>
					{/if}
				{:else}
					<ThemeSettingsPanel
						schema={data.themeSettings.schema}
						values={themeSettingsValues}
						siteId={data.site.id}
						onChange={(values) => (themeSettingsValues = values)}
					/>
				{/if}
			</div>
		</aside>
	</div>
</div>

<BlockPicker bind:open={pickerOpen} registry={data.registry} onPick={onPickBlock} />
