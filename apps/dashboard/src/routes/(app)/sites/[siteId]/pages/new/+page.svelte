<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Select } from '$lib/components/ui/select';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Alert } from '$lib/components/ui/alert';
	import FormFieldError from '$lib/components/app/FormFieldError.svelte';
	import BlockEditor from '$lib/components/app/editor/BlockEditor.svelte';
	import { slugify, sortPagesHierarchically } from '$lib/utils';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let title = $state(form?.title ?? '');
	let slug = $state(form?.slug ?? '');
	let slugTouched = $state(false);
	let bodyMarkdown = $state(form?.bodyMarkdown ?? '');
	let isHomepage = $state(form?.isHomepage ?? false);
	let submitting = $state(false);

	function onTitleInput() {
		if (!slugTouched) slug = slugify(title);
	}

	const existingHomepage = $derived(data.pages.find((p) => p.isHomepage));
</script>

<svelte:head>
	<title>Halaman Baru — {data.site.name}</title>
</svelte:head>

<form
	method="POST"
	use:enhance={() => {
		submitting = true;
		return async ({ update }) => {
			submitting = false;
			await update();
		};
	}}
>
	<div class="mb-4 flex items-center justify-between gap-2">
		<Button type="button" variant="ghost" href="/sites/{data.site.id}/pages">
			<ArrowLeft class="size-4" /> Semua Halaman
		</Button>
		<Button type="submit" disabled={submitting}>
			{#if submitting}<LoaderCircle class="animate-spin" />{/if}
			Simpan
		</Button>
	</div>

	{#if form?.message}
		<Alert variant="destructive" class="mb-4">{form.message}</Alert>
	{/if}

	<div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
		<div class="min-w-0 space-y-3">
			<div>
				<Input
					name="title"
					bind:value={title}
					oninput={onTitleInput}
					placeholder="Tambahkan judul"
					required
					class="h-auto border-none px-0 text-3xl font-bold shadow-none focus-visible:ring-0"
				/>
				<FormFieldError errors={form?.errors} field="title" />
			</div>

			<div class="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
				<span>Slug:</span>
				<Input name="slug" bind:value={slug} oninput={() => (slugTouched = true)} required class="h-7 max-w-64 text-xs" />
			</div>
			<FormFieldError errors={form?.errors} field="slug" />

			<Card>
				<CardContent class="pt-6">
					<BlockEditor name="bodyMarkdown" bind:value={bodyMarkdown} siteId={data.site.id} forms={data.forms} enabled={data.pageBuilderActive} formBuilderEnabled={data.formBuilderActive} />
					<FormFieldError errors={form?.errors} field="bodyMarkdown" />
				</CardContent>
			</Card>
		</div>

		<div class="space-y-4">
			<Card>
				<CardHeader class="pb-2">
					<CardTitle class="text-sm">Atribut Halaman</CardTitle>
				</CardHeader>
				<CardContent class="space-y-3">
					<div class="space-y-1.5">
						<Label for="parentId">Halaman Induk (opsional)</Label>
						<Select id="parentId" name="parentId" value={form?.parentId ?? ''}>
							<option value="">Tidak ada</option>
							{#each sortPagesHierarchically(data.pages) as { page: p, depth } (p.id)}
								<option value={p.id}>{depth > 0 ? `${'—'.repeat(depth)} ` : ''}{p.title}</option>
							{/each}
						</Select>
					</div>
					<div class="space-y-1.5">
						<Label for="order">Urutan</Label>
						<Input id="order" name="order" type="number" value={form?.order ?? 0} />
					</div>
					<div class="flex items-start gap-2">
						<Checkbox id="isHomepage" name="isHomepage" bind:checked={isHomepage} />
						<Label for="isHomepage">Jadikan halaman utama (homepage)</Label>
					</div>
					{#if isHomepage && existingHomepage}
						<Alert variant="warning" class="text-xs">
							"{existingHomepage.title}" sudah jadi homepage. Backend tidak mencegah lebih dari satu homepage —
							pastikan Anda menonaktifkan yang lama secara manual.
						</Alert>
					{/if}
				</CardContent>
			</Card>
		</div>
	</div>
</form>
