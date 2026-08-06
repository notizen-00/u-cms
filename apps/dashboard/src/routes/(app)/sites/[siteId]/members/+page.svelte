<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import { Select } from '$lib/components/ui/select';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '$lib/components/ui/card';
	import { Alert } from '$lib/components/ui/alert';
	import { SITE_ROLES } from '$lib/types';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const roleLabels: Record<string, string> = {
		site_admin: 'Site Admin',
		editor: 'Editor',
		reviewer: 'Reviewer',
		author: 'Author'
	};

	let adding = $state(false);
	let removing = $state(false);
</script>

<svelte:head>
	<title>Anggota {data.site.name} — Unej CMS</title>
</svelte:head>

<div class="space-y-6">
	<h1 class="text-xl font-semibold">Anggota — {data.site.name}</h1>

	<Alert variant="warning">
		Backend belum punya endpoint untuk melihat daftar anggota saat ini di site ini (hanya tambah/cabut yang
		tersedia). Gunakan form di bawah untuk memberi atau mencabut akses — tidak ada tabel anggota di Phase 1.
	</Alert>

	{#if form?.message}
		<Alert variant="destructive">{form.message}</Alert>
	{/if}

	<Card>
		<CardHeader>
			<CardTitle class="text-base">Tambah Anggota</CardTitle>
			<CardDescription>Memberi role ke user pada site ini.</CardDescription>
		</CardHeader>
		<CardContent>
			<form
				method="POST"
				action="?/add"
				class="flex flex-wrap items-end gap-3"
				use:enhance={() => {
					adding = true;
					return async ({ result, update }) => {
						adding = false;
						if (result.type === 'success') toast.success('Anggota ditambahkan.');
						await update();
					};
				}}
			>
				<div class="space-y-1.5">
					<Label for="userId">User</Label>
					<Select id="userId" name="userId" required class="w-64">
						<option value="" disabled selected>Pilih user…</option>
						{#each data.users as user (user.id)}
							<option value={user.id}>{user.name} ({user.email})</option>
						{/each}
					</Select>
				</div>
				<div class="space-y-1.5">
					<Label for="role">Role</Label>
					<Select id="role" name="role" required class="w-40">
						<option value="" disabled selected>Pilih role…</option>
						{#each SITE_ROLES as role (role)}
							<option value={role}>{roleLabels[role]}</option>
						{/each}
					</Select>
				</div>
				<Button type="submit" disabled={adding}>Tambah</Button>
			</form>
		</CardContent>
	</Card>

	<Card>
		<CardHeader>
			<CardTitle class="text-base">Cabut Akses</CardTitle>
			<CardDescription>Menghapus seluruh role user yang dipilih pada site ini.</CardDescription>
		</CardHeader>
		<CardContent>
			<form
				method="POST"
				action="?/remove"
				class="flex flex-wrap items-end gap-3"
				use:enhance={() => {
					removing = true;
					return async ({ result, update }) => {
						removing = false;
						if (result.type === 'success') toast.success('Akses dicabut.');
						await update();
					};
				}}
			>
				<div class="space-y-1.5">
					<Label for="removeUserId">User</Label>
					<Select id="removeUserId" name="userId" required class="w-64">
						<option value="" disabled selected>Pilih user…</option>
						{#each data.users as user (user.id)}
							<option value={user.id}>{user.name} ({user.email})</option>
						{/each}
					</Select>
				</div>
				<Button type="submit" variant="destructive" disabled={removing}>Cabut Akses</Button>
			</form>
		</CardContent>
	</Card>
</div>
