<script lang="ts">
	import { cn } from '$lib/utils.js';
	import type { HTMLTdAttributes } from 'svelte/elements';

	let { class: className, children, ...restProps }: HTMLTdAttributes = $props();
</script>

<td class={cn('px-3 py-2.5 align-middle', className)} {...restProps}>
	{@render children?.()}
</td>
