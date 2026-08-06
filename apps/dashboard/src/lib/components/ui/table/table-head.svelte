<script lang="ts">
	import { cn } from '$lib/utils.js';
	import type { HTMLThAttributes } from 'svelte/elements';

	let { class: className, children, ...restProps }: HTMLThAttributes = $props();
</script>

<th
	class={cn(
		'h-10 whitespace-nowrap px-3 text-left align-middle text-xs font-medium uppercase tracking-wide text-muted-foreground',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</th>
