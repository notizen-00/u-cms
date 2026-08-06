<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '$lib/components/ui/table';
	import ConfirmDialog from '$lib/components/app/ConfirmDialog.svelte';
	import { formatDate } from '$lib/utils';
	import LogOut from '@lucide/svelte/icons/log-out';
	import type { SessionInfo } from '$lib/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let revokeTarget = $state<SessionInfo | null>(null);
	let confirmOpen = $state(false);

	function askRevoke(session: SessionInfo) {
		revokeTarget = session;
		confirmOpen = true;
	}
</script>

<svelte:head>
	<title>Sesi Saya — Unej CMS</title>
</svelte:head>

<div class="space-y-4">
	<div>
		<h1 class="text-xl font-semibold">Sesi Saya</h1>
		<p class="text-sm text-muted-foreground">Device dan browser yang sedang login ke akun Anda.</p>
	</div>

	<Table>
		<TableHeader>
			<TableRow>
				<TableHead>Perangkat</TableHead>
				<TableHead>IP</TableHead>
				<TableHead>Login</TableHead>
				<TableHead>Kedaluwarsa</TableHead>
				<TableHead class="text-right">Aksi</TableHead>
			</TableRow>
		</TableHeader>
		<TableBody>
			{#each data.sessions as session (session.id)}
				<TableRow>
					<TableCell class="max-w-xs truncate text-sm">{session.userAgent ?? '-'}</TableCell>
					<TableCell class="text-muted-foreground">{session.ip ?? '-'}</TableCell>
					<TableCell class="text-muted-foreground">{formatDate(session.createdAt)}</TableCell>
					<TableCell class="text-muted-foreground">{formatDate(session.expiresAt)}</TableCell>
					<TableCell class="text-right">
						<Button variant="outline" size="sm" onclick={() => askRevoke(session)}>
							<LogOut class="size-3.5" /> Revoke
						</Button>
					</TableCell>
				</TableRow>
			{:else}
				<TableRow>
					<TableCell colspan={5} class="py-8 text-center text-muted-foreground">Tidak ada sesi aktif.</TableCell>
				</TableRow>
			{/each}
		</TableBody>
	</Table>
</div>

{#if revokeTarget}
	<ConfirmDialog
		bind:open={confirmOpen}
		title="Revoke sesi ini?"
		description="Perangkat ini akan langsung ter-logout."
		confirmLabel="Revoke"
		action="?/revoke"
		hiddenFields={{ sessionId: revokeTarget.id }}
	/>
{/if}
