<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Select } from '$lib/components/ui/select';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
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
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
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

<div class="mb-4 flex items-center justify-between gap-2">
	<Button type="button" variant="ghost" href="/sites/{data.site.id}/pages">
		<ArrowLeft class="size-4" /> Semua Halaman
	</Button>
	<div class="flex items-center gap-2">
		<StatusBadge status={data.page.status} />

		<form
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
		>
			<Button type="submit" variant="outline" disabled={publishing || data.page.status === 'published'}>
				{#if publishing}<LoaderCircle class="animate-spin" />{:else}<UploadCloud />{/if}
				Publish
			</Button>
		</form>

		<Button variant="destructive" size="icon" type="button" onclick={() => (deleteOpen = true)} title="Hapus halaman">
			<Trash2 />
		</Button>

		<Button type="submit" form="page-edit-form" disabled={submitting}>
			{#if submitting}<LoaderCircle class="animate-spin" />{/if}
			Simpan
		</Button>
	</div>
</div>

{#if form?.message}
	<Alert variant="destructive" class="mb-4">{form.message}</Alert>
{/if}

<form
	id="page-edit-form"
	method="POST"
	action="?/update"
	use:enhance={() => {
		submitting = true;
		return async ({ result, update }) => {
			submitting = false;
			if (result.type === 'success') toast.success('Perubahan disimpan.');
			await update();
		};
	}}
>
	<div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
		<div class="min-w-0 space-y-3">
			<div>
				<Input
					name="title"
					bind:value={title}
					placeholder="Tambahkan judul"
					required
					class="h-auto border-none px-0 text-3xl font-bold shadow-none focus-visible:ring-0"
				/>
				<FormFieldError errors={form?.errors} field="title" />
			</div>

			<div class="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
				<span>Slug:</span>
				<Input name="slug" bind:value={slug} required class="h-7 max-w-64 text-xs" />
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
					<CardTitle class="text-sm">Status</CardTitle>
				</CardHeader>
				<CardContent class="space-y-1.5">
					<Label for="status">Ubah status</Label>
					<Select id="status" name="status" bind:value={currentStatus}>
						{#each allowedStatusTransitions(data.page.status) as status (status)}
							<option value={status}>{statusLabels[status]}</option>
						{/each}
					</Select>
					<p class="text-xs text-muted-foreground">Diperbarui {formatDate(data.page.updatedAt)}</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="pb-2">
					<CardTitle class="text-sm">Atribut Halaman</CardTitle>
				</CardHeader>
				<CardContent class="space-y-3">
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
								Catatan: API belum bisa menghapus induk yang sudah diset — memilih "Tidak ada" di sini tidak akan
								berpengaruh.
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
				</CardContent>
			</Card>
		</div>
	</div>
</form>

<ConfirmDialog
	bind:open={deleteOpen}
	title="Hapus {data.page.title}?"
	description="Halaman ini akan dihapus permanen. Tindakan ini tidak bisa dibatalkan."
	action="?/delete"
/>
