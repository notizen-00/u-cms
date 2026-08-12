<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Alert } from '$lib/components/ui/alert';
	import FormFieldError from '$lib/components/app/FormFieldError.svelte';
	import BlockEditor from '$lib/components/app/editor/BlockEditor.svelte';
	import MediaPicker from '$lib/components/app/media/MediaPicker.svelte';
	import TaxonomyPanel from '$lib/components/app/news/TaxonomyPanel.svelte';
	import { slugify } from '$lib/utils';
	import type { Media } from '$lib/types';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import ImagePlus from '@lucide/svelte/icons/image-plus';
	import X from '@lucide/svelte/icons/x';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let title = $state(form?.title ?? '');
	let slug = $state(form?.slug ?? '');
	let slugTouched = $state(false);
	let bodyMarkdown = $state(form?.bodyMarkdown ?? '');
	let excerpt = $state(form?.excerpt ?? '');
	let featuredImageUrl = $state(form?.featuredImageUrl ?? '');
	let categories = $state(data.categories);
	let tags = $state(data.tags);
	let selectedCategoryIds = $state(form?.categoryIds ?? []);
	let selectedTagIds = $state(form?.tagIds ?? []);
	let pickerOpen = $state(false);
	let submitting = $state(false);

	function onTitleInput() {
		if (!slugTouched) slug = slugify(title);
	}

	function onTitleGenerated(generated: string) {
		title = generated;
		if (!slugTouched) slug = slugify(title);
	}
</script>

<svelte:head>
	<title>Berita Baru — {data.site.name}</title>
</svelte:head>

<form
	id="news-new-form"
	method="POST"
	action="?/create"
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
		backHref="/sites/{data.site.id}/news"
		backLabel="Semua Berita"
		documentLabel="Berita"
		{onTitleGenerated}
	>
		{#snippet actions()}
			<Button type="submit" form="news-new-form" size="sm" disabled={submitting}>
				{#if submitting}<LoaderCircle class="animate-spin" />{/if}
				Simpan Draft
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
			<div class="space-y-5">
				<TaxonomyPanel bind:categories bind:tags bind:selectedCategoryIds bind:selectedTagIds />

				<div class="space-y-2 border-t border-border pt-4">
					<p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Gambar Utama</p>
					{#if featuredImageUrl}
						<img src={featuredImageUrl} alt="" class="w-full rounded-md border border-border object-cover" />
						<div class="flex gap-2">
							<Button type="button" variant="outline" size="sm" onclick={() => (pickerOpen = true)}>Ganti</Button>
							<Button type="button" variant="ghost" size="sm" onclick={() => (featuredImageUrl = '')}>
								<X class="size-3.5" /> Hapus
							</Button>
						</div>
					{:else}
						<Button type="button" variant="outline" size="sm" onclick={() => (pickerOpen = true)}>
							<ImagePlus /> Atur Gambar Utama
						</Button>
					{/if}
					<input type="hidden" name="featuredImageUrl" value={featuredImageUrl} />
					<FormFieldError errors={form?.errors} field="featuredImageUrl" />
				</div>

				<div class="space-y-2 border-t border-border pt-4">
					<Label for="excerpt" class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
						Ringkasan
					</Label>
					<Textarea
						id="excerpt"
						name="excerpt"
						maxlength={500}
						rows={4}
						bind:value={excerpt}
						placeholder="Ringkasan singkat (opsional, maks. 500 karakter)..."
					/>
					<FormFieldError errors={form?.errors} field="excerpt" />
				</div>

				<FormFieldError errors={form?.errors} field="bodyMarkdown" />
			</div>
		{/snippet}
	</BlockEditor>
</form>

<MediaPicker
	siteId={data.site.id}
	bind:open={pickerOpen}
	onSelect={(media: Media) => (featuredImageUrl = media.url)}
/>
