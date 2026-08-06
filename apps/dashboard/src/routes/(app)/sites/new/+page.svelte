<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent, CardFooter } from '$lib/components/ui/card';
	import { Alert } from '$lib/components/ui/alert';
	import FormFieldError from '$lib/components/app/FormFieldError.svelte';
	import { slugify } from '$lib/utils';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	let name = $state(form?.name ?? '');
	let slug = $state(form?.slug ?? '');
	let slugTouched = $state(false);
	let submitting = $state(false);

	function onNameInput() {
		if (!slugTouched) slug = slugify(name);
	}
</script>

<svelte:head>
	<title>Site Baru — Unej CMS</title>
</svelte:head>

<div class="mx-auto max-w-xl space-y-4">
	<h1 class="text-xl font-semibold">Site Baru</h1>

	<Card>
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
			<CardContent class="space-y-4 pt-6">
				{#if form?.message}
					<Alert variant="destructive">{form.message}</Alert>
				{/if}

				<div class="space-y-1.5">
					<Label for="name">Nama Site</Label>
					<Input id="name" name="name" bind:value={name} oninput={onNameInput} required />
					<FormFieldError errors={form?.errors} field="name" />
				</div>

				<div class="space-y-1.5">
					<Label for="slug">Slug</Label>
					<Input
						id="slug"
						name="slug"
						bind:value={slug}
						oninput={() => (slugTouched = true)}
						pattern="^[a-z0-9-]+$"
						required
					/>
					<p class="text-xs text-muted-foreground">Huruf kecil, angka, dan tanda hubung saja.</p>
					<FormFieldError errors={form?.errors} field="slug" />
				</div>

				<div class="space-y-1.5">
					<Label for="domain">Domain (opsional)</Label>
					<Input id="domain" name="domain" placeholder="contoh.unej.ac.id" value={form?.domain ?? ''} />
					<FormFieldError errors={form?.errors} field="domain" />
				</div>

				<div class="space-y-1.5">
					<Label for="logoUrl">Logo URL (opsional)</Label>
					<Input id="logoUrl" name="logoUrl" type="url" value={form?.logoUrl ?? ''} />
					<FormFieldError errors={form?.errors} field="logoUrl" />
				</div>

				<div class="space-y-1.5">
					<Label for="faviconUrl">Favicon URL (opsional)</Label>
					<Input id="faviconUrl" name="faviconUrl" type="url" value={form?.faviconUrl ?? ''} />
					<FormFieldError errors={form?.errors} field="faviconUrl" />
				</div>
			</CardContent>
			<CardFooter class="justify-end gap-2">
				<Button type="button" variant="outline" href="/sites">Batal</Button>
				<Button type="submit" disabled={submitting}>
					{#if submitting}<LoaderCircle class="animate-spin" />{/if}
					Simpan
				</Button>
			</CardFooter>
		</form>
	</Card>
</div>
