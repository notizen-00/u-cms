<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Alert } from '$lib/components/ui/alert';
	import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '$lib/components/ui/card';
	import { canManageSite } from '$lib/permissions';
	import Check from '@lucide/svelte/icons/check';
	import Palette from '@lucide/svelte/icons/palette';
	import Settings from '@lucide/svelte/icons/settings';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const canManage = $derived(canManageSite(data.user, data.sites, data.site.id));

	let pendingThemeId = $state<string | null>(null);
</script>

<svelte:head>
	<title>Tema — {data.site.name} — Unej CMS</title>
</svelte:head>

<div class="space-y-4">
	<div>
		<h1 class="text-xl font-semibold">Tema — {data.site.name}</h1>
		<p class="text-sm text-muted-foreground">
			Tema resmi dari tim CMS. Pilih satu untuk diterapkan ke situs ini — build berikutnya akan memakai tema
			itu.
		</p>
	</div>

	{#if form?.message}
		<Alert variant="destructive">{form.message}</Alert>
	{/if}

	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each data.themes as theme (theme.id)}
			{@const isActive = theme.id === data.site.themeId}
			{@const hasSettings = !!theme.settings && Object.keys(theme.settings).length > 0}
			<Card class={isActive ? 'ring-2 ring-primary' : ''}>
				<div class="flex aspect-video items-center justify-center border-b bg-muted">
					{#if theme.screenshot}
						<img src={theme.screenshot} alt={theme.name} class="h-full w-full object-cover" />
					{:else}
						<Palette class="size-10 text-muted-foreground" />
					{/if}
				</div>
				<CardHeader>
					<div class="flex items-center justify-between gap-2">
						<CardTitle class="text-base">{theme.name}</CardTitle>
						{#if isActive}
							<Badge variant="success"><Check class="size-3" /> Aktif</Badge>
						{/if}
					</div>
					<CardDescription>{theme.description}</CardDescription>
				</CardHeader>
				<CardContent class="text-sm text-muted-foreground">
					<p>Versi {theme.version} · {theme.author}</p>
				</CardContent>
				{#if canManage}
					<CardFooter>
						{#if isActive}
							<div class="flex w-full gap-2">
								<Button variant="outline" size="sm" disabled class="flex-1">Sedang Diterapkan</Button>
								{#if hasSettings}
									<Button variant="outline" size="sm" href="/sites/{data.site.id}/theme/settings">
										<Settings /> Pengaturan
									</Button>
								{/if}
							</div>
						{:else}
							<form
								method="POST"
								action="?/apply"
								class="w-full"
								use:enhance={() => {
									pendingThemeId = theme.id;
									return async ({ result, update }) => {
										pendingThemeId = null;
										if (result.type === 'success') toast.success(`Tema "${theme.name}" diterapkan.`);
										await update({ reset: false });
									};
								}}
							>
								<input type="hidden" name="themeId" value={theme.id} />
								<Button type="submit" size="sm" class="w-full" disabled={pendingThemeId === theme.id}>
									Terapkan
								</Button>
							</form>
						{/if}
					</CardFooter>
				{/if}
			</Card>
		{/each}
	</div>
</div>
