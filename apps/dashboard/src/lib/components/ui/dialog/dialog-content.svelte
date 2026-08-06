<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { Dialog as DialogPrimitive } from 'bits-ui';
	import X from '@lucide/svelte/icons/x';

	let {
		class: className,
		children,
		showClose = true,
		...restProps
	}: DialogPrimitive.ContentProps & { showClose?: boolean } = $props();
</script>

<DialogPrimitive.Portal>
	<DialogPrimitive.Overlay
		class="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
	/>
	<DialogPrimitive.Content
		class={cn(
			// The panel itself never scrolls — it stays capped to the viewport so the close
			// button stays anchored; the inner wrapper below is what scrolls when content is tall.
			'fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border border-border bg-background shadow-lg duration-150 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
			className
		)}
		{...restProps}
	>
		<div class="flex min-h-0 flex-col gap-4 overflow-y-auto p-6">
			{@render children?.()}
		</div>
		{#if showClose}
			<DialogPrimitive.Close
				class="absolute right-4 top-4 rounded-sm bg-background/80 p-0.5 opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				<X class="size-4" />
				<span class="sr-only">Tutup</span>
			</DialogPrimitive.Close>
		{/if}
	</DialogPrimitive.Content>
</DialogPrimitive.Portal>
