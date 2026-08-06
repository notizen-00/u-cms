<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { TableRow, TableCell } from '$lib/components/ui/table';
	import DataTable from '$lib/components/app/DataTable.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { formatDate } from '$lib/utils';
	import type { User } from '$lib/types';
	import Plus from '@lucide/svelte/icons/plus';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const columns = [{ label: 'Nama' }, { label: 'Email' }, { label: 'Role' }, { label: 'Dibuat' }];
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
	>
		{#snippet row(user: User)}
			<TableRow>
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
			</TableRow>
		{/snippet}
	</DataTable>
</div>
