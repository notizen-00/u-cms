<script lang="ts">
	/**
	 * Props editor for one block, generated from that block's `schema`
	 * (docs/theme_aware_prd.md §7). Nothing here knows any specific block type
	 * — a theme shipping a new block gets a working editor for free, which is
	 * the point of driving the builder off schemas rather than components.
	 */
	import PropertyField from '$lib/components/app/theme/PropertyField.svelte';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import type { BlockDefinition, PageBlock } from '$lib/types';

	let {
		block,
		definition,
		siteId,
		onPropsChange
	}: {
		block: PageBlock;
		/** `undefined` when the active theme doesn't provide this block type. */
		definition: BlockDefinition | undefined;
		siteId: string;
		onPropsChange: (blockId: string, props: Record<string, unknown>) => void;
	} = $props();

	const fields = $derived(Object.entries(definition?.schema ?? {}));

	// Edits collect here and are pushed up on change. Re-seeded when the
	// selection moves to a different block; the `{#each}` key below includes
	// the block id so PropertyField remounts too (it seeds its own state once,
	// by design, and would otherwise keep showing the previous block's values).
	let editingId = $state(block.id);
	let draft = $state<Record<string, unknown>>({ ...block.props });

	$effect(() => {
		if (editingId !== block.id) {
			editingId = block.id;
			draft = { ...block.props };
		}
	});

	$effect(() => {
		const next = $state.snapshot(draft) as Record<string, unknown>;
		// Mid-switch: `draft` still belongs to the previously selected block.
		if (editingId !== block.id) return;
		// Also the loop guard — once the parent applies the change, this
		// comparison matches and the effect stops re-firing.
		if (JSON.stringify(next) === JSON.stringify(block.props)) return;
		onPropsChange(block.id, next);
	});
</script>

{#if !definition}
	<!--
		Unsupported block (docs/theme_aware_prd.md §12). Deliberately still
		listed and its content still shown rather than hidden or dropped: the
		data is intact, it just has no editor here because the active theme
		never declared this type.
	-->
	<div class="space-y-3">
		<div class="flex gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
			<TriangleAlert class="mt-0.5 size-4 shrink-0 text-amber-600" />
			<div class="space-y-1 text-xs">
				<p class="font-semibold text-foreground">Blok tidak didukung tema aktif</p>
				<p class="text-muted-foreground">
					Tipe <span class="font-mono">{block.type}</span> berasal dari tema lain. Isinya tetap
					tersimpan dan tidak dihapus — aktifkan kembali tema asalnya untuk menyuntingnya.
				</p>
			</div>
		</div>
		<div>
			<p class="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
				Isi tersimpan
			</p>
			<pre class="max-h-64 overflow-auto rounded-md border border-border bg-muted/40 p-3 font-mono text-[11px]">{JSON.stringify(
					block.props,
					null,
					2
				)}</pre>
		</div>
	</div>
{:else}
	<div class="space-y-4">
		<div>
			<p class="text-sm font-semibold">{definition.label}</p>
			<p class="font-mono text-[10px] text-muted-foreground">{definition.type}</p>
		</div>

		{#each fields as [key, field] (block.id + key)}
			<PropertyField name={key} {field} {siteId} initialValue={block.props[key]} bind:value={draft[key]} />
		{/each}

		{#if fields.length === 0}
			<p class="text-sm text-muted-foreground">Blok ini tidak punya pengaturan.</p>
		{/if}
	</div>
{/if}
