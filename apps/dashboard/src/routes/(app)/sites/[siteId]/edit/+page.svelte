<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent, CardFooter } from '$lib/components/ui/card';
	import { Alert } from '$lib/components/ui/alert';
	import FormFieldError from '$lib/components/app/FormFieldError.svelte';
	import MediaPicker from '$lib/components/app/media/MediaPicker.svelte';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import ImagePlus from '@lucide/svelte/icons/image-plus';
	import type { Media } from '$lib/types';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let logoUrl = $state(form?.logoUrl ?? data.site.logoUrl ?? '');
	let faviconUrl = $state(form?.faviconUrl ?? data.site.faviconUrl ?? '');
	let logoPickerOpen = $state(false);
	let faviconPickerOpen = $state(false);
	let submitting = $state(false);
</script>

<svelte:head>
	<title>Edit {data.site.name} — Unej CMS</title>
</svelte:head>

<div class="mx-auto max-w-xl space-y-4">
	<h1 class="text-xl font-semibold">Edit Site</h1>

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
					<Input id="name" name="name" value={form?.name ?? data.site.name} required />
					<FormFieldError errors={form?.errors} field="name" />
				</div>

				<div class="space-y-1.5">
					<Label for="slug">Slug</Label>
					<Input id="slug" name="slug" value={form?.slug ?? data.site.slug} pattern="^[a-z0-9-]+$" required />
					<FormFieldError errors={form?.errors} field="slug" />
				</div>

				<div class="space-y-1.5">
					<Label for="domain">Domain (opsional)</Label>
					<Input id="domain" name="domain" value={form?.domain ?? data.site.domain ?? ''} />
					<FormFieldError errors={form?.errors} field="domain" />
				</div>

				<div class="space-y-1.5">
					<Label for="logoUrl">Logo URL (opsional)</Label>
					<div class="flex gap-2">
						<Input id="logoUrl" name="logoUrl" type="url" bind:value={logoUrl} />
						<Button type="button" variant="outline" onclick={() => (logoPickerOpen = true)}>
							<ImagePlus /> Pilih
						</Button>
					</div>
					<FormFieldError errors={form?.errors} field="logoUrl" />
				</div>

				<div class="space-y-1.5">
					<Label for="faviconUrl">Favicon URL (opsional)</Label>
					<div class="flex gap-2">
						<Input id="faviconUrl" name="faviconUrl" type="url" bind:value={faviconUrl} />
						<Button type="button" variant="outline" onclick={() => (faviconPickerOpen = true)}>
							<ImagePlus /> Pilih
						</Button>
					</div>
					<FormFieldError errors={form?.errors} field="faviconUrl" />
				</div>
			</CardContent>
			<CardFooter class="justify-end gap-2">
				<Button type="button" variant="outline" href="/sites/{data.site.id}">Batal</Button>
				<Button type="submit" disabled={submitting}>
					{#if submitting}<LoaderCircle class="animate-spin" />{/if}
					Simpan
				</Button>
			</CardFooter>
		</form>
	</Card>
</div>

<MediaPicker siteId={data.site.id} bind:open={logoPickerOpen} onSelect={(media: Media) => (logoUrl = media.url)} />
<MediaPicker siteId={data.site.id} bind:open={faviconPickerOpen} onSelect={(media: Media) => (faviconUrl = media.url)} />
