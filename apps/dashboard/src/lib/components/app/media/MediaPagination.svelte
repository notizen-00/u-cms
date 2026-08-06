<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';

	let {
		page,
		totalPages,
		total,
		onChange
	}: { page: number; totalPages: number; total: number; onChange: (page: number) => void } = $props();
</script>

{#if totalPages > 1}
	<div class="flex items-center justify-between text-sm text-muted-foreground">
		<span>Halaman {page} dari {totalPages} · {total} file</span>
		<div class="flex gap-2">
			<Button variant="outline" size="sm" disabled={page <= 1} onclick={() => onChange(page - 1)}>
				<ChevronLeft class="size-4" /> Sebelumnya
			</Button>
			<Button variant="outline" size="sm" disabled={page >= totalPages} onclick={() => onChange(page + 1)}>
				Berikutnya <ChevronRight class="size-4" />
			</Button>
		</div>
	</div>
{/if}
