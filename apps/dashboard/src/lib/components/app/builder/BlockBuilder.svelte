<script lang="ts">
	/**
	 * Theme-aware Page Builder (docs/theme_aware_prd.md §10, §24).
	 *
	 * Edits `PageBlock[]` — structured content, never rendered HTML — and
	 * knows nothing about any specific block type: the list of insertable
	 * blocks, and every block's editor form, both come from the Block Registry
	 * passed in as `registry`. That is what lets a new theme add blocks
	 * without a line of builder code changing.
	 */
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';
	import BlockPicker from './BlockPicker.svelte';
	import BlockInspector from './BlockInspector.svelte';
	import Plus from '@lucide/svelte/icons/plus';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import ArrowDown from '@lucide/svelte/icons/arrow-down';
	import Copy from '@lucide/svelte/icons/copy';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import type { BlockCompatibility, BlockDefinition, PageBlock } from '$lib/types';

	let {
		blocks = $bindable([]),
		registry,
		compatibility = [],
		siteId
	}: {
		blocks?: PageBlock[];
		registry: BlockDefinition[];
		/** Per-type verdict from the backend, including what each unsupported block falls back to. */
		compatibility?: BlockCompatibility[];
		siteId: string;
	} = $props();

	const byType = $derived(new Map(registry.map((block) => [block.type, block])));

	let selectedId = $state<string | null>(blocks[0]?.id ?? null);
	let pickerOpen = $state(false);
	/** Where the picker inserts; `null` appends. */
	let insertAt = $state<number | null>(null);

	const selected = $derived(blocks.find((block) => block.id === selectedId) ?? null);
	const unsupportedCount = $derived(blocks.filter((block) => !byType.has(block.type)).length);

	function newId(): string {
		return crypto.randomUUID();
	}

	/** Seeds props from the schema's declared defaults so a new block is never blank-but-invalid. */
	function defaultProps(definition: BlockDefinition): Record<string, unknown> {
		const props: Record<string, unknown> = {};
		for (const [key, field] of Object.entries(definition.schema)) {
			if ('default' in field && field.default !== undefined) props[key] = field.default;
			else if (field.type === 'boolean') props[key] = false;
			else if (field.type === 'array') props[key] = [];
			else if (field.type === 'object') props[key] = {};
			else props[key] = '';
		}
		return props;
	}

	function openPicker(index: number | null) {
		insertAt = index;
		pickerOpen = true;
	}

	function addBlock(definition: BlockDefinition) {
		// The same picker serves both "insert" and "replace"; which one is
		// decided by whether a replace was started, so the two can never both
		// apply to one pick.
		if (replacingIndex !== null) {
			const index = replacingIndex;
			replacingIndex = null;
			const replacement: PageBlock = {
				id: blocks[index].id,
				type: definition.type,
				props: defaultProps(definition)
			};
			blocks = blocks.map((block, i) => (i === index ? replacement : block));
			selectedId = replacement.id;
			return;
		}

		const block: PageBlock = {
			id: newId(),
			type: definition.type,
			props: defaultProps(definition)
		};
		const at = insertAt ?? blocks.length;
		blocks = [...blocks.slice(0, at), block, ...blocks.slice(at)];
		selectedId = block.id;
		insertAt = null;
	}

	function move(index: number, direction: -1 | 1) {
		const target = index + direction;
		if (target < 0 || target >= blocks.length) return;
		const next = [...blocks];
		[next[index], next[target]] = [next[target], next[index]];
		blocks = next;
	}

	function duplicate(index: number) {
		const source = blocks[index];
		// Structured-clone the props so the copy can't share nested objects
		// (arrays of cards, gallery items) with the block it came from.
		const copy: PageBlock = {
			...structuredClone($state.snapshot(source)),
			id: newId()
		} as PageBlock;
		blocks = [...blocks.slice(0, index + 1), copy, ...blocks.slice(index + 1)];
		selectedId = copy.id;
	}

	function remove(index: number) {
		const removed = blocks[index];
		blocks = blocks.filter((_, i) => i !== index);
		if (selectedId === removed.id) selectedId = blocks[Math.max(0, index - 1)]?.id ?? null;
	}

	function updateProps(blockId: string, props: Record<string, unknown>) {
		blocks = blocks.map((block) => (block.id === blockId ? { ...block, props } : block));
	}

	/* ------------------- unsupported blocks (PRD §12) ------------------- */

	/** Blocks the author has chosen to leave as-is; the warning stays hidden for them this session. */
	let keptIds = $state<string[]>([]);
	/** Index awaiting a Replace pick, so the picker swaps rather than inserts. */
	let replacingIndex = $state<number | null>(null);

	/**
	 * Which block stands in for an unsupported one. Resolved by the backend
	 * (it walks the `fallback` chain across every installed theme) — the
	 * registry here lists only *available* blocks, so it cannot contain the
	 * unsupported block's own definition to read a fallback from.
	 */
	const fallbackFor = $derived(
		new Map(compatibility.filter((entry) => entry.fallback).map((e) => [e.type, e.fallback!]))
	);

	/**
	 * Converts an unsupported block to its declared stand-in. Props whose keys
	 * the target schema also declares are carried over — the rest are dropped
	 * rather than kept as dead weight the target's editor could never show.
	 */
	function convert(index: number) {
		const block = blocks[index];
		const target = byType.get(fallbackFor.get(block.type) ?? '');
		if (!target) return;

		const props: Record<string, unknown> = {};
		for (const key of Object.keys(target.schema)) {
			if (block.props[key] !== undefined) props[key] = block.props[key];
		}
		blocks = blocks.map((current, i) =>
			i === index ? { ...current, type: target.type, props } : current
		);
	}

	function startReplace(index: number) {
		replacingIndex = index;
		pickerOpen = true;
	}


	/** Best-effort label for the list row — the block's own title-ish prop, else its type. */
	function summarise(block: PageBlock): string {
		for (const key of ['title', 'text', 'label', 'heading']) {
			const value = block.props[key];
			if (typeof value === 'string' && value.trim()) return value;
		}
		return byType.get(block.type)?.label ?? block.type;
	}
</script>

<div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
	<!-- ------------------------------------------------------- block list -->
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
					<button type="button" class="min-w-0 flex-1 text-left" onclick={() => (selectedId = block.id)}>
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
							onclick={() => move(index, -1)}
							title="Pindah ke atas"
							aria-label="Pindah ke atas"
						>
							<ArrowUp class="size-3.5" />
						</button>
						<button
							type="button"
							class="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
							disabled={index === blocks.length - 1}
							onclick={() => move(index, 1)}
							title="Pindah ke bawah"
							aria-label="Pindah ke bawah"
						>
							<ArrowDown class="size-3.5" />
						</button>
						<button
							type="button"
							class="rounded p-1 text-muted-foreground hover:bg-muted"
							onclick={() => duplicate(index)}
							title="Duplikat blok"
							aria-label="Duplikat blok"
						>
							<Copy class="size-3.5" />
						</button>
						<button
							type="button"
							class="rounded p-1 text-destructive hover:bg-destructive/10"
							onclick={() => remove(index)}
							title="Hapus blok"
							aria-label="Hapus blok"
						>
							<Trash2 class="size-3.5" />
						</button>
					</div>
				</div>

				{#if !definition && !keptIds.includes(block.id)}
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
							{#if byType.has(fallbackFor.get(block.type) ?? '')}
								<button
									type="button"
									class="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium hover:bg-muted"
									onclick={() => convert(index)}
								>
									Konversi
								</button>
							{/if}
							<button
								type="button"
								class="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium hover:bg-muted"
								onclick={() => startReplace(index)}
							>
								Ganti
							</button>
							<button
								type="button"
								class="rounded-md border border-destructive/40 px-2.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/10"
								onclick={() => remove(index)}
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
					onclick={() => openPicker(index + 1)}
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
			onclick={() => openPicker(null)}
		>
			<Plus class="size-4" /> Tambah blok
		</button>
	</div>

	<!-- --------------------------------------------------------- inspector -->
	<aside class="rounded-lg border border-border bg-background p-4">
		{#if selected}
			<BlockInspector
				block={selected}
				definition={byType.get(selected.type)}
				{siteId}
				onPropsChange={updateProps}
			/>
		{:else}
			<p class="text-sm text-muted-foreground">Pilih atau tambahkan blok untuk mengaturnya.</p>
		{/if}
	</aside>
</div>

<BlockPicker bind:open={pickerOpen} {registry} onPick={addBlock} />
