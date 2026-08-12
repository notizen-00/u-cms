<script lang="ts">
	/**
	 * Block picker driven entirely by the Block Registry
	 * (docs/theme_aware_prd.md §10, §24) — it renders whatever
	 * `GET /sites/:siteId/blocks` returned, grouped by the category each block
	 * declares. A theme's own category appears here automatically the moment
	 * that theme is active; nothing in this file names a specific theme.
	 */
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import Search from '@lucide/svelte/icons/search';
	import type { BlockDefinition } from '$lib/types';

	let {
		open = $bindable(false),
		registry,
		onPick
	}: {
		open?: boolean;
		registry: BlockDefinition[];
		onPick: (block: BlockDefinition) => void;
	} = $props();

	let query = $state('');

	const groups = $derived.by(() => {
		const needle = query.trim().toLowerCase();
		const matches = registry.filter((block) =>
			!needle ||
			`${block.label} ${block.description ?? ''} ${block.type}`.toLowerCase().includes(needle)
		);

		// Grouped in first-seen order rather than alphabetically, so the CMS's
		// own Basic/Media categories stay at the top where authors expect them
		// and a theme's categories read as additions below.
		const byCategory = new Map<string, BlockDefinition[]>();
		for (const block of matches) {
			const bucket = byCategory.get(block.category);
			if (bucket) bucket.push(block);
			else byCategory.set(block.category, [block]);
		}
		return [...byCategory.entries()].map(([category, blocks]) => ({ category, blocks }));
	});

	function pick(block: BlockDefinition) {
		onPick(block);
		open = false;
		query = '';
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-h-[85vh] max-w-2xl overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Tambah Blok</Dialog.Title>
		</Dialog.Header>

		<div class="relative">
			<Search class="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
			<Input bind:value={query} placeholder="Cari blok..." class="pl-8" autofocus />
		</div>

		<div class="space-y-4">
			{#each groups as group (group.category)}
				<div class="space-y-2">
					<p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
						{group.category}
					</p>
					<div class="grid gap-2 sm:grid-cols-2">
						{#each group.blocks as block (block.type)}
							<button
								type="button"
								class="rounded-lg border border-border p-3 text-left transition-colors hover:border-primary hover:bg-primary/5"
								onclick={() => pick(block)}
							>
								<span class="flex items-center gap-2">
									<span class="text-sm font-semibold">{block.label}</span>
									{#if block.source !== 'core'}
										<!-- Worth surfacing: these disappear from the picker if the
										     theme/plugin providing them is deactivated. -->
										<span class="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
											{block.source === 'theme' ? 'Tema' : 'Plugin'}
										</span>
									{/if}
								</span>
								{#if block.description}
									<span class="mt-1 block text-xs leading-relaxed text-muted-foreground">
										{block.description}
									</span>
								{/if}
								<span class="mt-2 block font-mono text-[10px] text-muted-foreground">{block.type}</span>
							</button>
						{/each}
					</div>
				</div>
			{:else}
				<p class="py-6 text-center text-sm text-muted-foreground">Tidak ada blok yang cocok.</p>
			{/each}
		</div>
	</Dialog.Content>
</Dialog.Root>
