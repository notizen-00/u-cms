<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import { Alert } from '$lib/components/ui/alert';
	import { Card, CardContent, CardFooter } from '$lib/components/ui/card';
	import PropertyField from '$lib/components/app/theme/PropertyField.svelte';
	import { canManageSite } from '$lib/permissions';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const canManage = $derived(canManageSite(data.user, data.sites, data.site.id));
	const fields = $derived(Object.entries(data.settings.schema));

	let submitting = $state(false);
</script>

<svelte:head>
	<title>Pengaturan Tema — {data.site.name} — Unej CMS</title>
</svelte:head>

<div class="mx-auto max-w-xl space-y-4">
	<div>
		<Button variant="ghost" size="sm" href="/sites/{data.site.id}/theme" class="-ml-2 mb-1">
			<ArrowLeft /> Kembali ke Tema
		</Button>
		<h1 class="text-xl font-semibold">Pengaturan Tema — {data.site.name}</h1>
		<p class="text-sm text-muted-foreground">
			Opsi yang disediakan tema aktif saat ini. Perubahan berlaku setelah build berikutnya.
		</p>
	</div>

	{#if fields.length === 0}
		<Card>
			<CardContent class="py-6 text-sm text-muted-foreground">
				Tema ini tidak menyediakan opsi yang bisa diatur.
			</CardContent>
		</Card>
	{:else}
		<Card>
			<form
				method="POST"
				use:enhance={() => {
					submitting = true;
					return async ({ result, update }) => {
						submitting = false;
						if (result.type === 'success') toast.success('Pengaturan tema disimpan. Build baru sedang diproses.');
						await update();
					};
				}}
			>
				<CardContent class="pt-6">
					{#if form?.message}
						<Alert variant="destructive" class="mb-4">{form.message}</Alert>
					{/if}

					<fieldset disabled={!canManage} class="space-y-4">
						{#each fields as [key, field] (key)}
							<PropertyField name={key} {field} initialValue={data.settings.values[key]} siteId={data.site.id} />
						{/each}
					</fieldset>
				</CardContent>
				{#if canManage}
					<CardFooter class="justify-end gap-2">
						<Button type="submit" disabled={submitting}>
							{#if submitting}<LoaderCircle class="animate-spin" />{/if}
							Simpan
						</Button>
					</CardFooter>
				{/if}
			</form>
		</Card>
	{/if}
</div>
