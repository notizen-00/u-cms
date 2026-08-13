<script lang="ts">
	/**
	 * Client-side crop/resize tool for `PropertyField.svelte`'s media fields
	 * (docs/theme_aware_prd.md §7). No cropping library exists anywhere in
	 * this repo, so this is a small dependency-free `<canvas>` tool rather
	 * than a new dependency: drag/resize a crop rectangle over the image (or
	 * type exact pixel dimensions), then "Terapkan" draws just that region to
	 * an offscreen canvas and uploads the result through the *existing*
	 * upload pipeline (`uploadMediaFile`) as a brand-new media item — the
	 * original is never modified.
	 */
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { uploadMediaFile } from '$lib/media-upload';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import type { Media } from '$lib/types';

	let {
		open = $bindable(false),
		siteId,
		imageUrl,
		onApply
	}: {
		open?: boolean;
		siteId: string;
		imageUrl: string;
		onApply: (media: Media) => void;
	} = $props();

	const PREVIEW_MAX_WIDTH = 480;
	const PREVIEW_MAX_HEIGHT = 360;
	const HANDLE_SIZE = 12;

	let imgEl = $state<HTMLImageElement | undefined>(undefined);
	let naturalWidth = $state(0);
	let naturalHeight = $state(0);
	let loaded = $state(false);
	let loadError = $state(false);

	// Crop rect, always in NATURAL (source-image) pixels — the single source
	// of truth. Display coordinates are derived from it, never the other way
	// around, so the numeric inputs and the drag handles can never disagree.
	let cropX = $state(0);
	let cropY = $state(0);
	let cropW = $state(0);
	let cropH = $state(0);

	let applying = $state(false);
	let error = $state('');

	const displayScale = $derived(
		naturalWidth > 0
			? Math.min(1, PREVIEW_MAX_WIDTH / naturalWidth, PREVIEW_MAX_HEIGHT / naturalHeight)
			: 1
	);
	const displayW = $derived(naturalWidth * displayScale);
	const displayH = $derived(naturalHeight * displayScale);

	function resetCrop() {
		// Starts at 80% of the image, centered — a sensible default the user
		// can immediately see is adjustable, rather than the full frame
		// (which would look like nothing happened if left untouched).
		cropW = Math.round(naturalWidth * 0.8);
		cropH = Math.round(naturalHeight * 0.8);
		cropX = Math.round((naturalWidth - cropW) / 2);
		cropY = Math.round((naturalHeight - cropH) / 2);
	}

	function onImageLoad() {
		if (!imgEl) return;
		naturalWidth = imgEl.naturalWidth;
		naturalHeight = imgEl.naturalHeight;
		loaded = true;
		loadError = false;
		resetCrop();
	}

	function clampCrop() {
		cropW = Math.min(Math.max(8, cropW), naturalWidth);
		cropH = Math.min(Math.max(8, cropH), naturalHeight);
		cropX = Math.min(Math.max(0, cropX), naturalWidth - cropW);
		cropY = Math.min(Math.max(0, cropY), naturalHeight - cropH);
	}

	type DragMode = 'move' | 'nw' | 'ne' | 'sw' | 'se';
	let dragMode: DragMode | null = null;
	let dragStart = { x: 0, y: 0, cropX: 0, cropY: 0, cropW: 0, cropH: 0 };

	function startDrag(event: PointerEvent, mode: DragMode) {
		event.preventDefault();
		dragMode = mode;
		dragStart = { x: event.clientX, y: event.clientY, cropX, cropY, cropW, cropH };
		(event.target as Element).setPointerCapture(event.pointerId);
	}

	function onDragMove(event: PointerEvent) {
		if (!dragMode) return;
		const dx = (event.clientX - dragStart.x) / displayScale;
		const dy = (event.clientY - dragStart.y) / displayScale;

		if (dragMode === 'move') {
			cropX = dragStart.cropX + dx;
			cropY = dragStart.cropY + dy;
		} else {
			if (dragMode.includes('w')) {
				cropX = dragStart.cropX + dx;
				cropW = dragStart.cropW - dx;
			}
			if (dragMode.includes('e')) {
				cropW = dragStart.cropW + dx;
			}
			if (dragMode.includes('n')) {
				cropY = dragStart.cropY + dy;
				cropH = dragStart.cropH - dy;
			}
			if (dragMode.includes('s')) {
				cropH = dragStart.cropH + dy;
			}
		}
		clampCrop();
	}

	function endDrag() {
		dragMode = null;
	}

	function mimeFor(url: string): string {
		return /\.(jpe?g)(\?|#|$)/i.test(url) ? 'image/jpeg' : 'image/png';
	}

	function extensionFor(mime: string): string {
		return mime === 'image/jpeg' ? 'jpg' : 'png';
	}

	async function apply() {
		if (!imgEl || !loaded) return;
		clampCrop();
		applying = true;
		error = '';

		try {
			const canvas = document.createElement('canvas');
			canvas.width = Math.round(cropW);
			canvas.height = Math.round(cropH);
			const ctx = canvas.getContext('2d');
			if (!ctx) throw new Error('Kanvas tidak didukung peramban ini.');
			ctx.drawImage(imgEl, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);

			const mime = mimeFor(imageUrl);
			const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, 0.92));
			if (!blob) throw new Error('Gagal membuat gambar hasil sunting.');

			const baseName = imageUrl.split('/').pop()?.replace(/\.[^.]+$/, '') || 'gambar';
			const file = new File([blob], `${baseName}-cropped.${extensionFor(mime)}`, { type: mime });

			const media = await uploadMediaFile(siteId, file, '', () => {});
			onApply(media);
			open = false;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Gagal menyimpan gambar.';
		} finally {
			applying = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-w-xl">
		<Dialog.Header>
			<Dialog.Title>Sunting Gambar</Dialog.Title>
		</Dialog.Header>

		{#if loadError}
			<p class="py-6 text-center text-sm text-muted-foreground">Gambar tidak bisa dimuat.</p>
		{:else}
			<div
				role="presentation"
				class="relative mx-auto select-none overflow-hidden rounded-md border border-border bg-[repeating-conic-gradient(#e2e8f0_0%_25%,transparent_0%_50%)] bg-[length:16px_16px]"
				style="width: {displayW}px; height: {displayH}px;"
				onpointermove={onDragMove}
				onpointerup={endDrag}
				onpointercancel={endDrag}
			>
				<img
					bind:this={imgEl}
					src={imageUrl}
					alt=""
					class="pointer-events-none absolute left-0 top-0"
					style="width: {displayW}px; height: {displayH}px;"
					onload={onImageLoad}
					onerror={() => (loadError = true)}
				/>

				{#if loaded}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="absolute cursor-move border-2 border-primary bg-primary/10"
						style="left: {cropX * displayScale}px; top: {cropY * displayScale}px; width: {cropW *
							displayScale}px; height: {cropH * displayScale}px;"
						onpointerdown={(event) => startDrag(event, 'move')}
					>
						{#each [['nw', 'top-0 left-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize'], ['ne', 'top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize'], ['sw', 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize'], ['se', 'bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize']] as [corner, classes] (corner)}
							<div
								role="presentation"
								class="absolute {classes} rounded-full border-2 border-primary bg-background"
								style="width: {HANDLE_SIZE}px; height: {HANDLE_SIZE}px;"
								onpointerdown={(event) => {
									event.stopPropagation();
									startDrag(event, corner as DragMode);
								}}
							></div>
						{/each}
					</div>
				{/if}
			</div>

			<div class="grid grid-cols-2 gap-3">
				<div class="space-y-1.5">
					<Label for="cms-crop-w">Lebar (px)</Label>
					<Input
						id="cms-crop-w"
						type="number"
						min="8"
						value={Math.round(cropW)}
						oninput={(event) => {
							cropW = Number((event.target as HTMLInputElement).value);
							clampCrop();
						}}
					/>
				</div>
				<div class="space-y-1.5">
					<Label for="cms-crop-h">Tinggi (px)</Label>
					<Input
						id="cms-crop-h"
						type="number"
						min="8"
						value={Math.round(cropH)}
						oninput={(event) => {
							cropH = Number((event.target as HTMLInputElement).value);
							clampCrop();
						}}
					/>
				</div>
			</div>

			{#if error}
				<p class="text-xs text-destructive">{error}</p>
			{/if}

			<div class="flex justify-end gap-2">
				<Button type="button" variant="outline" onclick={() => (open = false)} disabled={applying}>
					Batal
				</Button>
				<Button type="button" onclick={apply} disabled={!loaded || applying}>
					{#if applying}<LoaderCircle class="animate-spin" />{/if}
					Terapkan
				</Button>
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>
