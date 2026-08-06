<script lang="ts">
	import { cn } from '$lib/utils.js';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import type { HTMLSelectAttributes } from 'svelte/elements';

	let {
		class: className,
		value = $bindable(),
		children,
		...restProps
	}: HTMLSelectAttributes = $props();
</script>

<div class="relative">
	<select
		bind:value
		class={cn(
			'flex h-9 w-full appearance-none rounded-md border border-input bg-background px-3 py-1 pr-8 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50',
			className
		)}
		{...restProps}
	>
		{@render children?.()}
	</select>
	<ChevronDown class="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
</div>
