<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
</script>

<div class="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
	<p class="text-5xl font-semibold text-muted-foreground">{page.status}</p>
	<h1 class="text-lg font-medium">{page.error?.message ?? 'Terjadi kesalahan.'}</h1>
	<div class="flex gap-2">
		<Button variant="outline" onclick={() => location.reload()}>Coba lagi</Button>
		<Button href="/">Kembali ke Dashboard</Button>
	</div>
</div>
