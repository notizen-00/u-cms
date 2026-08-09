<script lang="ts">
	import { MEDIA_ACCEPT_ATTR, type Media } from '$lib/types';
	import { validateMediaFile, uploadMediaFile } from '$lib/media-upload';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import UploadCloud from '@lucide/svelte/icons/upload-cloud';
	import X from '@lucide/svelte/icons/x';
	import Check from '@lucide/svelte/icons/check';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import FileText from '@lucide/svelte/icons/file-text';

	let { siteId, onUploaded }: { siteId: string; onUploaded: (media: Media) => void } = $props();

	interface QueueItem {
		id: string;
		file: File;
		previewUrl: string | null;
		altText: string;
		status: 'pending' | 'uploading' | 'success' | 'error';
		progress: number;
		error?: string;
	}

	let queue = $state<QueueItem[]>([]);
	let dragOver = $state(false);
	let processing = $state(false);
	let fileInput: HTMLInputElement | undefined = $state();

	const pendingCount = $derived(queue.filter((item) => item.status === 'pending').length);

	function addFiles(fileList: FileList | null) {
		if (!fileList) return;
		for (const file of Array.from(fileList)) {
			const validationError = validateMediaFile(file);
			queue.push({
				id: crypto.randomUUID(),
				file,
				previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
				altText: '',
				status: validationError ? 'error' : 'pending',
				progress: 0,
				error: validationError?.message
			});
		}
	}

	async function uploadAll() {
		if (processing) return;
		processing = true;
		try {
			// One file per request (backend constraint, media_guide.md §6.2) — upload sequentially, not in parallel.
			let next = queue.find((item) => item.status === 'pending');
			while (next) {
				const item = next;
				item.status = 'uploading';
				try {
					const media = await uploadMediaFile(siteId, item.file, item.altText, (percent) => {
						item.progress = percent;
					});
					item.status = 'success';
					item.progress = 100;
					onUploaded(media);
				} catch (err) {
					item.status = 'error';
					item.error = err instanceof Error ? err.message : 'Upload gagal.';
				}
				next = queue.find((i) => i.status === 'pending');
			}
		} finally {
			processing = false;
		}
	}

	function removeItem(id: string) {
		const item = queue.find((i) => i.id === id);
		if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
		queue = queue.filter((i) => i.id !== id);
	}

	function clearFinished() {
		for (const item of queue) {
			if (item.status === 'success' && item.previewUrl) URL.revokeObjectURL(item.previewUrl);
		}
		queue = queue.filter((item) => item.status !== 'success');
	}

	function onDrop(event: DragEvent) {
		event.preventDefault();
		dragOver = false;
		addFiles(event.dataTransfer?.files ?? null);
	}
</script>

<div
	role="presentation"
	ondragover={(e: DragEvent) => {
		e.preventDefault();
		dragOver = true;
	}}
	ondragleave={() => (dragOver = false)}
	ondrop={onDrop}
	class="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors {dragOver
		? 'border-primary bg-primary/5'
		: 'border-border'}"
>
	<UploadCloud class="size-8 text-muted-foreground" />
	<p class="text-sm text-muted-foreground">Seret &amp; lepas file di sini, atau</p>
	<Button type="button" variant="outline" size="sm" onclick={() => fileInput?.click()}>Pilih File</Button>
	<p class="text-xs text-muted-foreground">JPG, PNG, GIF, WEBP, AVIF, SVG, atau PDF — maks. 10MB per file</p>
	<input
		bind:this={fileInput}
		type="file"
		multiple
		accept={MEDIA_ACCEPT_ATTR}
		class="hidden"
		onchange={(e: Event) => {
			addFiles((e.target as HTMLInputElement).files);
			(e.target as HTMLInputElement).value = '';
		}}
	/>
</div>

{#if queue.length > 0}
	<div class="mt-3 space-y-2">
		{#each queue as item (item.id)}
			<div class="flex items-center gap-3 rounded-md border border-border p-2">
				<div class="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded bg-muted/40">
					{#if item.previewUrl}
						<img src={item.previewUrl} alt="" class="h-full w-full object-cover" />
					{:else}
						<FileText class="size-5 text-muted-foreground" />
					{/if}
				</div>

				<div class="min-w-0 flex-1 space-y-1">
					<p class="truncate text-xs font-medium">{item.file.name}</p>

					{#if item.status === 'pending'}
						<Input placeholder="Teks alternatif (opsional)" class="h-7 text-xs" bind:value={item.altText} />
					{:else if item.status === 'uploading'}
						<div class="h-1.5 w-full overflow-hidden rounded-full bg-muted">
							<div class="h-full bg-primary transition-all" style:width="{item.progress}%"></div>
						</div>
					{:else if item.status === 'error'}
						<p class="text-xs text-destructive">{item.error}</p>
					{:else if item.status === 'success'}
						<p class="text-xs text-success">Berhasil diunggah.</p>
					{/if}
				</div>

				{#if item.status === 'uploading'}
					<LoaderCircle class="size-4 shrink-0 animate-spin text-muted-foreground" />
				{:else if item.status === 'success'}
					<Check class="size-4 shrink-0 text-success" />
				{:else if item.status === 'error'}
					<CircleAlert class="size-4 shrink-0 text-destructive" />
				{/if}

				<button
					type="button"
					class="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted"
					onclick={() => removeItem(item.id)}
					disabled={item.status === 'uploading'}
					title="Hapus dari antrean"
				>
					<X class="size-3.5" />
				</button>
			</div>
		{/each}

		<div class="flex items-center gap-2">
			{#if pendingCount > 0}
				<Button type="button" size="sm" disabled={processing} onclick={uploadAll}>
					{#if processing}<LoaderCircle class="animate-spin" />{/if}
					Unggah {pendingCount} File
				</Button>
			{/if}
			{#if queue.some((item) => item.status === 'success')}
				<Button type="button" variant="ghost" size="sm" onclick={clearFinished}>Bersihkan yang selesai</Button>
			{/if}
		</div>
	</div>
{/if}
