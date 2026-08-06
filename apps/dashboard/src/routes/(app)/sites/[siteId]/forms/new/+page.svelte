<script lang="ts">
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

	let title = $state(form?.title ?? '');
	let submitLabel = $state(form?.submitLabel ?? 'Kirim');
	let successMessage = $state(form?.successMessage ?? 'Terima kasih, pesan Anda sudah terkirim.');
	let fields = $state<FormField[]>(form?.fields ?? []);

	let fieldsJson = $derived(JSON.stringify(fields));
	let submitting = $state(false);
</script>

<svelte:head>
	<title>Formulir Baru — {data.site.name} — Unej CMS</title>
</svelte:head>

<div class="max-w-3xl space-y-6">
	<h1 class="text-xl font-semibold">Formulir Baru — {data.site.name}</h1>

	{#if form?.message}
		<Alert variant="destructive">{form.message}</Alert>
	{/if}

	<form
		method="POST"
		onsubmit={() => {
			submitting = true;
		}}
		class="space-y-6"
	>
		<input type="hidden" name="fields" value={fieldsJson} />

		<Card>
			<CardHeader><CardTitle class="text-base">Detail</CardTitle></CardHeader>
			<CardContent class="space-y-4">
				<div class="space-y-1.5">
					<Label for="title">Judul Formulir</Label>
					<Input id="title" name="title" bind:value={title} placeholder="mis. Formulir Kontak" required />
				</div>
				<div class="grid gap-4 sm:grid-cols-2">
					<div class="space-y-1.5">
						<Label for="submitLabel">Label Tombol Kirim</Label>
						<Input id="submitLabel" name="submitLabel" bind:value={submitLabel} />
					</div>
				</div>
				<div class="space-y-1.5">
					<Label for="successMessage">Pesan Sukses</Label>
					<Textarea id="successMessage" name="successMessage" bind:value={successMessage} rows={2} />
				</div>
			</CardContent>
		</Card>

		<Card>
			<CardHeader><CardTitle class="text-base">Field</CardTitle></CardHeader>
			<CardContent>
				<FormFieldsEditor bind:fields />
			</CardContent>
		</Card>

		<div class="flex gap-2">
			<Button type="submit" disabled={submitting}>Simpan Formulir</Button>
			<Button type="button" variant="outline" href="/sites/{data.site.id}/forms">Batal</Button>
		</div>
	</form>
</div>
