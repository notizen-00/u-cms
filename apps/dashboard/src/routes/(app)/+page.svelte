<script lang="ts">
	import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { formatDate } from '$lib/utils';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Dashboard — Unej CMS</title>
</svelte:head>

<div class="space-y-6">
	<h1 class="text-xl font-semibold">Dashboard</h1>

	{#if data.view === 'super_admin'}
		<div class="grid gap-4 sm:grid-cols-2">
			<Card>
				<CardHeader>
					<CardDescription>Total Sites</CardDescription>
					<CardTitle class="text-3xl">{data.siteCount}</CardTitle>
				</CardHeader>
				<CardFooter>
					<Button href="/sites" variant="outline" size="sm">Kelola Sites</Button>
				</CardFooter>
			</Card>
			<Card>
				<CardHeader>
					<CardDescription>Total Users</CardDescription>
					<CardTitle class="text-3xl">{data.userCount}</CardTitle>
				</CardHeader>
				<CardFooter>
					<Button href="/users" variant="outline" size="sm">Kelola Users</Button>
				</CardFooter>
			</Card>
		</div>
	{:else if data.view === 'member'}
		<div class="grid gap-4 sm:grid-cols-2">
			<Card>
				<CardHeader>
					<CardDescription>Draft terbaru Anda</CardDescription>
				</CardHeader>
				<CardContent>
					{#if data.myDrafts.length === 0}
						<p class="text-sm text-muted-foreground">Belum ada draft.</p>
					{:else}
						<ul class="space-y-2">
							{#each data.myDrafts as draft (draft.id)}
								<li>
									<a
										href="/sites/{data.activeSiteId}/{draft.kind}/{draft.id}"
										class="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent"
									>
										<span class="truncate">{draft.title}</span>
										<span class="shrink-0 text-xs text-muted-foreground">{formatDate(draft.updatedAt)}</span>
									</a>
								</li>
							{/each}
						</ul>
					{/if}
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardDescription>Terbit di site aktif</CardDescription>
					<CardTitle class="text-3xl">{data.publishedCount}</CardTitle>
				</CardHeader>
				<CardFooter class="gap-2">
					<Button href="/sites/{data.activeSiteId}/news" variant="outline" size="sm">Berita</Button>
					<Button href="/sites/{data.activeSiteId}/pages" variant="outline" size="sm">Halaman</Button>
				</CardFooter>
			</Card>
		</div>
	{:else}
		<Card>
			<CardHeader>
				<CardTitle>Belum ada akses site</CardTitle>
				<CardDescription>Akun Anda belum ditugaskan ke site manapun. Hubungi super admin.</CardDescription>
			</CardHeader>
		</Card>
	{/if}
</div>
