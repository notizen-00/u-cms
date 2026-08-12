<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Select } from '$lib/components/ui/select';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Alert } from '$lib/components/ui/alert';
	import FormFieldError from '$lib/components/app/FormFieldError.svelte';
	import BlockEditor from '$lib/components/app/editor/BlockEditor.svelte';
	import { slugify, sortPagesHierarchically } from '$lib/utils';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
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

	function onTitleGenerated(generated: string) {
		title = generated;
		if (!slugTouched) slug = slugify(title);
	}

	const existingHomepage = $derived(data.pages.find((p) => p.isHomepage));
</script>

<svelte:head>
	<title>Halaman Baru — {data.site.name}</title>
</svelte:head>

<form
	id="page-new-form"
	method="POST"
	use:enhance={() => {
		submitting = true;
		return async ({ update }) => {
			submitting = false;
			await update();
		};
	}}
>
	{#if form?.message}
		<Alert variant="destructive" class="mb-3">{form.message}</Alert>
	{/if}

	<BlockEditor
		name="bodyMarkdown"
		bind:value={bodyMarkdown}
		siteId={data.site.id}
		forms={data.forms}
		enabled={data.pageBuilderActive}
		formBuilderEnabled={data.formBuilderActive}
		backHref="/sites/{data.site.id}/pages"
		backLabel="Semua Halaman"
		documentLabel="Halaman"
		{onTitleGenerated}
	>
		{#snippet actions()}
			<Button type="submit" form="page-new-form" size="sm" disabled={submitting}>
				{#if submitting}<LoaderCircle class="animate-spin" />{/if}
				Simpan
			</Button>
		{/snippet}

		{#snippet documentHeader()}
			<Input
				name="title"
				bind:value={title}
				oninput={onTitleInput}
				placeholder="Tambahkan judul"
				required
				class="h-auto border-none px-0 text-4xl font-bold shadow-none focus-visible:ring-0"
			/>
			<FormFieldError errors={form?.errors} field="title" />
			<div class="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
				<span>Slug:</span>
				<Input
					name="slug"
					bind:value={slug}
					oninput={() => (slugTouched = true)}
					required
					class="h-7 max-w-64 text-xs"
				/>
			</div>
			<FormFieldError errors={form?.errors} field="slug" />
		{/snippet}

		{#snippet documentPanel()}
			<div class="space-y-3">
				<p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Atribut Halaman</p>
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
				<FormFieldError errors={form?.errors} field="bodyMarkdown" />
			</div>
		{/snippet}
	</BlockEditor>
</form>
