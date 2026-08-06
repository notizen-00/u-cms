<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Alert } from '$lib/components/ui/alert';
	import FormFieldError from '$lib/components/app/FormFieldError.svelte';
	import BlockEditor from '$lib/components/app/editor/BlockEditor.svelte';
	import MediaPicker from '$lib/components/app/media/MediaPicker.svelte';
	import { slugify } from '$lib/utils';
	import type { Media } from '$lib/types';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import ImagePlus from '@lucide/svelte/icons/image-plus';
	import X from '@lucide/svelte/icons/x';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let title = $state(form?.title ?? '');
	let slug = $state(form?.slug ?? '');
	let slugTouched = $state(false);
	let bodyMarkdown = $state(form?.bodyMarkdown ?? '');
	let excerpt = $state(form?.excerpt ?? '');
	let featuredImageUrl = $state(form?.featuredImageUrl ?? '');
	let pickerOpen = $state(false);
	let submitting = $state(false);

	function onTitleInput() {
		if (!slugTouched) slug = slugify(title);
	}
</script>

<svelte:head>
	<title>Berita Baru — {data.site.name}</title>
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
		<Button type="button" variant="ghost" href="/sites/{data.site.id}/news">
			<ArrowLeft class="size-4" /> Semua Berita
		</Button>
		<Button type="submit" disabled={submitting}>
			{#if submitting}<LoaderCircle class="animate-spin" />{/if}
			Simpan Draft
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
					<BlockEditor name="bodyMarkdown" bind:value={bodyMarkdown} siteId={data.site.id} forms={data.forms} />
					<FormFieldError errors={form?.errors} field="bodyMarkdown" />
				</CardContent>
			</Card>
		</div>

		<div class="space-y-4">
			<Card>
				<CardHeader class="pb-2">
					<CardTitle class="text-sm">Gambar Utama</CardTitle>
				</CardHeader>
				<CardContent class="space-y-2">
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
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="pb-2">
					<CardTitle class="text-sm">Ringkasan</CardTitle>
				</CardHeader>
				<CardContent>
					<Textarea
						name="excerpt"
						maxlength={500}
						rows={4}
						bind:value={excerpt}
						placeholder="Ringkasan singkat (opsional, maks. 500 karakter)..."
					/>
					<FormFieldError errors={form?.errors} field="excerpt" />
				</CardContent>
			</Card>
		</div>
	</div>
</form>

<MediaPicker
	siteId={data.site.id}
	bind:open={pickerOpen}
	onSelect={(media: Media) => (featuredImageUrl = media.url)}
/>
