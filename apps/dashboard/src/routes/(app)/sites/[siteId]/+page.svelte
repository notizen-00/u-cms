<script lang="ts">
	import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { canManageMembers, canManageSite } from '$lib/permissions';
	import { siteVisitUrl } from '$lib/site-url';
	import { formatDate } from '$lib/utils';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.site.name} — Unej CMS</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-start justify-between">
		<div>
			<h1 class="text-xl font-semibold">{data.site.name}</h1>
			<p class="text-sm text-muted-foreground">/{data.site.slug} · {data.site.domain ?? 'Belum ada domain'}</p>
		</div>
		<div class="flex shrink-0 gap-2">
			<Button href={siteVisitUrl(data.site.slug)} target="_blank" rel="noopener noreferrer" variant="outline">
				<ExternalLink class="size-4" /> Kunjungi Situs
			</Button>
			{#if canManageSite(data.user, data.sites, data.site.id)}
				<Button href="/sites/{data.site.id}/edit" variant="outline">Edit Site</Button>
			{/if}
		</div>
	</div>

	<div class="grid gap-4 sm:grid-cols-3">
		<Card>
			<CardHeader>
				<CardDescription>Berita</CardDescription>
				<CardTitle class="text-3xl">{data.newsCount}</CardTitle>
			</CardHeader>
			<CardFooter>
				<Button href="/sites/{data.site.id}/news" variant="outline" size="sm">Lihat semua</Button>
			</CardFooter>
		</Card>
		<Card>
			<CardHeader>
				<CardDescription>Halaman</CardDescription>
				<CardTitle class="text-3xl">{data.pagesCount}</CardTitle>
			</CardHeader>
			<CardFooter>
				<Button href="/sites/{data.site.id}/pages" variant="outline" size="sm">Lihat semua</Button>
			</CardFooter>
		</Card>
		{#if canManageMembers(data.user)}
			<Card>
				<CardHeader>
					<CardDescription>Anggota</CardDescription>
					<CardTitle class="text-3xl">-</CardTitle>
				</CardHeader>
				<CardFooter>
					<Button href="/sites/{data.site.id}/members" variant="outline" size="sm">Kelola anggota</Button>
				</CardFooter>
			</Card>
		{/if}
	</div>

	<Card>
		<CardHeader>
			<CardTitle>Detail</CardTitle>
		</CardHeader>
		<CardContent class="grid gap-2 text-sm sm:grid-cols-2">
			<div><span class="text-muted-foreground">Logo URL:</span> {data.site.logoUrl ?? '-'}</div>
			<div><span class="text-muted-foreground">Favicon URL:</span> {data.site.faviconUrl ?? '-'}</div>
			<div><span class="text-muted-foreground">Dibuat:</span> {formatDate(data.site.createdAt)}</div>
			<div><span class="text-muted-foreground">Diperbarui:</span> {formatDate(data.site.updatedAt)}</div>
		</CardContent>
	</Card>
</div>
