<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Alert } from '$lib/components/ui/alert';
	import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
	import FormFieldsEditor from '$lib/components/app/forms/FormFieldsEditor.svelte';
	import type { FormField } from '$lib/types';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let title = $state(data.cmsForm.title);
	let submitLabel = $state(data.cmsForm.submitLabel);
	let successMessage = $state(data.cmsForm.successMessage);
	let fields = $state<FormField[]>(structuredClone(data.cmsForm.fields));

	let fieldsJson = $derived(JSON.stringify(fields));
	let submitting = $state(false);
</script>

<svelte:head>
	<title>Edit {data.cmsForm.title} — {data.site.name} — Unej CMS</title>
</svelte:head>

<div class="max-w-3xl space-y-6">
	<div class="flex items-center justify-between">
		<h1 class="text-xl font-semibold">Edit Formulir — {data.site.name}</h1>
		<Button href="/sites/{data.site.id}/forms/{data.cmsForm.id}/submissions" variant="outline">
			Lihat Kiriman
		</Button>
	</div>

	{#if form?.message}
		<Alert variant="destructive">{form.message}</Alert>
	{/if}

	<form
		method="POST"
		class="space-y-6"
		use:enhance={() => {
			submitting = true;
			return async ({ result, update }) => {
				submitting = false;
				if (result.type === 'success') toast.success('Formulir disimpan.');
				await update();
			};
		}}
	>
		<input type="hidden" name="fields" value={fieldsJson} />

		<Card>
			<CardHeader><CardTitle class="text-base">Detail</CardTitle></CardHeader>
			<CardContent class="space-y-4">
				<div class="space-y-1.5">
					<Label for="title">Judul Formulir</Label>
					<Input id="title" name="title" bind:value={title} required />
				</div>
				<div class="space-y-1.5">
					<Label for="submitLabel">Label Tombol Kirim</Label>
					<Input id="submitLabel" name="submitLabel" bind:value={submitLabel} />
				</div>
				<div class="space-y-1.5">
					<Label for="successMessage">Pesan Sukses</Label>
					<Textarea id="successMessage" name="successMessage" bind:value={successMessage} rows={2} />
				</div>
				<p class="text-xs text-muted-foreground">
					ID formulir: <code>{data.cmsForm.id}</code> — dipakai otomatis oleh blok "Form" di editor Berita/Halaman.
				</p>
			</CardContent>
		</Card>

		<Card>
			<CardHeader><CardTitle class="text-base">Field</CardTitle></CardHeader>
			<CardContent>
				<FormFieldsEditor bind:fields />
			</CardContent>
		</Card>

		<div class="flex gap-2">
			<Button type="submit" disabled={submitting}>Simpan Perubahan</Button>
			<Button type="button" variant="outline" href="/sites/{data.site.id}/forms">Kembali</Button>
		</div>
	</form>
</div>
