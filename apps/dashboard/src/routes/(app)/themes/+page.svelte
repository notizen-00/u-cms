<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardHeader,
		CardTitle,
		CardDescription,
		CardContent,
		CardFooter
	} from '$lib/components/ui/card';
	import Palette from '@lucide/svelte/icons/palette';
	import Upload from '@lucide/svelte/icons/upload';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import type { Theme } from '$lib/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let themes = $state<Theme[]>(data.themes);
	let pendingThemeId = $state<string | null>(null);
	let fileInputs = $state<Record<string, HTMLInputElement>>({});

	function pickFile(themeId: string) {
		fileInputs[themeId]?.click();
	}

	async function onFileSelected(theme: Theme, input: HTMLInputElement) {
		const file = input.files?.[0];
		if (!file) return;

		pendingThemeId = theme.id;
		try {
			const formData = new FormData();
			formData.set('file', file);

			const response = await fetch(`/themes/${theme.id}/screenshot`, { method: 'POST', body: formData });
			const result = await response.json();
			if (!response.ok) throw new Error(result.message ?? 'Gagal mengunggah screenshot.');

			themes = themes.map((t) => (t.id === theme.id ? { ...t, screenshot: result.screenshotUrl } : t));
			toast.success(`Screenshot "${theme.name}" diperbarui.`);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Gagal mengunggah screenshot.');
		} finally {
			pendingThemeId = null;
			input.value = '';
		}
	}

	async function removeScreenshot(theme: Theme) {
		pendingThemeId = theme.id;
		try {
			const response = await fetch(`/themes/${theme.id}/screenshot`, { method: 'DELETE' });
			const result = await response.json();
			if (!response.ok) throw new Error(result.message ?? 'Gagal menghapus screenshot.');

			themes = themes.map((t) => (t.id === theme.id ? { ...t, screenshot: undefined } : t));
			toast.success(`Screenshot "${theme.name}" dihapus.`);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Gagal menghapus screenshot.');
		} finally {
			pendingThemeId = null;
		}
	}
</script>

<svelte:head>
	<title>Tema — Unej CMS</title>
</svelte:head>

<div class="space-y-4">
	<div>
		<h1 class="text-xl font-semibold">Tema</h1>
		<p class="text-sm text-muted-foreground">
			Kelola screenshot preview untuk tiap tema resmi. Gambar ini ditampilkan di halaman pemilihan tema pada
			setiap situss.
		</p>
	</div>

	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each themes as theme (theme.id)}
			<Card>
				<div class="flex aspect-video items-center justify-center border-b bg-muted">
					{#if theme.screenshot}
						<img src={theme.screenshot} alt={theme.name} class="h-full w-full object-cover" />
					{:else}
						<Palette class="size-10 text-muted-foreground" />
					{/if}
				</div>
				<CardHeader>
					<CardTitle class="text-base">{theme.name}</CardTitle>
					<CardDescription>{theme.description}</CardDescription>
				</CardHeader>
				<CardContent class="text-sm text-muted-foreground">
					<p>Versi {theme.version} · {theme.author}</p>
				</CardContent>
				<CardFooter class="gap-2">
					<input
						bind:this={fileInputs[theme.id]}
						type="file"
						accept="image/jpeg,image/png,image/webp,image/avif,image/svg+xml"
						class="hidden"
						onchange={(e) => onFileSelected(theme, e.currentTarget)}
					/>
					<Button
						variant="outline"
						size="sm"
						class="flex-1"
						disabled={pendingThemeId === theme.id}
						onclick={() => pickFile(theme.id)}
					>
						<Upload /> {theme.screenshot ? 'Ganti' : 'Unggah'}
					</Button>
					{#if theme.screenshot}
						<Button
							variant="destructive"
							size="sm"
							disabled={pendingThemeId === theme.id}
							onclick={() => removeScreenshot(theme)}
						>
							<Trash2 />
						</Button>
					{/if}
				</CardFooter>
			</Card>
		{/each}
	</div>
</div>
