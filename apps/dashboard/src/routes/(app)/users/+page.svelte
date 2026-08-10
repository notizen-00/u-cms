<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { TableRow, TableCell } from '$lib/components/ui/table';
	import DataTable from '$lib/components/app/DataTable.svelte';
	import ConfirmDialog from '$lib/components/app/ConfirmDialog.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { formatDate } from '$lib/utils';
	import type { User } from '$lib/types';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const columns = [
		{ label: 'Nama' },
		{ label: 'Email' },
		{ label: 'Role' },
		{ label: 'Dibuat' },
		{ label: 'Aksi', class: 'text-right' }
	];

	let selected = $state(new Set<string>());
	let deleteTarget = $state<User | null>(null);
	let deleteOpen = $state(false);
	let bulkDeleteOpen = $state(false);
	let bulkIds = $state<string[]>([]);

	function askDelete(user: User) {
		deleteTarget = user;
		deleteOpen = true;
	}

	function askBulkDelete(ids: string[]) {
		bulkIds = ids;
		bulkDeleteOpen = true;
	}
</script>

<svelte:head>
	<title>Users — Unej CMS</title>
</svelte:head>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h1 class="text-xl font-semibold">Users</h1>
		<Button href="/users/new"><Plus /> User Baru</Button>
	</div>

	<DataTable
		items={data.users}
		{columns}
		rowKey={(user) => user.id}
		searchFn={(user, q) => user.name.toLowerCase().includes(q) || user.email.toLowerCase().includes(q)}
		searchPlaceholder="Cari nama atau email..."
		emptyMessage="Belum ada user."
		selectable
		bind:selected
		onBulkDelete={askBulkDelete}
	>
		{#snippet row(user: User)}
			<TableRow>
				<TableCell>
					<Checkbox
						checked={selected.has(user.id)}
						onCheckedChange={(checked: boolean) => {
							const next = new Set(selected);
							if (checked) next.add(user.id);
							else next.delete(user.id);
							selected = next;
						}}
					/>
				</TableCell>
				<TableCell>
					<a href="/users/{user.id}/edit" class="font-medium hover:underline">{user.name}</a>
				</TableCell>
				<TableCell class="text-muted-foreground">{user.email}</TableCell>
				<TableCell>
					{#if user.isSuperAdmin}
						<Badge>Super Admin</Badge>
					{:else}
						<Badge variant="outline">User</Badge>
					{/if}
				</TableCell>
				<TableCell class="text-muted-foreground">{formatDate(user.createdAt)}</TableCell>
				<TableCell class="text-right">
					<Button variant="destructive" size="icon" onclick={() => askDelete(user)} title="Hapus user">
						<Trash2 />
					</Button>
				</TableCell>
			</TableRow>
		{/snippet}
	</DataTable>
</div>

{#if deleteTarget}
	<ConfirmDialog
		bind:open={deleteOpen}
		title="Hapus {deleteTarget.name}?"
		description="User ini akan dihapus permanen dan tidak bisa login lagi."
		action="?/delete"
		hiddenFields={{ id: deleteTarget.id }}
	/>
{/if}

<ConfirmDialog
	bind:open={bulkDeleteOpen}
	title="Hapus {bulkIds.length} user?"
	description="User-user ini akan dihapus permanen dan tidak bisa login lagi."
	action="?/bulkDelete"
	hiddenFields={{ ids: bulkIds }}
/>
