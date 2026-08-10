<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Select } from '$lib/components/ui/select';
	import { Alert } from '$lib/components/ui/alert';
	import FormFieldError from '$lib/components/app/FormFieldError.svelte';
	import BlockEditor from '$lib/components/app/editor/BlockEditor.svelte';
	import StatusBadge from '$lib/components/app/StatusBadge.svelte';
	import ConfirmDialog from '$lib/components/app/ConfirmDialog.svelte';
	import MediaPicker from '$lib/components/app/media/MediaPicker.svelte';
	import TaxonomyPanel from '$lib/components/app/news/TaxonomyPanel.svelte';
	import { allowedStatusTransitions, type ContentStatus, type Media } from '$lib/types';
	import { formatDate } from '$lib/utils';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import UploadCloud from '@lucide/svelte/icons/upload-cloud';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import ImagePlus from '@lucide/svelte/icons/image-plus';
	import X from '@lucide/svelte/icons/x';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let title = $state(form?.title ?? data.news.title);
	let slug = $state(form?.slug ?? data.news.slug);
	let bodyMarkdown = $state(form?.bodyMarkdown ?? data.news.bodyMarkdown);
	let currentStatus = $state<ContentStatus>((form?.status as ContentStatus) ?? data.news.status);
	let excerpt = $state(form?.excerpt ?? data.news.excerpt ?? '');
	let featuredImageUrl = $state(form?.featuredImageUrl ?? data.news.featuredImageUrl ?? '');
	let categories = $state(data.categories);
	let tags = $state(data.tags);
	let selectedCategoryIds = $state(form?.categoryIds ?? data.news.categories.map((c) => c.id));
	let selectedTagIds = $state(form?.tagIds ?? data.news.tags.map((t) => t.id));
	let pickerOpen = $state(false);
	let submitting = $state(false);
	let publishing = $state(false);
	let deleteOpen = $state(false);

	const statusLabels: Record<string, string> = {
		draft: 'Draft',
		in_review: 'Ditinjau',
		approved: 'Disetujui',
		scheduled: 'Terjadwal',
		published: 'Terbit',
		archived: 'Diarsipkan',
		trashed: 'Sampah'
	};
</script>

<svelte:head>
	<title>{data.news.title} — {data.site.name}</title>
</svelte:head>

<!--
	Publish targets its own action. HTML forms cannot nest, so it lives outside
	the edit form and the toolbar button reaches it through `form="…"`.
-->
<form
	id="news-publish-form"
	method="POST"
	action="?/publish"
	use:enhance={() => {
		publishing = true;
		return async ({ result, update }) => {
			publishing = false;
			if (result.type === 'success') {
				toast.success('Dipublikasikan. Situs akan diperbarui dalam beberapa detik.');
			}
			await update();
		};
	}}
></form>

<form
	id="news-edit-form"
	method="POST"
	action="?/update"
	use:enhance={() => {
		submitting = true;
		return async ({ result, update }) => {
			submitting = false;
			if (result.type === 'success') toast.success('Perubahan disimpan.');
			await update({ reset: false });
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
	>
		{#snippet actions()}
			<StatusBadge status={data.news.status} />
			<Button
				type="submit"
				form="news-publish-form"
				variant="outline"
				size="sm"
				disabled={publishing || data.news.status === 'published'}
			>
				{#if publishing}<LoaderCircle class="animate-spin" />{:else}<UploadCloud />{/if}
				<span class="hidden sm:inline">Publish</span>
			</Button>
			<Button variant="destructive" size="icon" type="button" onclick={() => (deleteOpen = true)} title="Hapus berita">
				<Trash2 />
			</Button>
			<Button type="submit" form="news-edit-form" size="sm" disabled={submitting}>
				{#if submitting}<LoaderCircle class="animate-spin" />{/if}
				Simpan
			</Button>
		{/snippet}

		{#snippet documentHeader()}
			<Input
				name="title"
				bind:value={title}
				placeholder="Tambahkan judul"
				required
				class="h-auto border-none px-0 text-4xl font-bold shadow-none focus-visible:ring-0"
			/>
			<FormFieldError errors={form?.errors} field="title" />
			<div class="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
				<span>Slug:</span>
				<Input name="slug" bind:value={slug} required class="h-7 max-w-64 text-xs" />
			</div>
			<FormFieldError errors={form?.errors} field="slug" />
		{/snippet}

		{#snippet documentPanel()}
			<div class="space-y-5">
				<div class="space-y-1.5">
					<Label for="status">Status</Label>
					<Select id="status" name="status" bind:value={currentStatus}>
						{#each allowedStatusTransitions(data.news.status) as status (status)}
							<option value={status}>{statusLabels[status]}</option>
						{/each}
					</Select>
					<p class="text-xs text-muted-foreground">Diperbarui {formatDate(data.news.updatedAt)}</p>
				</div>

				<div class="border-t border-border pt-4">
					<TaxonomyPanel
						bind:categories
						bind:tags
						bind:selectedCategoryIds
						bind:selectedTagIds
					/>
				</div>

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

<ConfirmDialog
	bind:open={deleteOpen}
	title="Hapus {data.news.title}?"
	description="Berita ini akan dihapus permanen. Tindakan ini tidak bisa dibatalkan."
	action="?/delete"
/>

<MediaPicker
	siteId={data.site.id}
	bind:open={pickerOpen}
	onSelect={(media: Media) => (featuredImageUrl = media.url)}
/>
