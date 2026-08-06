<script lang="ts">
	import { page } from '$app/state';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import type { Site } from '$lib/types';

	import Check from '@lucide/svelte/icons/check';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Search from '@lucide/svelte/icons/search';

	let {
		sites,
		activeSite
	}: {
		sites: Site[];
		activeSite: Site | null;
	} = $props();
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<button
				type="button"
				class="flex h-9 w-41 items-center gap-2 border border-[#dce3ec] bg-[#fbfcff] px-3 text-left text-[11px] text-[#64748b] transition-colors hover:border-[#94a3b8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]/30 sm:w-50"
				{...props}
			>
				<Search
					size={15}
					strokeWidth={1.8}
					class="shrink-0 text-[#64748b]"
				/>

				<span class="min-w-0 flex-1 truncate">
					{activeSite?.name ?? 'Pilih Situs'}
				</span>

				<ChevronDown size={14} class="shrink-0" />
			</button>
		{/snippet}
	</DropdownMenu.Trigger>

	<DropdownMenu.Content class="w-60">
		<DropdownMenu.Group>
			<DropdownMenu.Label>Pilih situs</DropdownMenu.Label>

			{#if sites.length === 0}
				<div class="px-2 py-3 text-xs text-muted-foreground">
					Belum ada situs tersedia.
				</div>
			{:else}
				{#each sites as site (site.id)}
					<DropdownMenu.Item>
						{#snippet child({ props })}
							<a
								href={`/switch-site/${site.id}?back=${encodeURIComponent(page.url.pathname)}`}
								class="flex w-full items-center gap-2"
								{...props}
							>
								<Check
									size={14}
									class={site.id === activeSite?.id
										? 'opacity-100'
										: 'opacity-0'}
								/>

								<div class="min-w-0">
									<p class="truncate text-sm">{site.name}</p>

									<p class="truncate text-[10px] text-muted-foreground">
										{site.domain ?? site.slug}
									</p>
								</div>
							</a>
						{/snippet}
					</DropdownMenu.Item>
				{/each}
			{/if}
		</DropdownMenu.Group>
	</DropdownMenu.Content>
</DropdownMenu.Root>