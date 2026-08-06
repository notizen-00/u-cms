<script lang="ts">
	import { cn } from '$lib/utils.js';
	import Check from '@lucide/svelte/icons/check';
	import { Checkbox as CheckboxPrimitive } from 'bits-ui';

	let {
		class: className,
		checked = $bindable(false),
		name,
		value,
		disabled,
		...restProps
	}: CheckboxPrimitive.RootProps = $props();
</script>

<CheckboxPrimitive.Root
	bind:checked
	{name}
	{value}
	{disabled}
	class={cn(
		'peer flex size-4 shrink-0 items-center justify-center rounded-sm border border-primary shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
		className
	)}
	{...restProps}
>
	{#snippet children({ checked: isChecked })}
		{#if isChecked}
			<Check class="size-3.5" />
		{/if}
	{/snippet}
</CheckboxPrimitive.Root>
