<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Card, CardContent, CardFooter } from '$lib/components/ui/card';
	import { Alert } from '$lib/components/ui/alert';
	import FormFieldError from '$lib/components/app/FormFieldError.svelte';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	let isSuperAdmin = $state(form?.isSuperAdmin ?? false);
	let submitting = $state(false);
</script>

<svelte:head>
	<title>User Baru — Unej CMS</title>
</svelte:head>

<div class="mx-auto max-w-xl space-y-4">
	<h1 class="text-xl font-semibold">User Baru</h1>

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
					<Label for="name">Nama</Label>
					<Input id="name" name="name" value={form?.name ?? ''} required />
					<FormFieldError errors={form?.errors} field="name" />
				</div>

				<div class="space-y-1.5">
					<Label for="email">Email</Label>
					<Input id="email" name="email" type="email" value={form?.email ?? ''} required />
					<FormFieldError errors={form?.errors} field="email" />
				</div>

				<div class="space-y-1.5">
					<Label for="password">Password</Label>
					<Input id="password" name="password" type="password" minlength={8} required />
					<p class="text-xs text-muted-foreground">Minimal 8 karakter.</p>
					<FormFieldError errors={form?.errors} field="password" />
				</div>

				<div class="flex items-center gap-2">
					<Checkbox id="isSuperAdmin" name="isSuperAdmin" bind:checked={isSuperAdmin} />
					<Label for="isSuperAdmin">Super Admin</Label>
				</div>
			</CardContent>
			<CardFooter class="justify-end gap-2">
				<Button type="button" variant="outline" href="/users">Batal</Button>
				<Button type="submit" disabled={submitting}>
					{#if submitting}<LoaderCircle class="animate-spin" />{/if}
					Simpan
				</Button>
			</CardFooter>
		</form>
	</Card>
</div>
