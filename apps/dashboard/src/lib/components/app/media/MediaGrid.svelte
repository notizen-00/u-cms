<script lang="ts">
	import type { Media } from '$lib/types';
	import { formatFileSize } from '$lib/utils';
	import { Button } from '$lib/components/ui/button';
	import FileText from '@lucide/svelte/icons/file-text';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	let {
		items,
		mode = 'manage',
		emptyMessage = 'Belum ada media.',
		onOpen,
		onSelect,
		onDelete
	}: {
		items: Media[];
		mode?: 'manage' | 'picker';
		emptyMessage?: string;
		onOpen?: (item: Media) => void;
		onSelect?: (item: Media) => void;
		onDelete?: (item: Media) => void;
	} = $props();

	function isImage(item: Media) {
		return item.mimeType.startsWith('image/');
	}

	function openItem(item: Media) {
		onOpen?.(item);
	}
</script>

{#snippet thumb(item: Media)}
	<div class="flex aspect-square items-center justify-center bg-muted/40">
		{#if isImage(item)}
			<img
				src={item.url}
				alt={item.altText ?? item.originalName}
				loading="lazy"
				decoding="async"
				class="h-full w-full object-cover"
			/>
		{:else}
			<FileText class="size-10 text-muted-foreground" />
		{/if}
	</div>
	<div class="space-y-0.5 p-2">
		<p class="truncate text-xs font-medium" title={item.originalName}>{item.originalName}</p>
		<p class="text-[11px] text-muted-foreground">{formatFileSize(item.size)}</p>
	</div>
{/snippet}

{#if items.length === 0}
	<p class="py-10 text-center text-sm text-muted-foreground">{emptyMessage}</p>
{:else}
	<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
		{#each items as item (item.id)}
			<div class="group relative overflow-hidden rounded-lg border border-border bg-background">
				{#if mode === 'manage'}
					<div
						role="button"
						tabindex="0"
						class="block w-full cursor-pointer text-left"
						onclick={() => openItem(item)}
						onkeydown={(event: KeyboardEvent) => {
							if (event.key === 'Enter' || event.key === ' ') {
								event.preventDefault();
								openItem(item);
							}
						}}
					>
						{@render thumb(item)}
					</div>
				{:else}
					<button
						type="button"
						class="block w-full cursor-pointer text-left"
						onclick={() => onSelect?.(item)}
					>
						{@render thumb(item)}
						<span
							class="pointer-events-none absolute inset-0 flex items-center justify-center bg-primary/70 opacity-0 transition-opacity group-hover:opacity-100"
						>
							<span class="rounded-md bg-background px-3 py-1.5 text-xs font-semibold text-foreground shadow">
								Pilih
							</span>
						</span>
					</button>
				{/if}

				{#if mode === 'manage' && onDelete}
					<Button
						variant="destructive"
						size="icon"
						class="absolute right-1.5 top-1.5 h-7 w-7 opacity-0 shadow transition-opacity group-hover:opacity-100"
						onclick={(event: MouseEvent) => {
							event.stopPropagation();
							onDelete?.(item);
						}}
						title="Hapus"
					>
						<Trash2 class="size-3.5" />
					</Button>
				{/if}
			</div>
		{/each}
	</div>
{/if}
