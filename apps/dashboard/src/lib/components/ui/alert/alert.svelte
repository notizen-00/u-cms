<script lang="ts" module>
	import { type VariantProps, tv } from 'tailwind-variants';

	export const alertVariants = tv({
		base: 'relative flex w-full items-start gap-3 rounded-lg border p-4 text-sm [&>svg]:size-4 [&>svg]:translate-y-0.5',
		variants: {
			variant: {
				default: 'bg-background text-foreground border-border',
				destructive: 'border-destructive/40 bg-destructive/10 text-destructive',
				success: 'border-success/40 bg-success/10 text-success',
				warning: 'border-warning/50 bg-warning/10 text-warning'
			}
		},
		defaultVariants: {
			variant: 'default'
		}
	});

	export type AlertVariant = VariantProps<typeof alertVariants>['variant'];
</script>

<script lang="ts">
	import { cn } from '$lib/utils.js';
	import type { HTMLAttributes } from 'svelte/elements';

	let {
		class: className,
		variant = 'default',
		children,
		...restProps
	}: HTMLAttributes<HTMLDivElement> & { variant?: AlertVariant } = $props();
</script>

<div role="alert" class={cn(alertVariants({ variant }), className)} {...restProps}>
	{@render children?.()}
</div>
