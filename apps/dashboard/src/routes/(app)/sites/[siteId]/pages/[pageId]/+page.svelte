<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Select } from '$lib/components/ui/select';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Alert } from '$lib/components/ui/alert';
	import FormFieldError from '$lib/components/app/FormFieldError.svelte';
	import BlockEditor from '$lib/components/app/editor/BlockEditor.svelte';
	import StatusBadge from '$lib/components/app/StatusBadge.svelte';
	import ConfirmDialog from '$lib/components/app/ConfirmDialog.svelte';
	import { allowedStatusTransitions, type ContentStatus } from '$lib/types';
	import { formatDate, sortPagesHierarchically } from '$lib/utils';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import UploadCloud from '@lucide/svelte/icons/upload-cloud';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let title = $state(form?.title ?? data.page.title);
	let slug = $state(form?.slug ?? data.page.slug);
	let bodyMarkdown = $state(form?.bodyMarkdown ?? data.page.bodyMarkdown);
	let isHomepage = $state(form?.isHomepage ?? data.page.isHomepage);
	let currentStatus = $state<ContentStatus>((form?.status as ContentStatus) ?? data.page.status);
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

	const existingHomepage = $derived(data.otherPages.find((p) => p.isHomepage));
</script>

<svelte:head>
	<title>{data.page.title} — {data.site.name}</title>
</svelte:head>

<!--
	Publish targets its own action. HTML forms cannot nest, so it lives outside
	the edit form and the toolbar button reaches it through `form="…"`.
-->
<form
	id="page-publish-form"
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
	id="page-edit-form"
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
		backHref="/sites/{data.site.id}/pages"
		backLabel="Semua Halaman"
		documentLabel="Halaman"
		onTitleGenerated={(generated) => (title = generated)}
	>
		{#snippet actions()}
			<StatusBadge status={data.page.status} />
			<Button
				type="submit"
				form="page-publish-form"
				variant="outline"
				size="sm"
				disabled={publishing || data.page.status === 'published'}
			>
				{#if publishing}<LoaderCircle class="animate-spin" />{:else}<UploadCloud />{/if}
				<span class="hidden sm:inline">Publish</span>
			</Button>
			<Button variant="destructive" size="icon" type="button" onclick={() => (deleteOpen = true)} title="Hapus halaman">
				<Trash2 />
			</Button>
			<Button type="submit" form="page-edit-form" size="sm" disabled={submitting}>
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
						{#each allowedStatusTransitions(data.page.status) as status (status)}
							<option value={status}>{statusLabels[status]}</option>
						{/each}
					</Select>
					<p class="text-xs text-muted-foreground">Diperbarui {formatDate(data.page.updatedAt)}</p>
				</div>

				<div class="space-y-3 border-t border-border pt-4">
					<p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Atribut Halaman</p>
					<div class="space-y-1.5">
						<Label for="parentId">Halaman Induk (opsional)</Label>
						<Select id="parentId" name="parentId" value={form?.parentId ?? data.page.parentId ?? ''}>
							<option value="">Tidak ada</option>
							{#each sortPagesHierarchically(data.otherPages) as { page: p, depth } (p.id)}
								<option value={p.id}>{depth > 0 ? `${'—'.repeat(depth)} ` : ''}{p.title}</option>
							{/each}
						</Select>
						{#if data.page.parentId}
							<p class="text-xs text-muted-foreground">
								Catatan: API belum bisa menghapus induk yang sudah diset — memilih "Tidak ada" di sini tidak
								akan berpengaruh.
							</p>
						{/if}
					</div>
					<div class="space-y-1.5">
						<Label for="order">Urutan</Label>
						<Input id="order" name="order" type="number" value={form?.order ?? data.page.order} />
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
				</div>

				<FormFieldError errors={form?.errors} field="bodyMarkdown" />
			</div>
		{/snippet}
	</BlockEditor>
</form>

<ConfirmDialog
	bind:open={deleteOpen}
	title="Hapus {data.page.title}?"
	description="Halaman ini akan dihapus permanen. Tindakan ini tidak bisa dibatalkan."
	action="?/delete"
/>
