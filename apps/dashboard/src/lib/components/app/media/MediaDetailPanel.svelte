<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Alert } from '$lib/components/ui/alert';
	import FormFieldError from '$lib/components/app/FormFieldError.svelte';
	import { formatFileSize, formatDate } from '$lib/utils';
	import type { ApiFieldError, Media } from '$lib/types';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Copy from '@lucide/svelte/icons/copy';
	import FileText from '@lucide/svelte/icons/file-text';

	let {
		open = $bindable(false),
		media,
		formError
	}: {
		open?: boolean;
		media: Media | null;
		formError?: { errors?: ApiFieldError[] | null; message?: string | null } | null;
	} = $props();

	let submitting = $state(false);
	let deleting = $state(false);
	// Confirming delete inline within this same dialog — NOT a second nested Dialog.Root,
	// which would stack two semi-transparent overlays and make everything look much darker.
	let confirmingDelete = $state(false);
	let altText = $state('');
	let caption = $state('');

	// Reset per-item UI whenever a different item is opened (or the item's own data changes after save).
	$effect(() => {
		altText = media?.altText ?? '';
		caption = media?.caption ?? '';
		confirmingDelete = false;
	});

	function copyUrl() {
		if (!media) return;
		navigator.clipboard.writeText(media.url);
		toast.success('URL disalin.');
	}
</script>

<Dialog.Root bind:open>
	{#if media}
		<Dialog.Content class="max-w-2xl">
			<Dialog.Header>
				<Dialog.Title>{media.originalName}</Dialog.Title>
			</Dialog.Header>

			{#if confirmingDelete}
				<div class="space-y-4">
					<Alert variant="destructive">
						File ini akan dihapus permanen dari penyimpanan (tidak ada trash/restore). File ini mungkin masih dipakai
						di artikel/halaman lain — sistem tidak mengecek pemakaian sebelum menghapus.
					</Alert>
					<form
						method="POST"
						action="?/delete"
						use:enhance={() => {
							deleting = true;
							return async ({ update }) => {
								deleting = false;
								confirmingDelete = false;
								open = false;
								await update();
							};
						}}
					>
						<input type="hidden" name="id" value={media.id} />
						<div class="flex justify-end gap-2">
							<Button type="button" variant="outline" onclick={() => (confirmingDelete = false)} disabled={deleting}>
								Batal
							</Button>
							<Button type="submit" variant="destructive" disabled={deleting}>
								{#if deleting}<LoaderCircle class="animate-spin" />{/if}
								Ya, Hapus Permanen
							</Button>
						</div>
					</form>
				</div>
			{:else}
			<div class="grid gap-4 sm:grid-cols-2">
				<div class="flex items-center justify-center overflow-hidden rounded-md border border-border bg-muted/40 p-2">
					{#if media.mimeType.startsWith('image/')}
						<img src={media.url} alt={media.altText ?? media.originalName} class="max-h-64 w-full object-contain" />
					{:else}
						<div class="flex flex-col items-center gap-2 py-10 text-muted-foreground">
							<FileText class="size-12" />
							<span class="text-xs">{media.mimeType}</span>
						</div>
					{/if}
				</div>

				<div class="space-y-3 text-sm">
					<dl class="space-y-1">
						<div class="flex justify-between gap-2">
							<dt class="text-muted-foreground">Tipe</dt>
							<dd>{media.mimeType}</dd>
						</div>
						<div class="flex justify-between gap-2">
							<dt class="text-muted-foreground">Ukuran</dt>
							<dd>{formatFileSize(media.size)}</dd>
						</div>
						{#if media.width && media.height}
							<div class="flex justify-between gap-2">
								<dt class="text-muted-foreground">Dimensi</dt>
								<dd>{media.width} × {media.height}</dd>
							</div>
						{/if}
						<div class="flex justify-between gap-2">
							<dt class="text-muted-foreground">Diunggah</dt>
							<dd>{formatDate(media.createdAt)}</dd>
						</div>
					</dl>

					<Button type="button" variant="outline" size="sm" onclick={copyUrl}>
						<Copy class="size-3.5" /> Salin URL
					</Button>

					<form
						method="POST"
						action="?/update"
						use:enhance={() => {
							submitting = true;
							return async ({ result, update }) => {
								submitting = false;
								if (result.type === 'success') toast.success('Perubahan disimpan.');
								await update({ reset: false });
							};
						}}
						class="space-y-3 border-t border-border pt-3"
					>
						<input type="hidden" name="id" value={media.id} />

						{#if formError?.message}
							<Alert variant="destructive">{formError.message}</Alert>
						{/if}

						<div class="space-y-1.5">
							<Label for="detail-altText">Teks Alternatif</Label>
							<Input id="detail-altText" name="altText" bind:value={altText} />
							<FormFieldError errors={formError?.errors} field="altText" />
						</div>

						<div class="space-y-1.5">
							<Label for="detail-caption">Keterangan</Label>
							<Textarea id="detail-caption" name="caption" rows={2} bind:value={caption} />
							<FormFieldError errors={formError?.errors} field="caption" />
						</div>

						<div class="flex items-center justify-between gap-2">
							<Button type="button" variant="destructive" size="sm" onclick={() => (confirmingDelete = true)}>
								<Trash2 class="size-3.5" /> Hapus
							</Button>
							<Button type="submit" size="sm" disabled={submitting}>
								{#if submitting}<LoaderCircle class="animate-spin" />{/if}
								Simpan
							</Button>
						</div>
					</form>
				</div>
			</div>
			{/if}
		</Dialog.Content>
	{/if}
</Dialog.Root>
