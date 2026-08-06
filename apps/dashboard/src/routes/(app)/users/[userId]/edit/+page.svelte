<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Card, CardContent, CardFooter } from '$lib/components/ui/card';
	import { Alert } from '$lib/components/ui/alert';
	import FormFieldError from '$lib/components/app/FormFieldError.svelte';
	import ConfirmDialog from '$lib/components/app/ConfirmDialog.svelte';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let isSuperAdmin = $state(form?.isSuperAdmin ?? data.targetUser.isSuperAdmin);
	let submitting = $state(false);
	let deleteOpen = $state(false);
</script>

<svelte:head>
	<title>Edit {data.targetUser.name} — Unej CMS</title>
</svelte:head>

<div class="mx-auto max-w-xl space-y-4">
	<div class="flex items-center justify-between">
		<h1 class="text-xl font-semibold">Edit User</h1>
		<Button variant="destructive" size="icon" onclick={() => (deleteOpen = true)} title="Hapus user">
			<Trash2 />
		</Button>
	</div>

	<Card>
		<form
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
			<CardContent class="space-y-4 pt-6">
				{#if form?.message}
					<Alert variant="destructive">{form.message}</Alert>
				{/if}

				<div class="space-y-1.5">
					<Label for="name">Nama</Label>
					<Input id="name" name="name" value={form?.name ?? data.targetUser.name} required />
					<FormFieldError errors={form?.errors} field="name" />
				</div>

				<div class="space-y-1.5">
					<Label>Email</Label>
					<Input value={data.targetUser.email} disabled />
					<p class="text-xs text-muted-foreground">Email tidak bisa diubah di Phase 1.</p>
				</div>

				<div class="space-y-1.5">
					<Label for="password">Password Baru (opsional)</Label>
					<Input id="password" name="password" type="password" minlength={8} placeholder="Kosongkan jika tidak diubah" />
					<FormFieldError errors={form?.errors} field="password" />
				</div>

				<div class="flex items-center gap-2">
					<Checkbox id="isSuperAdmin" name="isSuperAdmin" bind:checked={isSuperAdmin} />
					<Label for="isSuperAdmin">Super Admin</Label>
				</div>
			</CardContent>
			<CardFooter class="justify-end gap-2">
				<Button type="button" variant="outline" href="/users">Kembali</Button>
				<Button type="submit" disabled={submitting}>
					{#if submitting}<LoaderCircle class="animate-spin" />{/if}
					Simpan
				</Button>
			</CardFooter>
		</form>
	</Card>
</div>

<ConfirmDialog
	bind:open={deleteOpen}
	title="Hapus {data.targetUser.name}?"
	description="User ini akan dihapus permanen dan kehilangan akses ke semua site."
	action="?/delete"
/>
