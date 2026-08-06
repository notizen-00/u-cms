<script lang="ts">
	import { Select } from '$lib/components/ui/select';
	import { Input } from '$lib/components/ui/input';
	import Search from '@lucide/svelte/icons/search';

	let {
		type = $bindable<'all' | 'image' | 'document'>('all'),
		search = $bindable('')
	}: {
		type?: 'all' | 'image' | 'document';
		search?: string;
	} = $props();
</script>

<div class="flex flex-wrap items-center gap-2">
	<Select bind:value={type} class="w-40">
		<option value="all">Semua tipe</option>
		<option value="image">Gambar</option>
		<option value="document">Dokumen</option>
	</Select>
	<div class="relative min-w-48 flex-1">
		<Search class="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
		<Input type="search" placeholder="Cari nama file..." class="pl-8" bind:value={search} />
	</div>
</div>
