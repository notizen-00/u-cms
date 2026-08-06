<script lang="ts">
	import { cn } from '$lib/utils.js';
	import type { HTMLAttributes } from 'svelte/elements';

	let { class: className, children, ...restProps }: HTMLAttributes<HTMLTableSectionElement> = $props();
</script>

<thead class={cn('bg-muted/50 [&_tr]:border-b', className)} {...restProps}>
	{@render children?.()}
</thead>
