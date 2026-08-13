<script lang="ts">
	/**
	 * Layer rail for the full-screen Builder (docs/theme_aware_prd.md §10, §24)
	 * — a controlled outline of `blocks`: shows order, lets you reorder/
	 * duplicate/remove, and is one of two ways to open the block picker (the
	 * other is clicking an insertion point directly on the canvas). Selection
	 * and all mutation live in the parent (`+page.svelte`) — this component
	 * only reads props and calls back, so canvas clicks and rail clicks can
	 * drive the exact same state without either owning it.
	 *
	 * Still knows nothing about any specific block type: the insertable list
	 * and each block's summary label both come from `registry`, so a new
	 * theme's blocks show up here without a line of this file changing.
	 */
	import { cn } from '$lib/utils';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import ArrowDown from '@lucide/svelte/icons/arrow-down';
	import Copy from '@lucide/svelte/icons/copy';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import type { BlockCompatibility, BlockDefinition, PageBlock } from '$lib/types';

	let {
		blocks,
		selectedId,
		registry,
		compatibility = [],
		onSelect,
		onMove,
		onDuplicate,
		onRemove,
		onAddClick,
		onConvert,
		onReplace
	}: {
		blocks: PageBlock[];
		selectedId: string | null;
		registry: BlockDefinition[];
		/** Per-type verdict from the backend, including what each unsupported block falls back to. */
		compatibility?: BlockCompatibility[];
		onSelect: (id: string) => void;
		onMove: (index: number, direction: -1 | 1) => void;
		onDuplicate: (index: number) => void;
		onRemove: (index: number) => void;
		/** `null` appends at the end; otherwise inserts at that index. */
		onAddClick: (insertAt: number | null) => void;
		/** `target` is already resolved here (this component has `fallbackFor`/`byType` on hand) so the parent doesn't need to re-derive it. */
		onConvert: (index: number, target: BlockDefinition) => void;
		onReplace: (index: number) => void;
	} = $props();

	const byType = $derived(new Map(registry.map((block) => [block.type, block])));
	const unsupportedCount = $derived(blocks.filter((block) => !byType.has(block.type)).length);

	/**
	 * Which block stands in for an unsupported one. Resolved by the backend
	 * (it walks the `fallback` chain across every installed theme) — the
	 * registry here lists only *available* blocks, so it cannot contain the
	 * unsupported block's own definition to read a fallback from.
	 */
	const fallbackFor = $derived(
		new Map(compatibility.filter((entry) => entry.fallback).map((e) => [e.type, e.fallback!]))
	);

	/** Blocks the author has chosen to leave as-is; the warning stays hidden for them this session only — purely cosmetic, so it doesn't need to live above this component. */
	let keptIds = $state<string[]>([]);

	/** Best-effort label for the list row — the block's own title-ish prop, else its type. */
	function summarise(block: PageBlock): string {
		for (const key of ['title', 'text', 'label', 'heading']) {
			const value = block.props[key];
			if (typeof value === 'string' && value.trim()) return value;
		}
		return byType.get(block.type)?.label ?? block.type;
	}
</script>

<div class="space-y-2">
	{#if unsupportedCount > 0}
		<div class="flex gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
			<TriangleAlert class="mt-0.5 size-4 shrink-0 text-amber-600" />
			<p class="text-muted-foreground">
				<span class="font-semibold text-foreground">{unsupportedCount} blok</span> tidak didukung
				tema aktif. Isinya tetap tersimpan dan tidak dihapus.
			</p>
		</div>
	{/if}

	{#each blocks as block, index (block.id)}
		{@const definition = byType.get(block.type)}
		<div
			class={cn(
				'rounded-lg border bg-background p-3 transition-colors',
				selectedId === block.id ? 'border-primary ring-1 ring-primary/30' : 'border-border',
				!definition && 'border-amber-500/50'
			)}
		>
			<div class="flex items-start gap-2">
				<button type="button" class="min-w-0 flex-1 text-left" onclick={() => onSelect(block.id)}>
					<span class="flex items-center gap-2">
						<span class="truncate text-sm font-medium">{summarise(block)}</span>
						{#if !definition}
							<span class="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
								Tak didukung
							</span>
						{/if}
					</span>
					<span class="mt-0.5 block font-mono text-[10px] text-muted-foreground">{block.type}</span>
				</button>

				<div class="flex shrink-0 items-center gap-0.5">
					<button
						type="button"
						class="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
						disabled={index === 0}
						onclick={() => onMove(index, -1)}
						title="Pindah ke atas"
						aria-label="Pindah ke atas"
					>
						<ArrowUp class="size-3.5" />
					</button>
					<button
						type="button"
						class="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
						disabled={index === blocks.length - 1}
						onclick={() => onMove(index, 1)}
						title="Pindah ke bawah"
						aria-label="Pindah ke bawah"
					>
						<ArrowDown class="size-3.5" />
					</button>
					<button
						type="button"
						class="rounded p-1 text-muted-foreground hover:bg-muted"
						onclick={() => onDuplicate(index)}
						title="Duplikat blok"
						aria-label="Duplikat blok"
					>
						<Copy class="size-3.5" />
					</button>
					<button
						type="button"
						class="rounded p-1 text-destructive hover:bg-destructive/10"
						onclick={() => onRemove(index)}
						title="Hapus blok"
						aria-label="Hapus blok"
					>
						<Trash2 class="size-3.5" />
					</button>
				</div>
			</div>

			{#if !definition && !keptIds.includes(block.id)}
				{@const convertTarget = byType.get(fallbackFor.get(block.type) ?? '')}
				<!--
					Unsupported-block actions (docs/theme_aware_prd.md §12). The
					block is never removed automatically — the author decides, and
					until they do the content stays exactly where it is.
				-->
				<div class="mt-3 space-y-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2.5">
					<p class="text-xs text-muted-foreground">
						Tema aktif tidak menyediakan blok ini.
						{#if fallbackFor.get(block.type)}
							Bisa dikonversi ke
							<span class="font-mono">{fallbackFor.get(block.type)}</span>.
						{:else}
							Tidak ada blok pengganti yang cocok.
						{/if}
					</p>
					<div class="flex flex-wrap gap-1.5">
						<button
							type="button"
							class="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium hover:bg-muted"
							onclick={() => (keptIds = [...keptIds, block.id])}
						>
							Biarkan
						</button>
						{#if convertTarget}
							<button
								type="button"
								class="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium hover:bg-muted"
								onclick={() => onConvert(index, convertTarget)}
							>
								Konversi
							</button>
						{/if}
						<button
							type="button"
							class="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium hover:bg-muted"
							onclick={() => onReplace(index)}
						>
							Ganti
						</button>
						<button
							type="button"
							class="rounded-md border border-destructive/40 px-2.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/10"
							onclick={() => onRemove(index)}
						>
							Hapus
						</button>
					</div>
				</div>
			{/if}
		</div>

		<div class="group/gap relative h-2">
			<button
				type="button"
				class="absolute left-1/2 top-1/2 flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 shadow transition-opacity group-hover/gap:opacity-100 focus-visible:opacity-100"
				onclick={() => onAddClick(index + 1)}
				title="Sisipkan blok di sini"
				aria-label="Sisipkan blok di sini"
			>
				<Plus class="size-3.5" />
			</button>
		</div>
	{/each}

	<button
		type="button"
		class="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-4 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
		onclick={() => onAddClick(null)}
	>
		<Plus class="size-4" /> Tambah blok
	</button>
</div>
