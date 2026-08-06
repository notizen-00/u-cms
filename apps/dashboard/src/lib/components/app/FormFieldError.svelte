<script lang="ts">
	import type { ApiFieldError } from '$lib/types';

	let { errors, field }: { errors?: ApiFieldError[] | null; field: string } = $props();

	const message = $derived(errors?.find((e) => e.path === field)?.message);
</script>

{#if message}
	<p class="text-xs text-destructive">{message}</p>
{/if}
