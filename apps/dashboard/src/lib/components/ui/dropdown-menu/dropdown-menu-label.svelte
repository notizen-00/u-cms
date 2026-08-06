<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';

	let { class: className, ...restProps }: DropdownMenuPrimitive.GroupHeadingProps = $props();
</script>

<DropdownMenuPrimitive.GroupHeading
	class={cn('px-2 py-1.5 text-xs font-medium text-muted-foreground', className)}
	{...restProps}
/>
