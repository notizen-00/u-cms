<script lang="ts">
	import { cn } from '$lib/utils.js';
	import type { HTMLAttributes } from 'svelte/elements';

	let { class: className, children, ...restProps }: HTMLAttributes<HTMLDivElement> = $props();
</script>

<div class={cn('rounded-xl border border-border bg-card text-card-foreground shadow-sm', className)} {...restProps}>
	{@render children?.()}
</div>
